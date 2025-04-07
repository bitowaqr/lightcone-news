/**
 * Calculates the difference between two dates in days.
 * @param {Date} date1
 * @param {Date} date2
 * @returns {number} The absolute difference in days.
 */
const diffInDays = (date1, date2) => {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formats a date to 'YYYY'.
 * @param {Date} date
 * @returns {string}
 */
const formatYear = (date) => {
  return date.getFullYear().toString();
};

/**
 * Formats a date to 'Month YYYY'.
 * @param {Date} date
 * @returns {string}
 */
const formatMonthYear = (date) => {
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
};

/**
 * Formats a date to 'DD Month YYYY'.
 * @param {Date} date
 * @returns {string}
 */
const formatDayMonthYear = (date) => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Sorts timeline events and formats dates based on granularity.
 *
 * @param {Array<Object>} timeline - Array of event objects { date: string | Date, event: string, sourceUrl?: string }
 * @param {'asc' | 'desc'} [direction='asc'] - Sort direction for dates.
 * @returns {Array<Object>} - Sorted timeline with formatted dates.
 */
export const formatTimeline = (timeline, direction = 'desc') => {
  if (!timeline || timeline.length === 0) {
    return [];
  }
    
    if(direction !== 'asc' && direction !== 'desc') {
        throw new Error('Invalid direction');
    }

  // 1. Ensure dates are Date objects and filter out invalid dates
  const validTimeline = timeline
    .map(item => ({ ...item, date: new Date(item.date) }))
    .filter(item => !isNaN(item.date.getTime()));

  if (validTimeline.length === 0) {
    return []; // Return empty if no valid dates
  }

  // 2. Sort the timeline
  validTimeline.sort((a, b) => {
    const comparison = a.date - b.date;
    return direction === 'desc' ? -comparison : comparison;
  });

  // Handle single event case after sorting
  if (validTimeline.length === 1) {
     return validTimeline.map(item => ({
      ...item,
      date: formatDayMonthYear(item.date), // Default to most granular for single event
    }));
  }

  // 3. Calculate the minimum difference between consecutive dates in days
  let minDiff = Infinity;
  for (let i = 1; i < validTimeline.length; i++) {
    const diff = diffInDays(validTimeline[i].date, validTimeline[i - 1].date);
    if (diff < minDiff) {
      minDiff = diff;
    }
  }

  // 4. Determine the formatting function based on the minimum difference
  // Thresholds (can be adjusted):
  const yearThreshold = 365 * 2; // Use Year only if min diff is ~2 years or more
  const monthThreshold = 60;     // Use Month-Year if min diff is ~2 months or more

  let formatDate;
  if (minDiff === 0) { // If any events are on the same day, use full date
      formatDate = formatDayMonthYear;
  } else if (minDiff >= yearThreshold) {
      formatDate = formatYear;
  } else if (minDiff >= monthThreshold) {
      formatDate = formatMonthYear;
  } else {
      formatDate = formatDayMonthYear; // Default to day-month-year for smaller differences
  }


  // 5. Map to the final format
  const formattedTimeline = validTimeline.map(item => ({
    ...item,
    date: formatDate(item.date),
  }));

  return formattedTimeline;
};


// // test the function 

// // 1 day apart
// let timeline = [
//   { date: '2024-01-01', event: 'Event 1' },
//   { date: '2024-01-02', event: 'Event 2' },
//   { date: '2024-01-03', event: 'Event 3' },
// ];
// console.log(formatTimeline(timeline));

// // weeks apart
// timeline = [
//   { date: '2024-01-01', event: 'Event 1' },
//   { date: '2024-01-08', event: 'Event 2' },
//   { date: '2024-01-15', event: 'Event 3' },
//   { date: '2024-01-22', event: 'Event 4' },
// ];
// console.log(formatTimeline(timeline));

// // years apart
// timeline = [
//   { date: '2023-02-01', event: 'Event 1' },
//   { date: '2024-03-01', event: 'Event 1' },
//   { date: '2025-01-01', event: 'Event 2' },
// ];
// console.log(formatTimeline(timeline));


// // mix of different fgaps between items to see if we can tricks the function
// timeline = [
//   { date: '2021-01-01', event: 'Event 1' },
//   { date: '2024-05-08', event: 'Event 2' },
//   { date: '2024-01-15', event: 'Event 3' },
//   { date: '2025-01-22', event: 'Event 4', url: "sedflk" },
// ];
// console.log(formatTimeline(timeline));