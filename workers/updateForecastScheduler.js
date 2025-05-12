import cron from 'node-cron';
import { mongoService } from '../server/services/mongo.js'; // Adjust path as needed
import Scenario from '../server/models/Scenario.model.js'; // Adjust path as needed
import Forecaster from '../server/models/Forecaster.model.js'; // Adjust path as needed
import { generateForecastsSequential, forecastAgentsNames } from '../server/services/generateForecasts.js'; // Using sequential for controlled updates

// --- Scheduler Configuration ---
const CRON_EXPRESSION = '*/30 * * * *'; // Run every 30 minutes to check for updates
const LONG_TERM_THRESHOLD_DAYS = 30;
const LONG_TERM_UPDATE_INTERVAL_HOURS = 6;
const SHORT_TERM_TARGET_UPDATES_PER_DAY = 12; // Aim for roughly this many updates for a scenario over 24h
const AGENT_COOLDOWN_MINUTES = 5; // An agent can forecast again after this period
const MAX_UPDATES_PER_CRON_RUN = 10; // Max total forecasts to trigger in one scheduler run
const SCENARIO_UPDATE_COOLDOWN_MINUTES = 1; // Min time a scenario waits for another AI update

async function manageForecastUpdates() {
  console.log(`[UpdateForecastScheduler] Running at ${new Date().toISOString().split('T')[0]} ${new Date().toISOString().split('T')[1].split('.')[0]}`);
  await mongoService.connect();

  let updatesScheduledThisRun = 0;

  try {
    const now = new Date();

    // 1. Fetch active AI forecasters
    let activeAiForecasters = await Forecaster.find({ type: 'AI', status: 'ACTIVE' }).lean();
    activeAiForecasters = activeAiForecasters.filter(f => forecastAgentsNames.includes(f.name));
    if (!activeAiForecasters.length) {
        console.log('[UpdateForecastScheduler] No active AI forecasters found. Exiting.');
        return;
    }
    // 2. Fetch open "Lightcone" platform scenarios that are candidates for update
    const openLightconeScenarios = await Scenario.find({
      platform: 'Lightcone',
      status: 'OPEN',
      // Optionally filter out scenarios that were JUST updated by an AI
      $or: [
        { lastAiUpdateTimestamp: { $exists: false } },
        { lastAiUpdateTimestamp: { $lte: new Date(now.getTime() - SCENARIO_UPDATE_COOLDOWN_MINUTES * 60_000) } }
      ]
    }).sort({ lastAiUpdateTimestamp: 1 }).lean(); // Prioritize those not updated recently

    if (!openLightconeScenarios.length) {
      console.log('[UpdateForecastScheduler] No open Lightcone scenarios currently needing updates. Exiting.');
      return;
    }

    console.log(`[UpdateForecastScheduler] Found ${activeAiForecasters.length} active AI forecasters.`);
    console.log(`[UpdateForecastScheduler] Found ${openLightconeScenarios.length} open Lightcone scenarios to consider.`);

    for (const scenario of openLightconeScenarios) {
      if (updatesScheduledThisRun >= MAX_UPDATES_PER_CRON_RUN) {
        console.log(`[UpdateForecastScheduler] Reached max updates per run (${MAX_UPDATES_PER_CRON_RUN}).`);
        break;
      }

      // Determine if scenario is short-term or long-term
      const resolutionDate = scenario.resolutionData?.expectedResolutionDate;
      if (!resolutionDate) {
        console.log(`[UpdateForecastScheduler] Scenario ${scenario._id} missing expectedResolutionDate. Skipping.`);
        continue;
      }

      const daysToResolution = (new Date(resolutionDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const isShortTerm = daysToResolution <= LONG_TERM_THRESHOLD_DAYS;
      const isNearStartOrEnd = daysToResolution <= 7 || (scenario.createdAt && (now.getTime() - new Date(scenario.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 7);

      // Determine required update interval for this scenario
      let requiredUpdateIntervalMillis;
      if (isShortTerm || isNearStartOrEnd) {
        requiredUpdateIntervalMillis = (24 * 60 * 60 * 1000) / SHORT_TERM_TARGET_UPDATES_PER_DAY;
      } else {
        requiredUpdateIntervalMillis = LONG_TERM_UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
      }
      
      // Check if scenario needs an update based on its last AI update time
      if (scenario.lastAiUpdateTimestamp && (now.getTime() - new Date(scenario.lastAiUpdateTimestamp).getTime()) < requiredUpdateIntervalMillis) {
        // console.log(`[UpdateForecastScheduler] Scenario ${scenario._id} updated recently enough. Skipping.`);
        continue;
      }
       // Also check general scenario cooldown
      if (scenario.lastAiUpdateTimestamp && (now.getTime() - new Date(scenario.lastAiUpdateTimestamp).getTime()) < SCENARIO_UPDATE_COOLDOWN_MINUTES * 60 * 1000) {
        // console.log(`[UpdateForecastScheduler] Scenario ${scenario._id} is within general update cooldown. Skipping.`);
        continue;
      }

      // Find available forecasters for this scenario
      const availableForecasters = activeAiForecasters.filter(f => {
        const isOnCooldown = f.lastForecastDate && (now.getTime() - new Date(f.lastForecastDate).getTime()) < AGENT_COOLDOWN_MINUTES * 60 * 1000;
        const wasLastUpdater = scenario.lastAiForecasterId && scenario.lastAiForecasterId.toString() === f._id.toString();
        
        // Prefer not to use the same agent again if others are available and scenario was updated by AI recently enough
        if (wasLastUpdater && activeAiForecasters.length > 1 && scenario.lastAiUpdateTimestamp && (now.getTime() - new Date(scenario.lastAiUpdateTimestamp).getTime()) < requiredUpdateIntervalMillis * 0.8) {
            return !isOnCooldown && false; // Effectively skip if was last and others available + recent update
        }
        return !isOnCooldown;
      });

      if (!availableForecasters.length) {
        // console.log(`[UpdateForecastScheduler] No available forecasters for scenario ${scenario._id} at this time. Skipping.`);
        continue;
      }

      // Select a forecaster (e.g., random or one who hasn't forecasted this one in the longest time)
      // For now, simple random selection from available ones
      const selectedAgent = availableForecasters[Math.floor(Math.random() * availableForecasters.length)];

      console.log(`[UpdateForecastScheduler] Scheduling update for scenario ${scenario._id} (${isShortTerm ? 'short-term' : 'long-term'}) by forecaster ${selectedAgent.name}.`);
      
      // Call generateForecastsSequential with a single agent. 
      // The existingForecast logic is handled inside generateForecastsSequential now.
      // No timeout within this call as we manage staggering at the scheduler level.
      generateForecastsSequential(scenario._id, {
        save: true,
        log: true,
        agents: [selectedAgent.name], // Pass agent name as an array
        timeout: 0 // No internal timeout, scheduler handles delays if any between different scenarios
      }).catch(err => {
        console.error(`[UpdateForecastScheduler] Error during forecast generation for scenario ${scenario._id} by ${selectedAgent.name}:`, err);
      });
      // NOTE: This is fire-and-forget for the forecast generation to allow the cron to finish quickly.
      // The saveForecast utility will update timestamps on Forecaster and Scenario.

      updatesScheduledThisRun++;
      
      // If we want to introduce a small delay between starting each forecast generation to further stagger
      // if (updatesScheduledThisRun < MAX_UPDATES_PER_CRON_RUN) {
      //   await new Promise(resolve => setTimeout(resolve, 5000)); // e.g., 5 second delay
      // }
    }

    if (updatesScheduledThisRun > 0) {
        console.log(`[UpdateForecastScheduler] Scheduled ${updatesScheduledThisRun} forecast updates this run.`);
    } else {
        console.log('[UpdateForecastScheduler] No forecast updates were scheduled this run based on current criteria.');
    }

  } catch (error) {
    console.error('[UpdateForecastScheduler] Error during forecast update management:', error);
  } finally {
    // mongoService.disconnect(); // Connection is managed by mongoService itself
    if (updatesScheduledThisRun === 0) {
      console.log ('[UpdateForecastScheduler] Cycle finished, no updates made.');
    }
  }
}

// --- Schedule the Task ---
console.log(`[UpdateForecastScheduler] Initializing cron job with expression: "${CRON_EXPRESSION}"`);
cron.schedule(CRON_EXPRESSION, manageForecastUpdates, {
  scheduled: true,
  timezone: 'America/New_York' 
});

console.log('[UpdateForecastScheduler] Scheduler started. Waiting for scheduled tasks.');

// Optional: Run once on startup for testing
// (async () => {
//   console.log('[UpdateForecastScheduler] Performing initial run for testing...');
//   await manageForecastUpdates();
//   console.log('[UpdateForecastScheduler] Initial test run complete.');
// })();
