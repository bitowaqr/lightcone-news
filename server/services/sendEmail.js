import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends an email using AWS SES
 * @param {string} toAddress - Recipient email address
 * @param {string} emailBody - Email content (can be HTML)
 * @param {string} emailSubject - Email subject line
 * @param {string} fromAddress - Sender email address
 * @param {boolean} isHtml - Whether the emailBody contains HTML (defaults to true)
 * @returns {Promise} - Promise resolving to the SES response
 */
async function sendEmail(toAddress, emailBody, emailSubject, fromAddress, isHtml = true) {

  console.log('sendEmail', toAddress, emailSubject, fromAddress, isHtml);

  const FROM_ADDRESS = 'support@priorb.com';
  if(!fromAddress) {
      fromAddress = FROM_ADDRESS; 
  } 
  
  // Initialize SES client
  let sesClient
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    throw new Error('AWS credentials are required. Missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_REGION environment variables.');
  }
  
  console.log('Using env provided AWS credentials');
  const SES_CONFIG = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  };
  sesClient = new SESClient(SES_CONFIG);

  // Create email body based on content type
  const body = {};
  
  // Always include a text version for email clients that don't support HTML
  body.Text = {
    Charset: 'UTF-8',
    Data: isHtml ? emailBody.replace(/<[^>]*>/g, '') : emailBody, // Strip HTML tags for text version
  };
  
  // Add HTML version if specified
  if (isHtml) {
    body.Html = {
      Charset: 'UTF-8',
      Data: emailBody,
    };
  }

  // Create email command
  const sendEmailCommand = new SendEmailCommand({
    Destination: {
      /* required */
      CcAddresses: [
        /* more items */
      ],
      ToAddresses: [
        toAddress,
        /* more To-email addresses */
      ],
    },
    Message: {
      /* required */
      Body: body,
      Subject: {
        Charset: 'UTF-8',
        Data: emailSubject,
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [
      /* more items */
    ],
  })

  // Send the email
  try {
    const response = await sesClient.send(sendEmailCommand)
    return response
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export { sendEmail }  


// // Example usage;
// async function testEmail() {
//   const toAddress = 'paul@priorb.com';
//   const emailBody = 'Hello, this is a test email.';
//   const emailSubject = 'Test Email';
//   try {
//     const response = await sendEmail(toAddress, emailBody, emailSubject);
//     console.log('Email sent successfully:', response);
//   } catch (error) {
//     console.error('Error sending email:', error);
//   }
// }
// testEmail();
