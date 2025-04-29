import { defineEventHandler, readBody, createError } from 'h3';
import WaitlistEntry from '../../models/WaitlistEntry.model'; // Adjust path if needed
import { sendEmail } from '../../services/sendEmail'; // Import the email service

// Define recipient and sender details
const NOTIFICATION_RECIPIENT = 'paul@priorb.com';
const EMAIL_SENDER = 'support@priorb.com'; // Use the configured SES sender

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email } = body;

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email address is required.',
      });
    }

    // Basic email format validation (redundant if model validation works, but good defense)
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Please provide a valid email address.',
        });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists (optional, but good for UX)
    // We can silently succeed even if it exists to prevent email enumeration
    const existingEntry = await WaitlistEntry.findOne({ email: normalizedEmail });

    if (existingEntry) {
        console.log(`Waitlist: Email already exists - ${normalizedEmail}`);
        // Return success to avoid leaking info about who is on the list
        return { success: true, message: "You're already on the list! We'll notify you." };
    }

    // Create new waitlist entry
    const newEntry = new WaitlistEntry({
      email: normalizedEmail,
    });

    await newEntry.save();

    console.log(`Waitlist: Added ${newEntry.email}`);

    // --- Send Email Notification --- 
    try {
        const subject = 'New Lightcone News Waitlist Entry';
        const bodyHtml = `
            <h1>New Waitlist Signup</h1>
            <p>Email: <strong>${normalizedEmail}</strong></p>
            <p>Timestamp: ${new Date().toISOString()}</p>
        `;
        console.log(`Waitlist: Sending notification email to ${NOTIFICATION_RECIPIENT} for ${normalizedEmail}`);
        // Send email (don't wait for it to complete necessarily, but handle potential errors)
        sendEmail(NOTIFICATION_RECIPIENT, bodyHtml, subject, EMAIL_SENDER, true).catch(emailError => {
            // Log email sending errors but don't fail the request
            console.error(`Waitlist: Failed to send notification email for ${normalizedEmail}:`, emailError);
        });
    } catch (emailError) {
        // Catch synchronous errors from sendEmail setup if any
        console.error(`Waitlist: Error initiating notification email for ${normalizedEmail}:`, emailError);
    }
    // --------------------------

    // Return success to the user regardless of email notification outcome
    return { success: true, message: "You've joined the waitlist! We'll notify you." };

  } catch (error) {
    console.error("Waitlist Join Error:", error);

    // Handle potential duplicate key error during save (race condition)
    if (error.code === 11000) { // MongoDB duplicate key error code
         console.log(`Waitlist: Duplicate key error avoided for ${error.keyValue?.email}`);
         return { success: true, message: "You're already on the list! We'll notify you." };
    }

    // Handle Mongoose validation errors (e.g., invalid email format caught by model)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      throw createError({
        statusCode: 400, // Bad Request
        statusMessage: `Validation failed: ${messages.join(', ')}`,
      });
    }

    // Generic server error for other cases
    throw createError({
      statusCode: 500,
      statusMessage: 'An unexpected error occurred while joining the waitlist.',
    });
  }
}); 