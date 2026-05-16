import { analyzeSatellitePolygon } from './earthEngineService.js';
import { generateOpenAiFieldAdvisory } from './openaiService.js';

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

function cropSuitability(crop, region, area) {
  const baseScores = {
    potato: 72,
    wheat: 70,
    corn: 66,
    pepper: 62,
    tomato: 64
  };
  const cropLabels = {
    potato: 'Potato suitability',
    wheat: 'Wheat suitability',
    corn: 'Corn suitability',
    pepper: 'Pepper suitability',
    tomato: 'Tomato suitability'
  };
  const areaPenalty = area > 50 ? 3 : 0;
  const score = Math.min(94, Math.max(35, baseScores[crop] + region.suitabilityBoost - areaPenalty));

  return {
    label: cropLabels[crop],
    score,
    explanation: `${region.label} is estimated as ${score >= 75 ? 'good' : 'moderate'} for ${crop} based on regional climate, field size, and expected water stress.`
  };
}

function healthFromSatellite(metrics, fallbackHealthScore) {
  if (!metrics || !metrics.imageCount) {
    return fallbackHealthScore;
  }

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

async function generateAiAdvisory({ crop, center, region, area, healthScore, zones, suitability }) {
  try {
    return await generateOpenAiFieldAdvisory(`You are an agronomist. Return strict JSON only.
Analyze this selected field using location context and simulated satellite indicators until Earth Engine NDVI is connected.
Coordinates centroid: ${center.lat}, ${center.lng}
Region: ${region.label}
Climate: ${region.climate}
Area hectares: ${area.toFixed(3)}
Crop: ${crop}
Health score: ${healthScore}
Zone labels: ${zones.map((zone) => zone.label).join(', ')}
Suitability score: ${suitability.score}
Return this schema:
{
  "summary": "one concise field health and crop suitability summary",
  "recommendations": ["3 to 5 practical recommendations"],
  "suitabilityExplanation": "one sentence"
}`);
  } catch (err) {
    console.warn('OpenAI field advisory failed:', err.message);
    return null;
  }
}

export async function analyzeFieldPolygon(polygon, options = {}) {
  const points = assertPolygon(polygon);
  const crop = normalizeCrop(options.crop);
  const center = centroid(points);
  const area = areaHectares(points);
  const region = describeRegion(center);
  const smallArea = Math.max(area, 0.25);
  const baseOffset = Math.min(0.004, Math.max(0.00035, Math.sqrt(smallArea) / 6000));
  const fallbackHealthScore = Math.max(45, Math.round(86 - Math.min(28, area * 0.15)));
  let satelliteMetrics = null;
  let satelliteError = null;

  if (shouldUseEarthEngine()) {
    try {
      satelliteMetrics = await analyzeSatellitePolygon(points);
    } catch (err) {
      satelliteError = err.message;
      console.warn('Earth Engine analysis failed:', err.message);
    }
  }

  const healthScore = healthFromSatellite(satelliteMetrics, fallbackHealthScore);

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
  const suitability = cropSuitability(crop, region, area);
  const aiAdvisory = await generateAiAdvisory({
    crop,
    center,
    region,
    area,
    healthScore,
    zones,
    suitability
  });

  const fallbackRecommendations = [
    `Scout the ${zones[0].label.toLowerCase()} area first and compare plant height, leaf color, and soil compaction against the healthy edge of the field.`,
    crop === 'potato'
      ? 'For potatoes, keep soil moisture consistent during tuber initiation and check low-vigor patches for nitrogen or potassium shortage.'
      : `For ${crop}, match irrigation and nutrient checks to the weak-vigor and drought-stress patches before treating the full field.`,
    'Use a follow-up drone or ground photo from the marked zones to confirm whether stress is water, nutrient, pest, or disease related.',
    'Connect Earth Engine service-account credentials to replace this advisory layer with real Sentinel-2 NDVI/NDMI time-series analysis.'
  ];

  return {
    source: satelliteMetrics?.imageCount ? 'google-earth-engine' : 'openai-field-advisory',
    imagery: satelliteMetrics?.imageCount ? 'Sentinel-2 SR Harmonized NDVI/NDMI' : 'Sentinel-2 style multispectral assessment',
    satelliteMetrics,
    satelliteError,
    aiAdvisory: Boolean(aiAdvisory),
    vertexAi: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
    crop,
    center: {
      lat: Number(center.lat.toFixed(7)),
      lng: Number(center.lng.toFixed(7))
    },
    region: region.label,
    areaHectares: Number(area.toFixed(3)),
    healthScore,
    suitability: {
      ...suitability,
      explanation: aiAdvisory?.suitabilityExplanation || suitability.explanation
    },
    zones,
    recommendations: aiAdvisory?.recommendations || fallbackRecommendations,
    summary: aiAdvisory?.summary || `${region.label} is estimated as a ${suitability.score >= 75 ? 'good' : 'moderate'} ${crop} area. The selected field looks mostly healthy, with weak-vigor and drought-stress zones that should be checked before planting or fertilizing.`
  };
}
