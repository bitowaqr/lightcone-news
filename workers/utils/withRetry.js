// workers/utils/retry.js (or similar)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes an async task function with retry logic.
 * @param {Function} taskFn The async function to execute.
 * @param {string} taskName A descriptive name for logging purposes.
 * @param {number} [maxRetries=3] Maximum number of attempts.
 * @param {number} [delayMs=60000] Delay between retries in milliseconds.
 * @returns {Promise<any>} Resolves with the result of the task function if successful.
 * @throws {Error} Throws the error from the last attempt if all retries fail.
 */
export async function withRetry(taskFn, taskName, maxRetries = 3, delayMs = 60000) {
    let attempt = 1;
    while (attempt <= maxRetries) {
        console.log(`[RetryWrapper - ${taskName}] Attempt ${attempt} of ${maxRetries}...`);
        try {
            // Await the result of the task function
            const result = await taskFn();
            console.log(`[RetryWrapper - ${taskName}] Succeeded on attempt ${attempt}.`);
            return result; // Task succeeded, return the result
        } catch (error) {
            console.error(`[RetryWrapper - ${taskName}] Attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) {
                console.error(`[RetryWrapper - ${taskName}] All ${maxRetries} attempts failed. Giving up.`);
                throw error; // Re-throw the last error after all retries
            }
            const delaySeconds = delayMs / 1000;
            console.log(`[RetryWrapper - ${taskName}] Retrying after ${delaySeconds} seconds...`);
            await sleep(delayMs); // Wait before the next attempt
            attempt++;
        }
    }
    // This part should technically not be reached due to the throw in the loop,
    // but adding a fallback error just in case.
    throw new Error(`[RetryWrapper - ${taskName}] Task failed after ${maxRetries} attempts.`);
}