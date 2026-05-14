import sharp from 'sharp';
import { saveAnalysisResult } from './users.js';

// Enhanced disease database with detailed characteristics
const DISEASE_DATABASE = {
  'early_blight': {
    name: 'Early Blight',
    scientificName: 'Alternaria solani',
    crops: ['tomato', 'potato'],
    characteristics: ['brown_spots', 'concentric_rings', 'yellowing'],
    symptoms: 'Brown spots with concentric rings, starting on lower leaves. Older leaves are affected first, with lesions expanding in a target-like pattern.',
    management: [
      'Remove infected leaves immediately to prevent spread',
      'Improve air circulation between plants',
      'Avoid overhead watering — use drip irrigation instead',
      'Apply copper-based fungicide as a preventive measure',
      'Practice crop rotation with non-solanaceous crops'
    ],
    severity: 'moderate'
  },
  'late_blight': {
    name: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    crops: ['tomato', 'potato'],
    characteristics: ['water_soaked', 'dark_lesions', 'white_mold'],
    symptoms: 'Water-soaked lesions with white mold on leaf undersides. Rapidly spreading dark patches that can destroy entire plants within days in humid conditions.',
    management: [
      'Remove and destroy all infected plants immediately',
      'Improve field drainage and reduce humidity',
      'Apply copper-based fungicide preventively',
      'Maintain proper spacing for air circulation',
      'Use resistant varieties when available'
    ],
    severity: 'high'
  },
  'powdery_mildew': {
    name: 'Powdery Mildew',
    scientificName: 'Various Erysiphales species',
    crops: ['cucumber', 'grape', 'pepper'],
    characteristics: ['white_powder', 'leaf_curl', 'stunted_growth'],
    symptoms: 'White powdery coating on leaves and stems. Affected leaves may curl, yellow, and drop prematurely, reducing overall plant vigor and yield.',
    management: [
      'Apply sulfur-based spray early in the season',
      'Improve air circulation by proper spacing',
      'Remove and destroy infected leaves',
      'Avoid high humidity — water at base of plants',
      'Use neem oil as an organic alternative'
    ],
    severity: 'moderate'
  },
  'rust': {
    name: 'Rust',
    scientificName: 'Various Puccinia species',
    crops: ['wheat', 'corn', 'bean'],
    characteristics: ['orange_pustules', 'reddish_spots', 'leaf_damage'],
    symptoms: 'Orange or rust-colored pustules on leaf undersides. Leaves may turn yellow and die. Severe infections can cause significant yield loss.',
    management: [
      'Plant resistant varieties suited for your region',
      'Remove and burn infected plant debris',
      'Apply fungicide at first sign of infection',
      'Avoid wetting foliage during irrigation',
      'Practice crop rotation every 2–3 seasons'
    ],
    severity: 'moderate'
  },
  'leaf_spot': {
    name: 'Leaf Spot',
    scientificName: 'Various fungal species',
    crops: ['tomato', 'pepper', 'cucumber', 'bean'],
    characteristics: ['dark_spots', 'necrotic_tissue', 'halo_effect'],
    symptoms: 'Dark spots with yellow halo on leaves. Spots may merge and cause large areas of dead tissue, leading to premature leaf drop.',
    management: [
      'Remove infected leaves to reduce inoculum',
      'Apply broad-spectrum fungicide',
      'Improve air circulation between plants',
      'Practice crop rotation — avoid same-family planting',
      'Mulch to prevent soil splash onto lower leaves'
    ],
    severity: 'low_to_moderate'
  },
  'mosaic_virus': {
    name: 'Mosaic Virus',
    scientificName: 'Various Potyvirus species',
    crops: ['tomato', 'pepper', 'cucumber'],
    characteristics: ['mottled_leaves', 'distorted_growth', 'color_break'],
    symptoms: 'Mottled, discolored leaves with distorted growth pattern. Light and dark green patches create a mosaic effect. Fruits may be deformed and yields reduced.',
    management: [
      'Remove and destroy all infected plants',
      'Control aphid vectors with insecticidal soap',
      'Use certified virus-free seed and resistant varieties',
      'Sanitize all garden tools between plants',
      'Avoid working with plants when wet'
    ],
    severity: 'high'
  },
  'bacterial_wilt': {
    name: 'Bacterial Wilt',
    scientificName: 'Ralstonia solanacearum',
    crops: ['tomato', 'potato', 'pepper', 'eggplant'],
    characteristics: ['wilting', 'brown_vascular', 'no_yellowing'],
    symptoms: 'Sudden wilting of the entire plant without prior yellowing. When stems are cut, brown discoloration of vascular tissue is visible.',
    management: [
      'Remove and destroy infected plants immediately',
      'Do not compost infected material',
      'Practice crop rotation for at least 3 years',
      'Use resistant varieties when available',
      'Improve soil drainage and avoid overwatering'
    ],
    severity: 'high'
  },
  'downy_mildew': {
    name: 'Downy Mildew',
    scientificName: 'Peronospora and Plasmopara species',
    crops: ['grape', 'cucumber', 'lettuce', 'spinach'],
    characteristics: ['yellow_patches', 'purple_mold_underside', 'angular_spots'],
    symptoms: 'Angular yellow patches on upper leaf surfaces with purplish-gray fuzzy growth on undersides. Leaves curl and turn brown in severe cases.',
    management: [
      'Apply copper-based fungicide preventively',
      'Ensure good air circulation and spacing',
      'Water plants at the base, not overhead',
      'Remove infected leaves and debris',
      'Choose resistant varieties when available'
    ],
    severity: 'moderate'
  },
  'healthy': {
    name: 'Healthy Plant',
    scientificName: 'N/A',
    crops: [],
    characteristics: ['uniform_color', 'no_spots', 'normal_structure'],
    symptoms: 'Plant appears healthy with no visible disease symptoms. Leaves show uniform green coloration with normal structure.',
    management: ['Continue current care regimen — your plant looks great!'],
    severity: 'none'
  }
};

// Minimum confidence threshold for reliable diagnosis
const CONFIDENCE_THRESHOLD = 0.80;

// Validate image quality before analysis
async function validateImageQuality(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    // Check minimum dimensions
    if (width < 100 || height < 100) {
      return {
        valid: false,
        reason: 'Image resolution is too low. Please upload an image at least 100×100 pixels for reliable analysis.'
      };
    }

    // Analyze brightness and color content
    const stats = await sharp(imageBuffer)
      .resize(80, 80, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelData = stats.data;
    const pixelCount = pixelData.length / 3;

    let totalBrightness = 0;
    let veryDarkPixels = 0;
    let veryBrightPixels = 0;
    let plantLikePixels = 0;

    for (let i = 0; i < pixelData.length; i += 3) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const brightness = (r + g + b) / 3;

      totalBrightness += brightness;
      if (brightness < 30) veryDarkPixels++;
      if (brightness > 235) veryBrightPixels++;

      // Plant-like: greens, browns, yellows
      const isGreenish = g > r * 0.8 && g > b;
      const isBrownish = r > 80 && g > 50 && b < 100 && r > g;
      const isYellowish = r > 150 && g > 130 && b < 100;
      if (isGreenish || isBrownish || isYellowish) plantLikePixels++;
    }

    const avgBrightness = totalBrightness / pixelCount;
    const darkRatio = veryDarkPixels / pixelCount;
    const brightRatio = veryBrightPixels / pixelCount;
    const plantRatio = plantLikePixels / pixelCount;

    if (darkRatio > 0.7) {
      return {
        valid: false,
        reason: 'The image appears too dark. Please upload a well-lit photo of the plant for accurate analysis.'
      };
    }

    if (brightRatio > 0.7) {
      return {
        valid: false,
        reason: 'The image appears overexposed or washed out. Please upload a photo with balanced lighting.'
      };
    }

    if (plantRatio < 0.08) {
      return {
        valid: false,
        reason: 'No plant material detected in this image. Please upload a clear photo of a plant leaf or crop for disease analysis.'
      };
    }

    return { valid: true };
  } catch (err) {
    console.error('Image validation error:', err);
    return {
      valid: false,
      reason: 'Unable to process this image. Please ensure it is a valid JPEG, PNG, or WebP file.'
    };
  }
}

// Analyze image characteristics
async function analyzeImageCharacteristics(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height, space } = metadata;

    // Extract color information at higher resolution for better accuracy
    const stats = await sharp(imageBuffer)
      .resize(150, 150, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelData = stats.data;
    const pixelCount = pixelData.length / 3;

    let redSum = 0, greenSum = 0, blueSum = 0;
    let brownPixels = 0, greenPixels = 0, whitePixels = 0, yellowPixels = 0;
    let orangePixels = 0, darkSpotPixels = 0, purplePixels = 0;
    let mottledCount = 0;

    // Track color variance for mosaic/mottled detection
    const greenValues = [];

    for (let i = 0; i < pixelData.length; i += 3) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];

      redSum += r;
      greenSum += g;
      blueSum += b;

      greenValues.push(g);

      // Enhanced color pixel classification
      if (r > 130 && g > 80 && g < 140 && b < 80) brownPixels++;
      if (g > r + 20 && g > b + 20 && g > 60) greenPixels++;
      if (r > 200 && g > 200 && b > 200) whitePixels++;
      if (r > 170 && g > 150 && b < 90 && Math.abs(r - g) < 60) yellowPixels++;
      if (r > 160 && g > 70 && g < 130 && b < 70) orangePixels++;
      if (r < 60 && g < 60 && b < 60) darkSpotPixels++;
      if (r > 80 && b > 80 && g < Math.min(r, b) - 20) purplePixels++;
    }

    // Calculate green variance for mottled/mosaic detection
    const avgGreenVal = greenValues.reduce((a, b) => a + b, 0) / greenValues.length;
    const greenVariance = greenValues.reduce((sum, g) => sum + Math.pow(g - avgGreenVal, 2), 0) / greenValues.length;

    return {
      avgRed: Math.round(redSum / pixelCount),
      avgGreen: Math.round(greenSum / pixelCount),
      avgBlue: Math.round(blueSum / pixelCount),
      brownRatio: brownPixels / pixelCount,
      greenRatio: greenPixels / pixelCount,
      whiteRatio: whitePixels / pixelCount,
      yellowRatio: yellowPixels / pixelCount,
      orangeRatio: orangePixels / pixelCount,
      darkSpotRatio: darkSpotPixels / pixelCount,
      purpleRatio: purplePixels / pixelCount,
      greenVariance,
      width,
      height,
      colorSpace: space
    };
  } catch (err) {
    console.error('Error analyzing image:', err);
    return null;
  }
}

// Detect disease based on image characteristics
async function detectDisease(imageBuffer, characteristics) {
  if (!characteristics) {
    return { disease: 'unknown', confidence: 0, notes: 'Unable to analyze image' };
  }

  const scores = {};

  // --- Early Blight: brown spots + green background + concentric ring hints ---
  if (characteristics.brownRatio > 0.12 && characteristics.greenRatio > 0.25) {
    scores['early_blight'] = (scores['early_blight'] || 0) + 0.40;
    if (characteristics.yellowRatio > 0.05) {
      scores['early_blight'] += 0.15; // yellowing around spots
    }
    if (characteristics.darkSpotRatio > 0.03) {
      scores['early_blight'] += 0.10; // necrotic centers
    }
  }

  // --- Late Blight: dark lesions + white mold ---
  if (characteristics.brownRatio > 0.18 && characteristics.whiteRatio > 0.08) {
    scores['late_blight'] = (scores['late_blight'] || 0) + 0.45;
    if (characteristics.darkSpotRatio > 0.05) {
      scores['late_blight'] += 0.15;
    }
  }

  // --- Powdery Mildew: high white + low brown ---
  if (characteristics.whiteRatio > 0.20 && characteristics.brownRatio < 0.08) {
    scores['powdery_mildew'] = (scores['powdery_mildew'] || 0) + 0.50;
    if (characteristics.greenRatio > 0.15) {
      scores['powdery_mildew'] += 0.12;
    }
  }

  // --- Rust: orange pustules + brown ---
  if (characteristics.orangeRatio > 0.08 || (characteristics.brownRatio > 0.20 && characteristics.orangeRatio > 0.04)) {
    scores['rust'] = (scores['rust'] || 0) + 0.42;
    if (characteristics.yellowRatio > 0.08) {
      scores['rust'] += 0.10;
    }
  }

  // --- Leaf Spot: dark spots + green background + halos ---
  if (characteristics.darkSpotRatio > 0.06 && characteristics.greenRatio > 0.20) {
    scores['leaf_spot'] = (scores['leaf_spot'] || 0) + 0.38;
    if (characteristics.yellowRatio > 0.05) {
      scores['leaf_spot'] += 0.12; // yellow halos
    }
    if (characteristics.brownRatio > 0.10) {
      scores['leaf_spot'] += 0.10;
    }
  }

  // --- Mosaic Virus: high green variance + mottled pattern ---
  if (characteristics.greenVariance > 1200 && characteristics.greenRatio > 0.30) {
    scores['mosaic_virus'] = (scores['mosaic_virus'] || 0) + 0.40;
    if (characteristics.yellowRatio > 0.10) {
      scores['mosaic_virus'] += 0.15;
    }
  }

  // --- Bacterial Wilt: wilting appearance, brownish vascular ---
  if (characteristics.brownRatio > 0.25 && characteristics.greenRatio > 0.10 && characteristics.greenRatio < 0.30) {
    scores['bacterial_wilt'] = (scores['bacterial_wilt'] || 0) + 0.35;
  }

  // --- Downy Mildew: yellow patches + purple undersides ---
  if (characteristics.yellowRatio > 0.10 && characteristics.purpleRatio > 0.03) {
    scores['downy_mildew'] = (scores['downy_mildew'] || 0) + 0.40;
    if (characteristics.greenRatio > 0.15) {
      scores['downy_mildew'] += 0.12;
    }
  }

  // --- Healthy: predominantly green, minimal discoloration ---
  if (characteristics.greenRatio > 0.45 && characteristics.brownRatio < 0.08 && characteristics.whiteRatio < 0.10 && characteristics.darkSpotRatio < 0.03) {
    scores['healthy'] = 0.88;
  }

  // Find highest score
  let maxDisease = null;
  let maxScore = 0;

  for (const [disease, score] of Object.entries(scores)) {
    const normalizedScore = Math.min(score, 0.95);
    if (normalizedScore > maxScore) {
      maxScore = normalizedScore;
      maxDisease = disease;
    }
  }

  // If no disease matched at all, return very low confidence
  if (!maxDisease) {
    return { disease: 'unknown', confidence: 0.15 };
  }

  return { disease: maxDisease, confidence: maxScore };
}

export async function analyzeCropImage(imageBuffer, imageName) {
  try {
    // Step 1: Validate image quality
    const validation = await validateImageQuality(imageBuffer);
    if (!validation.valid) {
      return {
        accepted: false,
        lowConfidence: false,
        notes: validation.reason
      };
    }

    // Step 2: Analyze image characteristics
    const characteristics = await analyzeImageCharacteristics(imageBuffer);

    // Step 3: Detect disease
    const detection = await detectDisease(imageBuffer, characteristics);
    const disease = detection.disease;
    const confidence = detection.confidence;

    // Step 4: Check confidence threshold
    if (confidence < CONFIDENCE_THRESHOLD) {
      return {
        accepted: false,
        lowConfidence: true,
        confidence: parseFloat((confidence * 100).toFixed(1)),
        notes: 'The image could not be diagnosed with sufficient confidence. This may be due to unclear image quality, unusual camera angle, lighting conditions, or a condition not currently in our database. Please try uploading a clearer, well-lit photo focused directly on the affected area of the plant.'
      };
    }

    // Step 5: Get disease info and build result
    const diseaseInfo = DISEASE_DATABASE[disease] || DISEASE_DATABASE['healthy'];

    const result = {
      accepted: true,
      lowConfidence: false,
      disease: diseaseInfo.name,
      scientificName: diseaseInfo.scientificName,
      confidence: parseFloat((confidence * 100).toFixed(1)),
      severity: diseaseInfo.severity,
      symptoms: diseaseInfo.symptoms,
      management: diseaseInfo.management,
      affectedCrops: diseaseInfo.crops,
      notes: `Analysis complete — ${diseaseInfo.name} detected with ${parseFloat((confidence * 100).toFixed(1))}% confidence.`,
      imageName
    };

    return result;
  } catch (err) {
    console.error('Analysis error:', err);
    return {
      accepted: false,
      lowConfidence: false,
      notes: 'Unable to process image. Please upload a valid crop/plant image in JPEG, PNG, or WebP format.'
    };
  }
}

export function getDiseaseSuggestions(disease) {
  return DISEASE_DATABASE[disease] || DISEASE_DATABASE['healthy'];
}
