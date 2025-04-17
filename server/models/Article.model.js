// server/models/Article.js
import mongoose from 'mongoose';
import slugify from 'slugify';

// Schema for sources *cited within the published article*
const citedSourceSchema = new mongoose.Schema({
  url: { type: String, trim: true }, 
  publisher: { type: String, required: true, trim: true }, 
  publishedDate: { type: Date },
  updatedDate: { type: Date },
  meta: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

// Schema for timeline events *related to the published article*
const timelineEventSchema = new mongoose.Schema({
  date: { type: String, required: true }, 
  event: { type: String, required: true, trim: true },
  sourceUrl: { type: String, trim: true } 
}, { _id: false });

const articleSchema = new mongoose.Schema({
  // Core Article Content (Curated/Generated for Lightcone)
  title: { type: String, required: true, trim: true }, 
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  precis: { type: String, required: true }, // 1-3 sentences
  summary: { type: String }, // 1-3 paragraphs or 3-8 bullets
  summaryAlt: { type: String }, // Array of bullet points
  imageUrl: { type: String, trim: true }, 
  
  // Metadata & Classification
  publishedDate: { type: Date, default: null },
  updatedDate: { type: Date, default: null },
  author: { type: String, default: 'Lightcone News' },
  tags: [{ type: String, trim: true }], 
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED', 'REJECTED','ERROR'],
    default: 'DRAFT',
    required: true
  },
  
  // Context
  sources: [citedSourceSchema], 
  sourceUrls: [{ type: String, trim: true }],
  timeline: [timelineEventSchema], 
  relatedScenarioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scenario' }],
  suggestedPrompts: [{ type: String, trim: true }],

  // Newsfeed meta
  priority: { type: Number, default: 0 },
  relevance: { type: String, default: 'misc' },
  
  // story and lineup meta
  lineupId: { type: String, trim: true },
  storyId: {type: mongoose.Schema.Types.ObjectId, ref: 'StoryIdea'}, 
  storyTitle: { type: String, trim: true },
  storyDescription: { type: String, trim: true },
  storyNotes: { type: String, trim: true },
}, {
  timestamps: true 
});

// Indexes
articleSchema.index({ status: 1, publishedDate: -1 });
articleSchema.index({ status: 1, updatedDate: -1, tags: 1 });
articleSchema.index({ status: 1, relatedScenarioIds: 1 });
articleSchema.index({ status: 1, storyId: 1 });
// Index for slug is implicitly created by `unique: true`, but explicit doesn't hurt
// articleSchema.index({ slug: 1 }); 

// Middleware for generating slug
articleSchema.pre('save', async function(next) {
  if (this.isModified('title') || this.isNew) {
    let baseSlug = slugify(this.title, { 
      lower: true,      // convert to lower case
      strict: true,     // strip special characters except - a
      remove: /[*+~.()'"!:@]/g // remove characters that slugify might not remove by default
    });

    let slug = baseSlug;
    let count = 1;
    const Article = mongoose.model('Article'); // Get model reference

    // Check for uniqueness and append count if needed
    // Need to ensure we don't check against the document itself if updating
    let query = { slug: slug };
    if (!this.isNew) {
      query._id = { $ne: this._id };
    }
    
    while (await Article.findOne(query)) {
      count++;
      slug = `${baseSlug}-${count}`;
      query.slug = slug; // Update query for the next check
    }
    this.slug = slug;
  }
  next();
});

// Middleware for synchronizing with Scenario model
articleSchema.pre('save', async function(next) {
  // Store the original relatedScenarioIds if the field is modified or it's a new document
  if (this.isModified('relatedScenarioIds') || this.isNew) {
    if (!this.isNew && this.isModified('relatedScenarioIds')) {
      const original = await this.constructor.findById(this._id).select('relatedScenarioIds').lean();
      this._originalRelatedScenarioIds = original ? original.relatedScenarioIds.map(id => id.toString()) : [];
    } else if (this.isNew) {
      this._originalRelatedScenarioIds = [];
    }
    // No need to store if not modified on an existing doc
  }
  next();
});

articleSchema.post('save', async function(doc, next) {
  // Only proceed if _originalRelatedScenarioIds has been set
  if (typeof doc._originalRelatedScenarioIds === 'undefined') {
    return next();
  }

  const Scenario = mongoose.model('Scenario'); // Use mongoose.model
  const currentScenarioIds = doc.relatedScenarioIds.map(id => id.toString());
  const originalScenarioIds = doc._originalRelatedScenarioIds; // Already strings

  const addedScenarioIds = currentScenarioIds.filter(id => !originalScenarioIds.includes(id));
  const removedScenarioIds = originalScenarioIds.filter(id => !currentScenarioIds.includes(id));

  try {
    // Add this article's ID to newly linked scenarios
    if (addedScenarioIds.length > 0) {
      await Scenario.updateMany(
        { _id: { $in: addedScenarioIds } },
        { $addToSet: { relatedArticleIds: doc._id } }
      );
    }

    // Remove this article's ID from newly unlinked scenarios
    if (removedScenarioIds.length > 0) {
      await Scenario.updateMany(
        { _id: { $in: removedScenarioIds } },
        { $pull: { relatedArticleIds: doc._id } }
      );
    }
  } catch (error) {
    console.error(`Error updating Scenarios after Article ${doc._id} save:`, error);
    // Handle error as needed
  }

  // Clear the temporary field
  delete doc._originalRelatedScenarioIds;
  next();
});

// Hook for findOneAndDelete (adjust if using other delete methods)
articleSchema.post('findOneAndDelete', async function(doc, next) {
  if (doc && doc.relatedScenarioIds && doc.relatedScenarioIds.length > 0) {
    const Scenario = mongoose.model('Scenario');
    try {
      await Scenario.updateMany(
        { _id: { $in: doc.relatedScenarioIds } },
        { $pull: { relatedArticleIds: doc._id } }
      );
    } catch (error) {
      console.error(`Error updating Scenarios after Article ${doc._id} deletion:`, error);
      // Handle error as needed
    }
  }
  next();
});

export default mongoose.models.Article || mongoose.model('Article', articleSchema);