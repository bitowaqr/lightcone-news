
export const getSourceFavicon = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      return ""; // Return empty for invalid URLs
    }
  };

export const getSourceInitial = (url) => {
    try {
      const domain = new URL(url).hostname;
      // Get first letter of domain name (after removing www.)
      const initial = domain.replace("www.", "").charAt(0)?.toUpperCase();
      return initial;
    } catch (e) {
      return "•";
    }
};
  
export const getSourceDomain = (url) => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch (e) {
    return url;
  }
};

export const sanitizeUrl = (url) => {
  if (!url) return '#';
  
  try {
    // Make sure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL format
    new URL(url);
    return url;
  } catch (e) {
    console.error('Invalid URL:', url, e);
    return '#'; // Return hash if invalid URL
  }
};