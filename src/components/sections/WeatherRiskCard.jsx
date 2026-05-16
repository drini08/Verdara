import { useEffect, useState } from "react";
import { getFieldWeatherRisk } from "../../services/weatherService";
import { loadGoogleMaps } from "../../services/googleMapsLoader";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

function WeatherRiskCard() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getFieldWeatherRisk(selectedLocation || undefined)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLocation]);

  async function handleLocationSearch(event) {
    event.preventDefault();
    const query = locationSearch.trim();
    if (!query) return;

    setIsLoading(true);
    setError("");

    try {
      const google = await loadGoogleMaps(googleMapsApiKey);
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          setError("Location not found.");
          setIsLoading(false);
          return;
        }

        const result = results[0];
        setSelectedLocation({
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          label: result.formatted_address
        });
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <aside className="weather-risk-card">
      <div>
        <p className="eyebrow">Weather risk</p>
        <h3>{weather?.location || "Field forecast"}</h3>
      </div>

      <form className="weather-location-search" onSubmit={handleLocationSearch}>
        <input
          value={locationSearch}
          onChange={(event) => setLocationSearch(event.target.value)}
          placeholder="Search city, village, farm, or coordinates"
          aria-label="Search weather location"
        />
        <button type="submit" disabled={isLoading}>Search</button>
      </form>

      {isLoading && <p className="hint">Loading weather signals...</p>}
      {error && <p className="form-error">{error}</p>}

      {weather && (
        <>
          <div className="weather-risk-grid">
            <div>
              <span>Temperature</span>
              <strong>{Math.round(weather.current.temperatureC)}C</strong>
            </div>
            <div>
              <span>Humidity</span>
              <strong>{weather.current.humidity}%</strong>
            </div>
            <div>
              <span>Rain chance</span>
              <strong>{weather.forecast.rainChance}%</strong>
            </div>
            <div>
              <span>Wind</span>
              <strong>{Math.round(weather.current.windKmh)} km/h</strong>
            </div>
          </div>

          <div className="weather-risk-list">
            <p><strong>Drought stress:</strong> {weather.risks.droughtStress}</p>
            <p><strong>Disease pressure:</strong> {weather.risks.diseasePressure}</p>
            <p><strong>Spraying window:</strong> {weather.risks.sprayingWindow}</p>
          </div>
        </>
      )}
    </aside>
  );
}

export default WeatherRiskCard;
