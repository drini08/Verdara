const DEFAULT_LOCATION = {
  lat: 42.2139,
  lng: 20.7397,
  label: 'Prizren region'
};
const RADAR_TIMELINE_URL = 'https://api.rainviewer.com/public/weather-maps.json';

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

function pairCoordinates(latitudes, longitudes) {
  return latitudes.map((lat, index) => ({
    lat,
    lng: longitudes[index]
  }));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildGrid(query = {}) {
  const north = clamp(toNumber(query.north, DEFAULT_LOCATION.lat + 0.12), -90, 90);
  const south = clamp(toNumber(query.south, DEFAULT_LOCATION.lat - 0.12), -90, 90);
  const east = clamp(toNumber(query.east, DEFAULT_LOCATION.lng + 0.12), -180, 180);
  const west = clamp(toNumber(query.west, DEFAULT_LOCATION.lng - 0.12), -180, 180);
  const rows = clamp(Math.round(toNumber(query.rows, 3)), 2, 5);
  const cols = clamp(Math.round(toNumber(query.cols, 3)), 2, 5);
  const latStep = rows === 1 ? 0 : (north - south) / (rows - 1);
  const lngStep = cols === 1 ? 0 : (east - west) / (cols - 1);
  const points = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      points.push({
        lat: Number((north - (latStep * row)).toFixed(4)),
        lng: Number((west + (lngStep * col)).toFixed(4))
      });
    }
  }

  return { north, south, east, west, rows, cols, points };
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

export async function getRadarOverlay() {
  const response = await fetch(RADAR_TIMELINE_URL);
  if (!response.ok) {
    throw new Error(`RainViewer API failed with ${response.status}`);
  }

  const data = await response.json();
  const latestFrame = data.radar?.past?.at(-1) || data.radar?.nowcast?.[0] || null;

  if (!latestFrame?.path || !data.host) {
    throw new Error('RainViewer returned no radar frame.');
  }

  return {
    attribution: 'Weather radar by RainViewer',
    host: data.host,
    generated: data.generated,
    frameTime: latestFrame.time,
    tileUrlTemplate: `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`
  };
}
