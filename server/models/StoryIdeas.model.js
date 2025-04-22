import mongoose from 'mongoose';

// Sub-schema for individual news sources cited within a story
const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    publisher: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    publishedDate: { type: String },
  },
  { _id: false }
);

const storyIdeaSchema = new mongoose.Schema(
  {
    priority: { type: Number, required: true, index: true },
    relevance: { type: String, required: true, enum: ['critical', 'important', 'relevant', 'noteworthy','misc'] },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true }, 
    sources: {
      type: [sourceSchema],
      required: true,
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        'At least one source is required per story',
      ],
    },
    update: { type: Boolean, default: false },
    updatedArticleId: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, default: 'idea', enum: ['idea', 'draftingArticle', 'articleWritten','archived'] },
    lineupId: { type: String, trim: true, default: new Date().toISOString().split('T')[0] },
  },
  { _id: true }
);

storyIdeaSchema.index({ lineup: 1, createdAt: -1 });

export default mongoose.models.StoryIdeas ||
  mongoose.model('StoryIdeas', storyIdeaSchema);
