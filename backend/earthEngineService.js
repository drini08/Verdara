import ee from '@google/earthengine';
import dotenv from 'dotenv';

dotenv.config();

let initPromise;

function decodeCredentials() {
  const encoded = process.env.GOOGLE_CLOUD_ADC_KEY?.trim();
  if (!encoded) {
    throw new Error('GOOGLE_CLOUD_ADC_KEY is missing.');
  }

  let credentials;
  try {
    credentials = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    throw new Error('GOOGLE_CLOUD_ADC_KEY must be base64 encoded Google credential JSON.');
  }

  if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
    throw new Error('Earth Engine requires GOOGLE_CLOUD_ADC_KEY to be a service account JSON key with client_email and private_key.');
  }

  return credentials;
}

function initializeEarthEngine() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    const credentials = decodeCredentials();
    ee.data.authenticateViaPrivateKey(
      credentials,
      () => ee.initialize(null, null, resolve, reject),
      reject
    );
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
  await initializeEarthEngine();

  const geometry = toGeometry(points);
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 90);

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
  return normalizeStats(await getInfo(stats));
}
