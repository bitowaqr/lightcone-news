import mongoose from 'mongoose';

const { Schema } = mongoose;


const modelDetailsSchema = new Schema({
  family: String,
  version: String,
  toolNotes: String,
});



const ForecasterSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Forecaster name is required'],
    unique: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['AI', 'HUMAN'],
    default: 'AI',
    index: true,
  },
  avatar: { // Can store an icon name (e.g., 'mdi:robot') or a full URL
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DISABLED'],
    default: 'ACTIVE',
    index: true,
  },
  userId: { // Link to the User model if type is HUMAN
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.type === 'HUMAN'; }, // Required only for humans
    validate: { // Optional validation: ensure userId exists only for HUMAN type
        validator: function(v) {
            return this.type === 'HUMAN' ? v != null : v == null;
        },
        message: props => `userId should only exist if type is HUMAN.`
    },
    index: { // Optional: Sparse index useful if many AI forecasters exist
        sparse: true,
    }
  },
  accuracyScore: {
     type: Number,
     min: 0,
     max: 1 
  },
  calibrationScore: {
     type: Number,
     min: 0
  },
  modelDetails: { // Updated: Specific details for AI forecasters, now a flat object
    type: modelDetailsSchema,
    default: {}
  },
  numberOfForecasts: { type: Number, default: 0 },
  lastForecastDate: { type: Date },

}, {
  timestamps: true // Adds createdAt and updatedAt
});



const Forecaster = mongoose.models.Forecaster || mongoose.model('Forecaster', ForecasterSchema);

export default Forecaster; 