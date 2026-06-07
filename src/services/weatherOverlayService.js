import { apiUrl } from "../config/api";

async function readJsonOrThrow(response, fallbackMessage) {
  if (response.ok) {
    return response.json();
  }

  let message = fallbackMessage;
  try {
    const data = await response.json();
    if (data?.error) {
      message = data.error;
    }
  } catch {
    // ignore
  }

  throw new Error(message);
}

export async function fetchRadarOverlay({ signal } = {}) {
  const response = await fetch(apiUrl("/api/weather/radar"), { signal });
  return readJsonOrThrow(response, "Failed to load rain radar.");
}

export async function fetchMoistureGrid({ bounds, rows = 3, cols = 3, signal } = {}) {
  const params = new URLSearchParams({
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
    rows: String(rows),
    cols: String(cols)
  });

  const response = await fetch(apiUrl(`/api/weather/moisture?${params.toString()}`), { signal });
  return readJsonOrThrow(response, "Failed to load soil moisture.");
}

export async function fetchRainForecastGrid({ bounds, rows = 8, cols = 8, hours = 25, signal } = {}) {
  const params = new URLSearchParams({
    north: String(bounds.north),
    south: String(bounds.south),
    east: String(bounds.east),
    west: String(bounds.west),
    rows: String(rows),
    cols: String(cols),
    hours: String(hours)
  });

  const response = await fetch(apiUrl(`/api/weather/rain-forecast?${params.toString()}`), { signal });
  return readJsonOrThrow(response, "Failed to load future rain forecast.");
}
