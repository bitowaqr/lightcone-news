import mongoose from 'mongoose';

const { Schema } = mongoose;

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
  // Potential future fields:
  // accuracyScore: { type: Number },
  // calibrationScore: { type: Number },
  // areasOfExpertise: [String],

}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Ensure uniqueness for HUMAN forecasters linked to a specific User
ForecasterSchema.index({ userId: 1 }, { unique: true, sparse: true });

const Forecaster = mongoose.models.Forecaster || mongoose.model('Forecaster', ForecasterSchema);

export default Forecaster; 