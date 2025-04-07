import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// Define the simplified Mongoose schema for User for MVP
const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'], // Basic email format validation
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Password field won't be returned in queries by default
  },
  preferences: {
    topics: {
      type: [String],
      default: []
    },
    sources: {
      type: [String],
      default: []
    },
    // Add other relevant preferences if needed for MVP
  },
  savedArticles: [{
    type: Schema.Types.ObjectId,
    ref: 'Article' // Assuming you will have an 'Article' model
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastLogin: {
    type: Date
  }
}, {
  // Automatically add createdAt and updatedAt fields
  timestamps: true
});

// --- Middleware ---

// Hash password before saving a new user or when password is modified
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error("Error hashing password:", error);
    next(error); // Pass error to the next middleware/handler
  }
});

// --- Methods ---

// Method to compare candidate password with the user's hashed password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  // 'this.password' needs to be explicitly selected if it was excluded by default
  // This method is usually called on a user document where password was retrieved (e.g., during login)
  if (!this.password) {
      throw new Error('Password field not available for comparison. Ensure it was selected in the query.');
  }
  return await bcrypt.compare(candidatePassword, this.password);
};


// --- Model ---

// Avoid recompiling the model if it already exists (useful for HMR)
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User; 