import { defineEventHandler, readBody } from 'h3';
import { sendEmail } from '../services/sendEmail';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { name, email, message } = body;

    if (!name || !email || !message) {
      event.res.statusCode = 400;
      return { success: false, message: 'Missing required fields (name, email, message).' };
    }

    // Validate email format (basic)
    if (!/\S+@\S+\.\S+/.test(email)) {
      event.res.statusCode = 400;
      return { success: false, message: 'Invalid email format.' };
    }

    const recipientEmail = 'contact@priorb.com'; 
    const emailSubject = 'Lightcone News Contact Form Submission';
    const emailBody = `
      <h1>New Contact Form Submission</h1>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p> 
    `;
    const fromAddress = 'support@priorb.com'; // Using the default sender for SES

    console.log(`Sending contact email to ${recipientEmail} from ${email}`);

    await sendEmail(recipientEmail, emailBody, emailSubject, fromAddress, true);

    return { success: true, message: 'Message sent successfully.' };

  } catch (error) {
    console.error('Error handling contact form submission:', error);

    // Determine if the error is from sendEmail or elsewhere
    let errorMessage = 'Failed to send message due to a server error.';
    if (error.message && error.message.includes('AWS credentials')) {
        errorMessage = 'Server configuration error prevents sending email.'; 
    } else if (error.name === 'InvalidParameterValue') {
        errorMessage = 'Email sending failed due to invalid parameters.';
    }

    event.res.statusCode = 500;
    return { success: false, message: errorMessage };
  }
}); 