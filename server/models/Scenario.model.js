// server/models/Scenario.js
import mongoose from 'mongoose';

const scenarioSchema = new mongoose.Schema({
  
  // CORE
  question: { type: String, required: true, trim: true }, 
  questionNew: { type: String, trim: true },
  description: { type: String },
  
  // PLATFORM & SOURCE INFO
  platform: { type: String, trim: true }, // e.g., 'Metaculus', 'Polymarket', 'Manifold', 'Futuur', 'Lightcone Forecast'
  platformScenarioId: { type: String, trim: true }, 
  conditionId: { type: String, trim: true },
  clobTokenIds: { type: Object, default: {} }, // keys = token outcome and values token prices
  tags: [{ type: String, trim: true }],

  // TIMELINES
  openDate: { type: Date }, 
  
  scenarioType: { 
    type: String,
    enum: ['BINARY', 'CATEGORICAL', 'NUMERIC', 'DATE'],
    required: true
  },
  
  // CURRENT STATE
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'CANCELED', 'UPCOMING', 'UNKNOWN', 'PENDING'],
    default: 'OPEN'
  },
  currentProbability: { type: Number, min: 0, max: 1 }, // BINARY 
  currentValue: { type: mongoose.Schema.Types.Mixed }, // NUMERIC/DATE 
  valueHistory: [{ timestamp: Date, value: mongoose.Schema.Types.Mixed }], // Optional: History for other types
  options: [{ name: String, probability: Number }], // For CATEGORICAL types
  optionHistory: [{ timestamp: Date, options: [{ name: String, probability: Number }] }], // Time series for CATEGORICAL types
  
  // URLS
  url: { type: String, unique: true, sparse: true, trim: true }, // Direct URL to the source (if external)
  apiUrl: { type: String, trim: true }, // API URL for platforms like Polymarket
  embedUrl: { type: String, trim: true }, // URL to embed the scenario in a UI
  
  // HISTORY
  probabilityHistory: [{ 
      timestamp: Date, 
      probability: Number, 
      forecasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forecaster', index: true },
      rationalSummary: String, 
      rationalDetails: String, 
      comment: String, 
      dossier: mongoose.Schema.Types.Mixed 
  }], // Time series for BINARY types

  valueHistory: [{ 
      timestamp: Date, 
      value: mongoose.Schema.Types.Mixed, 
      forecasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forecaster', index: true },
      rationalSummary: String, 
      rationalDetails: String, 
      comment: String, 
      dossier: mongoose.Schema.Types.Mixed 
  }], // Optional: History for other types

  optionHistory: [{ 
      timestamp: Date, 
      options: [{ 
          name: String, 
          probability: Number, 
          forecasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forecaster' },
          rationalSummary: String, 
          rationalDetails: String, 
          comment: String, 
          dossier: mongoose.Schema.Types.Mixed 
      }] 
  }], // Time series for CATEGORICAL types
  
  // Data about the scenario
  volume: { type: Number },
  liquidity: { type: Number },
  numberOfTraders: { type: Number },
  numberOfPredictions: { type: Number },
  votes: { type: Number },
  commentCount: { type: Number },
  comments: [{
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }],
  rationaleSummary: { type: String },
  rationaleDetails: { type: String },
  dossier: { type: mongoose.Schema.Types.Mixed },
  
  // RESOLUTION
  resolutionData: {
    type: new mongoose.Schema({
      resolutionCriteria: { type: String },
      resolutionSource: { type: String },
      resolutionSourceUrl: { type: String },
      resolutionDate: { type: Date, default: null },
      resolutionValue: { type: mongoose.Schema.Types.Mixed, default: null },
      expectedResolutionDate: { type: Date },
      resolutionCloseDate: { type: Date },
    }),
    default: {},
  },
  
  // Relationships
  relatedArticleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }], 
  relatedScenarioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Scenario' }],
  
  // Scraping & Provenance
  scrapedDate: { type: Date },
  // AI Vector Embedding
  textForEmbedding: { type: String },
  aiVectorEmbedding: { type: [Number], select: false },

  // Lightcone AI Forecast specific fields
  lastAiUpdateTimestamp: { type: Date },
  lastAiForecasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Forecaster' },

  // auth
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'],
    default: 'PUBLIC'
  },
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true
});

// Indexes
scenarioSchema.index({ platform: 1, platformScenarioId: 1 }, { unique: true, sparse: true }); // Unique scenario per platform
scenarioSchema.index({ conditionId: 1 }, { unique: true, sparse: true }); // Unique scenario per conditionId
scenarioSchema.index({ closeDate: -1 });
scenarioSchema.index({ status: 1 });
scenarioSchema.index({ relatedSourceDocumentIds: 1 });
scenarioSchema.index({ relatedArticleIds: 1 });

// Middleware for synchronizing with Article model
scenarioSchema.pre('save', async function(next) {
  // Store the original relatedArticleIds if the field is modified or it's a new document
  if (this.isModified('relatedArticleIds') || this.isNew) {
    // If it's not a new document and the field is modified, fetch the original
    if (!this.isNew && this.isModified('relatedArticleIds')) {
      const original = await this.constructor.findById(this._id).select('relatedArticleIds').lean();
      this._originalRelatedArticleIds = original ? original.relatedArticleIds.map(id => id.toString()) : [];
    } else if (this.isNew) {
      // For new documents, the original list is empty
      this._originalRelatedArticleIds = [];
    }
    // If the field is *not* modified on an existing doc, don't store anything
    // (this._originalRelatedArticleIds will remain undefined)
  }
  next();
});

scenarioSchema.post('save', async function(doc, next) {
  // Only proceed if _originalRelatedArticleIds has been set (i.e., relatedArticleIds was potentially changed)
  if (typeof doc._originalRelatedArticleIds === 'undefined') {
    return next();
  }

  const Article = mongoose.model('Article'); // Use mongoose.model to get the Article model reliably
  const currentArticleIds = doc.relatedArticleIds.map(id => id.toString());
  const originalArticleIds = doc._originalRelatedArticleIds; // Already strings from pre-save

  const addedArticleIds = currentArticleIds.filter(id => !originalArticleIds.includes(id));
  const removedArticleIds = originalArticleIds.filter(id => !currentArticleIds.includes(id));

  try {
    // Add this scenario's ID to newly linked articles
    if (addedArticleIds.length > 0) {
      await Article.updateMany(
        { _id: { $in: addedArticleIds } },
        { $addToSet: { relatedScenarioIds: doc._id } } // Use $addToSet to prevent duplicates
      );
    }

    // Remove this scenario's ID from newly unlinked articles
    if (removedArticleIds.length > 0) {
      await Article.updateMany(
        { _id: { $in: removedArticleIds } },
        { $pull: { relatedScenarioIds: doc._id } }
      );
    }
  } catch (error) {
    console.error(`Error updating Articles after Scenario ${doc._id} save:`, error);
    // Decide how to handle the error, e.g., log it, but allow the operation to succeed
    // or call next(error) to propagate it. For background sync, logging might be sufficient.
  }

  // Clear the temporary field
  delete doc._originalRelatedArticleIds;
  next();
});

// Hook for findOneAndDelete (adjust if using other delete methods like .remove())
scenarioSchema.post('findOneAndDelete', async function(doc, next) {
  if (doc && doc.relatedArticleIds && doc.relatedArticleIds.length > 0) {
    const Article = mongoose.model('Article');
    try {
      await Article.updateMany(
        { _id: { $in: doc.relatedArticleIds } },
        { $pull: { relatedScenarioIds: doc._id } }
      );
    } catch (error) {
      console.error(`Error updating Articles after Scenario ${doc._id} deletion:`, error);
      // Handle error as needed
    }
  }
  next();
});

export default mongoose.models.Scenario || mongoose.model('Scenario', scenarioSchema);
