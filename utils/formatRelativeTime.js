/**
 * Formats a date into a relative time string (e.g., 'Now', '5 mins ago', '3 hours ago', '3 days ago')
 * @param {Date|string} date - The date to format (Date object or ISO string)
 * @returns {string} - Formatted relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const inputDate = date instanceof Date ? date : new Date(date);
  
  // Calculate time difference in milliseconds
  const diffMs = now - inputDate;
  
  // Convert to seconds
  const diffSecs = Math.floor(diffMs / 1000);
  
  // Now
  if (diffSecs < 60) {
    return 'Now';
  }
  
  // Minutes
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  }
  
  // Hours
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Days
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // Months
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  // Years
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}
