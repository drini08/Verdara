let googleMapsPromise;

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!apiKey) {
    return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is missing."));
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `initVerdaraMap_${Date.now()}`;
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error("Google Maps did not load. Check that the key has Maps JavaScript API enabled."));
    }, 10000);

    window[callbackName] = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        googleMapsPromise = null;
        reject(new Error("Google Maps loaded without map access. Check API restrictions."));
      }
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error("Google Maps failed to load."));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
