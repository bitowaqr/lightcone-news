
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
  
