// server/models/SourceDocument.js
import mongoose from 'mongoose';


const metadataSchema = new mongoose.Schema({
  publisher: { type: String, required: true, trim: true }, 
  publishedDate: { type: Date },
  updatedDate: { type: Date },
  authors: [{ type: String, trim: true }],
  tags: [{ type: String, trim: true }],
  sourceType: { 
    type: String,
    enum: ['ARTICLE', 'MEDIA', 'SOCIAL', 'OTHER', 'RSS'], 
  },
}, { _id: false });

const sourceDocumentSchema = new mongoose.Schema({
  // core fields
  url: { type: String, required: true, trim: true }, 
  meta: metadataSchema,
  title: { type: String },
  subtitle: { type: String },
  teaser: { type: String },
  content: { type: String }, 
  rawContent: { type: String }, 
  scrapedDate: { type: Date, required: true, default: Date.now }, 
  
  // Processing Status
  status: {
    type: String,
    enum: [
      'URL_ONLY',
      'RETRIEVING_RAW_CONTENT',
      'RAW_CONTENT_RETRIEVED',
      'SCREENING', 'SCREENED-IN', 'SCREENED-OUT',
      'PROCESSING', 'PROCESSED', 'ERROR-PROCESSING',
      'EMBEDDING', 'EMBEDDED', 'ERROR-EMBEDDING',
      'DISCARDED', 'ERROR', 'DELETED', 'ARCHIVED'
    ], 
    default: 'URL_ONLY',
    required: true,
  },
  aiSummary: { type: String }, 
  aiTags: [String], 
  aiVectorEmbedding: { type: [Number], select: false }, 
  processingError: { type: String }, 
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes
sourceDocumentSchema.index({ url: 1 });
sourceDocumentSchema.index({ status: 1 });
sourceDocumentSchema.index({ scrapedDate: -1 });
sourceDocumentSchema.index({ articleIds: 1 });
sourceDocumentSchema.index({ 'meta.publisher': 1 });


export default mongoose.models.SourceDocument || mongoose.model('SourceDocument', sourceDocumentSchema);