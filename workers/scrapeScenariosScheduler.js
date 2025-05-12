import { updateAndEmbedScenarios } from '../server/scraper-scenarios/index.js';

const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

const runScenariosUpdateLoop = async () => {
  console.log(`[ScenariosScheduler] Starting scenarios update at ${new Date().toISOString()}`);
  try {
    await updateAndEmbedScenarios();
    console.log(`[ScenariosScheduler] Scenarios update finished at ${new Date().toISOString()}.`);
  } catch (error) {
    console.error(`[ScenariosScheduler] Error during scenarios update:`, error);
    // The loop continues in the finally block even if there's an error
  } finally {
    console.log(`[ScenariosScheduler] Scheduling next scenarios update in 2 hours.`);
    setTimeout(runScenariosUpdateLoop, TWO_HOURS_IN_MS);
  }
};

// Start the loop
console.log('[ScenariosScheduler] Initializing continuous scenarios update loop (2-hour interval after completion).');
runScenariosUpdateLoop();
