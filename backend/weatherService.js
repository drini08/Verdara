const DEFAULT_LOCATION = {
  lat: 42.2139,
  lng: 20.7397,
  label: 'Prizren region'
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function riskLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function sprayingWindow({ rainChance, windKmh }) {
  if (rainChance > 55) return 'Wait for lower rain probability';
  if (windKmh > 22) return 'Avoid spraying during strong wind';
  if (windKmh > 15) return 'Use caution and spray early morning';
  return 'Good window today';
}

export async function getWeatherRisk(query = {}) {
  const lat = toNumber(query.lat, DEFAULT_LOCATION.lat);
  const lng = toNumber(query.lng, DEFAULT_LOCATION.lng);

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m');
  url.searchParams.set('daily', 'precipitation_probability_max,et0_fao_evapotranspiration');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API failed with ${response.status}`);
  }

  const data = await response.json();
  const current = data.current || {};
  const daily = data.daily || {};
  const rainChance = Number(daily.precipitation_probability_max?.[0] ?? 0);
  const evapotranspiration = Number(daily.et0_fao_evapotranspiration?.[0] ?? 0);
  const humidity = Number(current.relative_humidity_2m ?? 0);
  const windKmh = Number(current.wind_speed_10m ?? 0);
  const precipitation = Number(current.precipitation ?? 0);
  const droughtScore = Math.min(100, Math.max(0, Math.round((evapotranspiration * 16) + (100 - humidity) * 0.35 - rainChance * 0.25)));
  const diseaseScore = Math.min(100, Math.max(0, Math.round(humidity * 0.55 + rainChance * 0.45 + precipitation * 8)));

  return {
    location: query.label || DEFAULT_LOCATION.label,
    coordinates: { lat, lng },
    current: {
      temperatureC: Number(current.temperature_2m ?? 0),
      humidity,
      windKmh,
      precipitation
    },
    forecast: {
      rainChance,
      evapotranspiration
    },
    risks: {
      droughtStress: riskLabel(droughtScore),
      diseasePressure: riskLabel(diseaseScore),
      sprayingWindow: sprayingWindow({ rainChance, windKmh })
    }
  };
}

