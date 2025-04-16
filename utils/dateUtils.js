/**
 * Formats a Date object or ISO string into YYYY-MM-DDTHH:mm for datetime-local input.
 * @param {Date|string|null} date The date to format.
 * @returns {string} Formatted date string or empty string if invalid.
 */
export function formatDateForInput(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      return '';
    }
    // Adjust for timezone offset to display correctly in local time input
    const offset = d.getTimezoneOffset();
    const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  } catch (e) {
    console.error("Error formatting date for input:", e);
    return '';
  }
}

/**
 * Parses a date string from a datetime-local input (YYYY-MM-DDTHH:mm) into an ISO string.
 * @param {string} dateString The date string from the input.
 * @returns {string|null} ISO date string or null if invalid.
 */
export function parseDateFromInput(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    // Check if the parsed date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (e) {
    console.error("Error parsing date from input:", e);
    return null;
  }
}

/**
 * Formats a Date object or ISO string into a human-readable format.
 * @param {Date|string|null} date The date to format.
 * @param {object} options Intl.DateTimeFormat options.
 * @returns {string} Formatted date string or 'N/A'.
 */
export function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', options).format(d);
  } catch (e) {
    console.error("Error formatting date:", e);
    return String(date); // Fallback to original string representation
  }
} 