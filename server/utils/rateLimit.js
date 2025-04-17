import { useStorage } from '#imports';
import { getRequestIP, createError } from 'h3';

const storage = useStorage('rate-limit');

/**
 * Checks and enforces multiple rate limits for a given event.
 * @param {object} event - The H3 event object.
 * @param {object} options - Rate limiting options.
 * @param {Array<{name: string, windowMs: number, maxRequests: number}>} options.limits - An array of limit configurations.
 * @param {string} options.endpointName - A unique base name for the endpoint being rate-limited.
 */
export async function checkRateLimit(event, { limits, endpointName }) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown';
  const now = Date.now();

  // Store counts and timestamps for each limit to update later if request is allowed
  const limitStatuses = [];

  // First pass: Check if any limit is exceeded
  for (const limit of limits) {
    const { name, windowMs, maxRequests } = limit;
    const key = `ip:${endpointName}:${name}:${ip}`;
    const entry = await storage.getItem(key);

    let currentCount = 0;
    let timestamp = 0;
    if (entry && typeof entry === 'object' && entry.timestamp) {
      timestamp = entry.timestamp;
      // Check if the window has expired
      if (now < timestamp + windowMs) {
        currentCount = entry.count;
      } // Else: count resets to 0 implicitly
    }

    // Store status for potential update later
    limitStatuses.push({ key, currentCount, timestamp });

    if (currentCount >= maxRequests) {
      const resetTime = (timestamp || now) + windowMs; // Use entry timestamp if available
      // Set headers for the specific limit that was hit
      event.node.res.setHeader('Retry-After', Math.ceil((resetTime - now) / 1000)); // Seconds until reset
      event.node.res.setHeader('X-RateLimit-Limit', maxRequests);
      event.node.res.setHeader('X-RateLimit-Remaining', 0);
      event.node.res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
      event.node.res.setHeader('X-RateLimit-Rule-Exceeded', name); // Indicate which rule was hit

      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: `${name} rate limit reached. Please try again later.`,
      });
    }
  }

  // Second pass: If no limits were exceeded, increment counts for all limits
  const updatePromises = limitStatuses.map(({ key, currentCount }, index) => {
    const { windowMs } = limits[index];
    return storage.setItem(key, { count: currentCount + 1, timestamp: now }, { ttl: windowMs / 1000 });
  });
  await Promise.all(updatePromises);

  // Set informative headers based on the *first* (presumably shortest duration) limit for simplicity
  if (limits.length > 0 && limitStatuses.length > 0) {
    const firstLimit = limits[0];
    const firstStatus = limitStatuses[0];
    const resetTime = now + firstLimit.windowMs;

    event.node.res.setHeader('X-RateLimit-Limit', firstLimit.maxRequests);
    event.node.res.setHeader('X-RateLimit-Remaining', firstLimit.maxRequests - (firstStatus.currentCount + 1));
    event.node.res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
  }

  // Allow request to proceed (no error thrown)
} 