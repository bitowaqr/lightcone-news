import { createNewsfeed } from './createNewsfeed.js';
import cron from 'node-cron';

// --- Schedule the Task ---
const cronExpression = '0 1-23/3 * * *'; // Run at 1:00, 4:00, 7:00, 10:00, 13:00, 16:00, 19:00, 22:00 Eastern Time
console.log(
  `[Scheduler] Initializing cron job: "${cronExpression}"`
);
cron.schedule(cronExpression, createNewsfeed, {
  scheduled: true,
  timezone: 'America/New_York',
});
console.log('[Scheduler] Started. Waiting for scheduled tasks.');
