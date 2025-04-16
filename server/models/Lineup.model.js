import mongoose from 'mongoose';

// Sub-schema for individual news sources cited within a story
const sourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  publisher: { type: String, required: true, trim: true },
  description: { type: String, trim: true }, 
  publishedDate: { type: String }, 
}, { _id: false });

// Sub-schema for a curated news story (simplified)
const storySchema = new mongoose.Schema({
  priority: { type: Number, required: true, index: true }, 
  storyTitle: { type: String, required: true, trim: true },
  storyDescription: { type: String, trim: true }, // Optional summary
  sources: { type: [sourceSchema], required: true, validate: [v => Array.isArray(v) && v.length > 0, 'At least one source is required per story'] } // Must have at least one source
}, { _id: true });

// Sub-schema for sources that were discarded during lineup creation
const discardedSourceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    publisher: { type: String, required: true, trim: true }
}, { _id: false });


// Main schema for the entire Lineup document
const lineupSchema = new mongoose.Schema({
  stories: { type: [storySchema], required: true }, 
  discardedSources: { type: [discardedSourceSchema], default: [] }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Index for efficient retrieval of the latest lineup
lineupSchema.index({ createdAt: -1 });


export default mongoose.models.Lineup || mongoose.model('Lineup', lineupSchema); 