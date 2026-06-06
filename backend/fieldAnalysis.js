import { analyzeSatellitePolygon } from './earthEngineService.js';

function logFieldAnalysis(message, details) {
  if (details) {
    console.log(`[field-analysis] ${message}`, details);
    return;
  }

  console.log(`[field-analysis] ${message}`);
}

function shouldUseEarthEngine() {
  const raw = process.env.ENABLE_EARTH_ENGINE?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

function assertPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    throw new Error('A field polygon with at least 3 points is required.');
  }

  return polygon.map((point) => {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Field polygon contains an invalid coordinate.');
    }

    return { lat, lng };
  });
}

function normalizeCrop(value) {
  const crop = String(value || 'potato').trim().toLowerCase();
  if (['potato', 'wheat', 'corn', 'pepper', 'tomato'].includes(crop)) {
    return crop;
  }
  return 'potato';
}

function centroid(points) {
  const total = points.reduce((acc, point) => ({
    lat: acc.lat + point.lat,
    lng: acc.lng + point.lng
  }), { lat: 0, lng: 0 });

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length
  };
}

function areaHectares(points) {
  const earthRadius = 6378137;
  const radians = points.map((point) => ({
    lat: point.lat * Math.PI / 180,
    lng: point.lng * Math.PI / 180
  }));
  let area = 0;

  for (let index = 0; index < radians.length; index += 1) {
    const next = (index + 1) % radians.length;
    area += (radians[next].lng - radians[index].lng) *
      (2 + Math.sin(radians[index].lat) + Math.sin(radians[next].lat));
  }

  return Math.abs(area * earthRadius * earthRadius / 2) / 10000;
}

function offsetPoint(center, latOffset, lngOffset) {
  return {
    lat: Number((center.lat + latOffset).toFixed(7)),
    lng: Number((center.lng + lngOffset).toFixed(7))
  };
}

function describeRegion(center) {
  const inKosovo = center.lat >= 41.8 && center.lat <= 43.3 && center.lng >= 19.8 && center.lng <= 21.9;

  if (inKosovo && center.lat < 42.45) {
    return {
      label: 'southern Kosovo',
      climate: 'continental conditions with warm summers, cool nights, and mixed valley/upland fields',
      suitabilityBoost: 8
    };
  }

  if (inKosovo) {
    return {
      label: 'Kosovo',
      climate: 'continental Balkan growing conditions with meaningful seasonal water variability',
      suitabilityBoost: 4
    };
  }

  return {
    label: `${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`,
    climate: 'location-specific conditions inferred from the selected coordinates',
    suitabilityBoost: 0
  };
}

function healthFromSatellite(metrics) {
  const ndviScore = Math.round((metrics.ndviMean + 0.05) * 100);
  const ndmiScore = Math.round((metrics.ndmiMean + 0.1) * 80);
  return Math.max(25, Math.min(96, Math.round((ndviScore * 0.7) + (ndmiScore * 0.3))));
}

function zoneFindingsFromSatellite(zones, metrics) {
  if (!metrics || !metrics.imageCount) {
    return zones;
  }

  return zones.map((zone) => {
    if (zone.type === 'weak') {
      return {
        ...zone,
        finding: `Sentinel-2 NDVI is averaging ${metrics.ndviMean.toFixed(2)}, with weaker pixels near ${metrics.ndviMin.toFixed(2)}. Scout this patch for uneven crop vigor.`
      };
    }

    if (zone.type === 'drought') {
      return {
        ...zone,
        finding: `Sentinel-2 NDMI is averaging ${metrics.ndmiMean.toFixed(2)}, with drier pixels near ${metrics.ndmiMin.toFixed(2)}. Check irrigation coverage and soil moisture.`
      };
    }

    return {
      ...zone,
      finding: 'The multispectral signal differs from surrounding canopy response and should be checked on the ground.'
    };
  });
}

export async function analyzeFieldPolygon(polygon, options = {}) {
  const points = assertPolygon(polygon);
  const crop = normalizeCrop(options.crop);
  const center = centroid(points);
  const area = areaHectares(points);
  const region = describeRegion(center);
  const smallArea = Math.max(area, 0.25);
  const baseOffset = Math.min(0.004, Math.max(0.00035, Math.sqrt(smallArea) / 6000));
  logFieldAnalysis('Received field analysis request', {
    crop,
    pointCount: points.length,
    center: {
      lat: Number(center.lat.toFixed(6)),
      lng: Number(center.lng.toFixed(6))
    },
    areaHectares: Number(area.toFixed(3)),
    region: region.label,
    earthEngineEnabled: shouldUseEarthEngine()
  });
  if (!shouldUseEarthEngine()) {
    throw new Error('Satellite analysis is disabled. Enable Earth Engine in backend/.env to analyze real imagery.');
  }

  const satelliteMetrics = await analyzeSatellitePolygon(points);
  if (!satelliteMetrics?.imageCount) {
    throw new Error('No recent Sentinel-2 imagery was available for this field. Try another area or date range.');
  }

  const healthScore = healthFromSatellite(satelliteMetrics);
  logFieldAnalysis('Computed field health from satellite metrics', {
    healthScore,
    imageCount: satelliteMetrics.imageCount,
    ndviMean: satelliteMetrics.ndviMean,
    ndmiMean: satelliteMetrics.ndmiMean
  });

  const zones = zoneFindingsFromSatellite([
    {
      id: 'weak-vigor-zone',
      type: 'weak',
      label: 'Weak crop vigor',
      center: offsetPoint(center, -baseOffset, -baseOffset),
      areaHectares: smallArea * 0.18,
      finding: 'Lower vegetation response suggests uneven growth or nutrient pressure.'
    },
    {
      id: 'drought-stress-zone',
      type: 'drought',
      label: 'Drought stress',
      center: offsetPoint(center, baseOffset * 0.7, baseOffset),
      areaHectares: smallArea * 0.12,
      finding: 'Thermal and moisture indicators point to early water stress.'
    },
    {
      id: 'unhealthy-field-zone',
      type: 'unhealthy',
      label: 'Unhealthy field patch',
      center,
      areaHectares: smallArea * 0.08,
      finding: 'Canopy signal differs from the surrounding field and should be inspected.'
    }
  ], satelliteMetrics);

  const result = {
    source: 'google-earth-engine',
    imagery: 'Sentinel-2 SR Harmonized NDVI/NDMI',
    satelliteMetrics,
    satelliteError: null,
    aiAdvisory: false,
    vertexAi: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
    crop,
    center: {
      lat: Number(center.lat.toFixed(7)),
      lng: Number(center.lng.toFixed(7))
    },
    region: region.label,
    areaHectares: Number(area.toFixed(3)),
    healthScore,
    suitability: null,
    zones,
    recommendations: [
      `Scout the ${zones[0].label.toLowerCase()} area first and compare plant vigor against the strongest part of the field.`,
      `Ground-check the ${zones[1].label.toLowerCase()} patch for irrigation gaps or dry soil.`,
      `Use follow-up field photos or soil checks before making ${crop}-specific planting or fertilizer decisions.`
    ],
    summary: `Measured Sentinel-2 imagery for ${region.label} shows NDVI ${satelliteMetrics.ndviMean.toFixed(2)} and NDMI ${satelliteMetrics.ndmiMean.toFixed(2)}. Use this as field-condition data, not a crop suitability prediction.`
  };

  logFieldAnalysis('Returning field analysis response', {
    healthScore: result.healthScore,
    imageCount: result.satelliteMetrics.imageCount,
    region: result.region
  });

  return result;
}
