/**
 * Formats a date into a relative time string (e.g., 'Now', 'in 3 hours', '3 days ago')
 * @param {Date|string} date - The date to format (Date object or ISO string)
 * @returns {string} - Formatted relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const inputDate = date instanceof Date ? date : new Date(date);

  // Calculate time difference in milliseconds
  const diffMs = inputDate.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  // Convert to seconds
  const diffSecs = Math.round(Math.abs(diffMs) / 1000);

  // Now
  if (diffSecs < 60) {
    return 'Now';
  }

  // Minutes
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${prefix}${diffMins} ${diffMins === 1 ? 'min' : 'mins'}${suffix}`;
  }

  // Hours
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${prefix}${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}${suffix}`;
  }

  // Days
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${prefix}${diffDays} ${diffDays === 1 ? 'day' : 'days'}${suffix}`;
  }

  // Months
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${prefix}${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}${suffix}`;
  }

  // Years
  const diffYears = Math.floor(diffMonths / 12);
  return `${prefix}${diffYears} ${diffYears === 1 ? 'year' : 'years'}${suffix}`;
}
