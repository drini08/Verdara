import './env.js';
import ee from '@google/earthengine';

let initPromise;

function logEarthEngine(message, details) {
  if (details) {
    console.log(`[earth-engine] ${message}`, details);
    return;
  }

  console.log(`[earth-engine] ${message}`);
}

function decodeBase64Json(name, encoded) {
  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new Error(`${name} must be base64 encoded Google credential JSON.`);
  }

  return credentials;
}

function isServiceAccount(credentials) {
  return credentials?.type === 'service_account' &&
    typeof credentials.client_email === 'string' &&
    typeof credentials.private_key === 'string';
}

function decodeCredentials() {
  const earthEngineKey = process.env.GOOGLE_CLOUD_ADC_KEY?.trim();
  if (earthEngineKey) {
    const credentials = decodeBase64Json('GOOGLE_CLOUD_ADC_KEY', earthEngineKey);
    if (isServiceAccount(credentials)) {
      logEarthEngine('Using GOOGLE_CLOUD_ADC_KEY service account', {
        source: 'GOOGLE_CLOUD_ADC_KEY',
        clientEmail: credentials.client_email,
        projectId: credentials.project_id || null
      });
      return credentials;
    }
  }

  const firebaseKey = process.env.FIREBASE_DB_KEY?.trim();
  if (firebaseKey) {
    const credentials = decodeBase64Json('FIREBASE_DB_KEY', firebaseKey);
    if (isServiceAccount(credentials)) {
      logEarthEngine('Using FIREBASE_DB_KEY service account for Earth Engine', {
        source: 'FIREBASE_DB_KEY',
        clientEmail: credentials.client_email,
        projectId: credentials.project_id || null
      });
      return credentials;
    }
  }

  if (earthEngineKey) {
    const credentials = decodeBase64Json('GOOGLE_CLOUD_ADC_KEY', earthEngineKey);
    throw new Error(
      `Earth Engine requires a service account key. GOOGLE_CLOUD_ADC_KEY is ${credentials.type || 'invalid'} and cannot be used.`
    );
  }

  throw new Error(
    'Earth Engine requires a service account key. Set GOOGLE_CLOUD_ADC_KEY to a base64-encoded service account JSON, or provide a valid service-account FIREBASE_DB_KEY.'
  );
}

function initializeEarthEngine() {
  if (initPromise) {
    logEarthEngine('Reusing existing Earth Engine initialization promise');
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    const credentials = decodeCredentials();
    logEarthEngine('Initializing Earth Engine client', {
      clientEmail: credentials.client_email,
      projectId: credentials.project_id || null
    });
    ee.data.authenticateViaPrivateKey(
      credentials,
      () => ee.initialize(
        null,
        null,
        () => {
          logEarthEngine('Earth Engine initialization succeeded');
          resolve();
        },
        (err) => {
          logEarthEngine('Earth Engine initialization failed', {
            error: err?.message || String(err)
          });
          reject(err);
        }
      ),
      (err) => {
        logEarthEngine('Earth Engine private key authentication failed', {
          error: err?.message || String(err)
        });
        reject(err);
      }
    );
  }).catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

function toGeometry(points) {
  const coordinates = points.map((point) => [point.lng, point.lat]);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push(first);
  }

  return ee.Geometry.Polygon([coordinates], null, false);
}

function cloudMaskSentinel2(image) {
  const scl = image.select('SCL');
  const valid = scl
    .neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return image.updateMask(valid).divide(10000);
}

function getInfo(value) {
  return new Promise((resolve, reject) => {
    value.getInfo((result, err) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function normalizeStats(stats) {
  return {
    ndviMean: Number(stats.NDVI_mean ?? 0),
    ndviMin: Number(stats.NDVI_min ?? 0),
    ndmiMean: Number(stats.NDMI_mean ?? 0),
    ndmiMin: Number(stats.NDMI_min ?? 0),
    imageCount: Number(stats.imageCount ?? 0)
  };
}

export async function analyzeSatellitePolygon(points) {
  logEarthEngine('Starting satellite polygon analysis', {
    pointCount: points.length
  });
  await initializeEarthEngine();

  const geometry = toGeometry(points);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 90);
  logEarthEngine('Querying Sentinel-2 collection', {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  });

  const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(geometry)
    .filterDate(startDate.toISOString().slice(0, 10), endDate.toISOString().slice(0, 10))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 35))
    .map(cloudMaskSentinel2);

  const imageCount = collection.size();
  const composite = collection.median().clip(geometry);
  const ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  const ndmi = composite.normalizedDifference(['B8', 'B11']).rename('NDMI');
  const indicators = ndvi.addBands(ndmi);

  const reducers = ee.Reducer.mean().combine({
    reducer2: ee.Reducer.min(),
    sharedInputs: true
  });

  const statsImage = indicators.reduceRegion({
    reducer: reducers,
    geometry,
    scale: 10,
    bestEffort: true,
    maxPixels: 1e8
  });

  const stats = ee.Dictionary(statsImage).combine(ee.Dictionary({ imageCount }), true);
  const normalized = normalizeStats(await getInfo(stats));
  logEarthEngine('Satellite analysis completed', normalized);
  return normalized;
}
