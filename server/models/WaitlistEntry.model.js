import mongoose from 'mongoose';

const waitlistEntrySchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email address is required.'],
    unique: true, // Ensure emails are unique
    index: true, // Add index for faster queries
    lowercase: true, // Store emails in lowercase
    trim: true, // Remove leading/trailing whitespace
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'], // Basic email format validation
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add any other fields you might want later, e.g., status, source
});


// Prevent mongoose from creating pluralized collection name if needed
// const WaitlistEntry = mongoose.model('WaitlistEntry', waitlistEntrySchema, 'waitlistEntries'); 
const WaitlistEntry = mongoose.model('WaitlistEntry', waitlistEntrySchema);


export default WaitlistEntry; 