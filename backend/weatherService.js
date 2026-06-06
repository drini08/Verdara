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
  const rows = clamp(Math.round(toNumber(query.rows, 8)), 2, 12);
  const cols = clamp(Math.round(toNumber(query.cols, 8)), 2, 12);
  const latStep = (north - south) / rows;
  const lngStep = (east - west) / cols;
  const points = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      points.push({
        row,
        col,
        lat: Number((north - (latStep * (row + 0.5))).toFixed(4)),
        lng: Number((west + (lngStep * (col + 0.5))).toFixed(4))
      });
    }
  }

  return { north, south, east, west, rows, cols, latStep, lngStep, points };
}

function cellBounds(grid, point) {
  const north = grid.north - (grid.latStep * point.row);
  const south = north - grid.latStep;
  const west = grid.west + (grid.lngStep * point.col);
  const east = west + grid.lngStep;

  return {
    north: clamp(north, -90, 90),
    south: clamp(south, -90, 90),
    east: clamp(east, -180, 180),
    west: clamp(west, -180, 180)
  };
}

function averageAvailable(values) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!numericValues.length) return null;

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function firstHourlyValue(hourly, key) {
  return Array.isArray(hourly?.[key]) ? hourly[key][0] : null;
}

function percentFromRatio(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number((parsed * 100).toFixed(1)) : null;
}

function hourlyValueAt(hourly, key, index) {
  const value = Array.isArray(hourly?.[key]) ? hourly[key][index] : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const pastFrames = (data.radar?.past || []).map((frame) => ({
    ...frame,
    type: 'past'
  }));
  const nowcastFrames = (data.radar?.nowcast || []).map((frame) => ({
    ...frame,
    type: 'forecast'
  }));
  const frames = [...pastFrames, ...nowcastFrames]
    .filter((frame) => frame?.path && frame?.time)
    .map((frame) => ({
      type: frame.type,
      time: frame.time,
      path: frame.path,
      tileUrlTemplate: `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`
    }));
  const defaultFrameIndex = Math.max(0, pastFrames.length - 1);
  const latestFrame = frames[defaultFrameIndex] || frames.at(-1) || null;

  if (!latestFrame || !data.host) {
    throw new Error('RainViewer returned no radar frame.');
  }

  return {
    attribution: 'Weather radar by RainViewer',
    host: data.host,
    generated: data.generated,
    frameTime: latestFrame.time,
    defaultFrameIndex,
    frames,
    tileUrlTemplate: latestFrame.tileUrlTemplate
  };
}

export async function getMoistureGrid(query = {}) {
  const grid = buildGrid(query);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', grid.points.map((point) => point.lat).join(','));
  url.searchParams.set('longitude', grid.points.map((point) => point.lng).join(','));
  url.searchParams.set('hourly', 'soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo soil moisture API failed with ${response.status}`);
  }

  const data = await response.json();
  const locations = Array.isArray(data) ? data : [data];
  const items = grid.points.map((point, index) => {
    const hourly = locations[index]?.hourly || {};
    const topLayer = firstHourlyValue(hourly, 'soil_moisture_0_to_1cm');
    const shallowLayer = firstHourlyValue(hourly, 'soil_moisture_1_to_3cm');
    const rootLayer = firstHourlyValue(hourly, 'soil_moisture_3_to_9cm');
    const average = averageAvailable([topLayer, shallowLayer, rootLayer]);

    return {
      ...point,
      bounds: cellBounds(grid, point),
      soilMoisturePercent: average === null ? null : Number((average * 100).toFixed(1)),
      layers: {
        top0To1cm: percentFromRatio(topLayer),
        shallow1To3cm: percentFromRatio(shallowLayer),
        root3To9cm: percentFromRatio(rootLayer)
      }
    };
  });

  return {
    attribution: 'Soil moisture forecast by Open-Meteo',
    generatedAt: new Date().toISOString(),
    bounds: {
      north: grid.north,
      south: grid.south,
      east: grid.east,
      west: grid.west
    },
    rows: grid.rows,
    cols: grid.cols,
    items
  };
}

export async function getRainForecastGrid(query = {}) {
  const grid = buildGrid(query);
  const hourCount = clamp(Math.round(toNumber(query.hours, 25)), 2, 25);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', grid.points.map((point) => point.lat).join(','));
  url.searchParams.set('longitude', grid.points.map((point) => point.lng).join(','));
  url.searchParams.set('hourly', 'precipitation,precipitation_probability');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo rain forecast API failed with ${response.status}`);
  }

  const data = await response.json();
  const locations = Array.isArray(data) ? data : [data];
  const frameTimes = (locations[0]?.hourly?.time || []).slice(0, hourCount);
  const frames = frameTimes.map((time, hourIndex) => ({
    type: 'forecast',
    time,
    hourOffset: hourIndex,
    items: grid.points.map((point, pointIndex) => {
      const hourly = locations[pointIndex]?.hourly || {};
      const precipitationMm = hourlyValueAt(hourly, 'precipitation', hourIndex);
      const precipitationProbability = hourlyValueAt(hourly, 'precipitation_probability', hourIndex);

      return {
        ...point,
        bounds: cellBounds(grid, point),
        precipitationMm: precipitationMm === null ? null : Number(precipitationMm.toFixed(1)),
        precipitationProbability: precipitationProbability === null ? null : Math.round(precipitationProbability)
      };
    })
  }));

  return {
    attribution: 'Rain forecast by Open-Meteo',
    generatedAt: new Date().toISOString(),
    bounds: {
      north: grid.north,
      south: grid.south,
      east: grid.east,
      west: grid.west
    },
    rows: grid.rows,
    cols: grid.cols,
    defaultFrameIndex: 0,
    frames
  };
}
