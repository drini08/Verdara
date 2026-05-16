import { apiUrl } from "../config/api";

export async function getFieldWeatherRisk({ lat, lng, label } = {}) {
  const params = new URLSearchParams();
  if (lat) params.set("lat", lat);
  if (lng) params.set("lng", lng);
  if (label) params.set("label", label);

  const endpoint = `/api/weather/field${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(apiUrl(endpoint));

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to load weather risk.");
  }

  return response.json();
}

