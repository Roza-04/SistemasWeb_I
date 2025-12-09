/**
 * Utility to load Google Maps JavaScript API with Places library
 * Prevents duplicate script loads
 * Vanilla JS version
 */

let loadPromise = null;
let isLoaded = false;

/**
 * Load Google Maps JavaScript API
 * @returns {Promise<void>}
 */
function loadGoogleMaps() {
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Return resolved promise if already loaded
  if (isLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  // Check if script already exists and API is available
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript && window.google?.maps?.places) {
    isLoaded = true;
    return Promise.resolve();
  }

  // Replace with your actual API key or load from config
  const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
  
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      isLoaded = true;
      return Promise.resolve();
    }
    
    // Return resolved promise without loading
    console.warn('Google Maps API key not configured');
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    // Create callback for when script loads
    window.initGoogleMaps = () => {
      isLoaded = true;
      loadPromise = null;
      delete window.initGoogleMaps;
      resolve();
    };

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      loadPromise = null;
      delete window.initGoogleMaps;
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadGoogleMaps };
}
