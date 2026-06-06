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
