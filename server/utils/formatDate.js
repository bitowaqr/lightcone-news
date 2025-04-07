/**
 * Formats a date into YYYY-MM-DD format
 * @param {Date|string} date - The date to format (Date object or ISO string)
 * @returns {string} - Formatted date string in YYYY-MM-DD format
 */
export function formatDateYMD(date) {
  if (!date) return '';
  
  const inputDate = date instanceof Date ? date : new Date(date);
  
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, '0');
  const day = String(inputDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date into DD MONTH YEAR format (e.g., 15 January 2023)
 * @param {Date|string} date - The date to format (Date object or ISO string)
 * @param {boolean} [useDDMMYYYY=false] - Toggle to use DD/MM/YYYY format instead
 * @returns {string} - Formatted date string in DD MONTH YEAR or DD/MM/YYYY format
 */
export function formatDateLong(date, useDDMMYYYY = false) {
  if (!date) return '';
  
  const inputDate = date instanceof Date ? date : new Date(date);
  
  if (useDDMMYYYY) {
    const day = String(inputDate.getDate()).padStart(2, '0');
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const year = inputDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  }
  
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  return inputDate.toLocaleDateString('en-GB', options);
}

