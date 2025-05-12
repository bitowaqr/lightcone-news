// server/models/SourceDocument.js
import mongoose from 'mongoose';

// const metadataSchema = new mongoose.Schema({ // <-- REMOVING THIS
//   publisher: { type: String, required: true, trim: true }, 
//   publishedDate: { type: Date },
//   updatedDate: { type: Date },
//   authors: [{ type: String, trim: true }],
//   tags: [{ type: String, trim: true }],
//   sourceType: { 
//     type: String,
//     enum: ['ARTICLE', 'MEDIA', 'SOCIAL', 'OTHER', 'RSS'], 
//   },
// }, { _id: false });

const sourceDocumentSchema = new mongoose.Schema({
  // core fields
  url: { type: String, required: true, trim: true, unique: true }, 
  // meta: metadataSchema, // <-- CHANGING THIS
  meta: { type: mongoose.Schema.Types.Mixed }, // <-- TO THIS
  // title: { type: String }, // <-- REMOVING
  // subtitle: { type: String }, // <-- REMOVING
  // teaser: { type: String }, // <-- REMOVING
  // content: { type: String },  // <-- REMOVING
  rawContent: { type: String }, 
  scrapedDate: { type: Date, required: true, default: Date.now }, 
  
  // aiSummary: { type: String }, // <-- REMOVING
  // aiTags: [String], // <-- REMOVING
  // aiVectorEmbedding: { type: [Number], select: false }, // <-- REMOVING
  processingError: { type: String }, 
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes
// sourceDocumentSchema.index({ status: 1 }); // <-- REMOVING THIS INDEX
sourceDocumentSchema.index({ scrapedDate: -1 });
// sourceDocumentSchema.index({ articleIds: 1 }); // This might also be less relevant now or belong elsewhere
sourceDocumentSchema.index({ 'meta.publisher': 1 }); // Indexing a path within Mixed might be less performant or behave differently. Review if meta.publisher is critical for queries.


export default mongoose.models.SourceDocument || mongoose.model('SourceDocument', sourceDocumentSchema);