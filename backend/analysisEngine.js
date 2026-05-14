import sharp from 'sharp';
import { saveAnalysisResult } from './users.js';

// Enhanced disease database with detailed characteristics
const DISEASE_DATABASE = {
  'early_blight': {
    name: 'Early Blight',
    scientificName: 'Alternaria solani',
    crops: ['tomato', 'potato'],
    characteristics: ['brown_spots', 'concentric_rings', 'yellowing'],
    symptoms: 'Brown spots with concentric rings, starting on lower leaves',
    management: [
      'Remove infected leaves',
      'Improve air circulation',
      'Avoid overhead watering',
      'Apply fungicide if necessary'
    ],
    severity: 'moderate'
  },
  'late_blight': {
    name: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    crops: ['tomato', 'potato'],
    characteristics: ['water_soaked', 'dark_lesions', 'white_mold'],
    symptoms: 'Water-soaked lesions with white mold on leaf undersides',
    management: [
      'Remove infected plants',
      'Improve drainage',
      'Apply copper fungicide',
      'Maintain proper spacing'
    ],
    severity: 'high'
  },
  'powdery_mildew': {
    name: 'Powdery Mildew',
    scientificName: 'Various Erysiphales species',
    crops: ['cucumber', 'grape', 'pepper'],
    characteristics: ['white_powder', 'leaf_curl', 'stunted_growth'],
    symptoms: 'White powdery coating on leaves and stems',
    management: [
      'Apply sulfur spray',
      'Improve air circulation',
      'Remove infected leaves',
      'Avoid high humidity'
    ],
    severity: 'moderate'
  },
  'rust': {
    name: 'Rust',
    scientificName: 'Various Puccinia species',
    crops: ['wheat', 'corn', 'bean'],
    characteristics: ['orange_pustules', 'reddish_spots', 'leaf_damage'],
    symptoms: 'Orange/rust-colored pustules on leaf undersides',
    management: [
      'Plant resistant varieties',
      'Remove infected leaves',
      'Apply fungicide',
      'Avoid wetting foliage'
    ],
    severity: 'moderate'
  },
  'leaf_spot': {
    name: 'Leaf Spot',
    scientificName: 'Various fungal species',
    crops: ['tomato', 'pepper', 'cucumber', 'bean'],
    characteristics: ['dark_spots', 'necrotic_tissue', 'halo_effect'],
    symptoms: 'Dark spots with yellow halo on leaves',
    management: [
      'Remove infected leaves',
      'Apply fungicide',
      'Improve air circulation',
      'Practice crop rotation'
    ],
    severity: 'low_to_moderate'
  },
  'mosaic_virus': {
    name: 'Mosaic Virus',
    scientificName: 'Various Potyvirus species',
    crops: ['tomato', 'pepper', 'cucumber'],
    characteristics: ['mottled_leaves', 'distorted_growth', 'color_break'],
    symptoms: 'Mottled, discolored leaves with distorted growth pattern',
    management: [
      'Remove infected plants',
      'Control aphid vectors',
      'Use resistant varieties',
      'Sanitize tools'
    ],
    severity: 'high'
  },
  'healthy': {
    name: 'Healthy Plant',
    scientificName: 'N/A',
    crops: [],
    characteristics: ['uniform_color', 'no_spots', 'normal_structure'],
    symptoms: 'Plant appears healthy with no visible disease symptoms',
    management: ['Continue normal care'],
    severity: 'none'
  }
};

// Analyze image characteristics
async function analyzeImageCharacteristics(imageBuffer) {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height, space } = metadata;

    // Extract color information
    const stats = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelData = stats.data;
    const pixelCount = pixelData.length / 3;

    let redSum = 0, greenSum = 0, blueSum = 0;
    let brownPixels = 0, greenPixels = 0, whitePixels = 0, yellowPixels = 0;

    for (let i = 0; i < pixelData.length; i += 3) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];

      redSum += r;
      greenSum += g;
      blueSum += b;

      // Count color pixels
      if (r > 140 && g > 100 && b < 80) brownPixels++;
      if (g > r + 30 && g > b + 30) greenPixels++;
      if (r > 200 && g > 200 && b > 200) whitePixels++;
      if (r > g && g > b && r - b > 50) yellowPixels++;
    }

    return {
      avgRed: Math.round(redSum / pixelCount),
      avgGreen: Math.round(greenSum / pixelCount),
      avgBlue: Math.round(blueSum / pixelCount),
      brownRatio: brownPixels / pixelCount,
      greenRatio: greenPixels / pixelCount,
      whiteRatio: whitePixels / pixelCount,
      yellowRatio: yellowPixels / pixelCount,
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

  // Score each disease based on characteristics
  if (characteristics.brownRatio > 0.15 && characteristics.greenRatio > 0.3) {
    scores['early_blight'] = (scores['early_blight'] || 0) + 0.35;
    scores['leaf_spot'] = (scores['leaf_spot'] || 0) + 0.25;
  }

  if (characteristics.brownRatio > 0.2 && characteristics.whiteRatio > 0.1) {
    scores['late_blight'] = (scores['late_blight'] || 0) + 0.4;
  }

  if (characteristics.whiteRatio > 0.25 && characteristics.brownRatio < 0.1) {
    scores['powdery_mildew'] = (scores['powdery_mildew'] || 0) + 0.45;
  }

  if (characteristics.brownRatio > 0.25) {
    scores['rust'] = (scores['rust'] || 0) + 0.3;
    scores['leaf_spot'] = (scores['leaf_spot'] || 0) + 0.3;
  }

  if (characteristics.yellowRatio > 0.15 && characteristics.greenRatio > 0.35) {
    scores['mosaic_virus'] = (scores['mosaic_virus'] || 0) + 0.35;
  }

  // If predominantly green, likely healthy
  if (characteristics.greenRatio > 0.5 && characteristics.brownRatio < 0.1) {
    scores['healthy'] = 0.85;
  }

  // Find highest score
  let maxDisease = 'healthy';
  let maxScore = 0.2;

  for (const [disease, score] of Object.entries(scores)) {
    const normalizedScore = Math.min(score, 0.95);
    if (normalizedScore > maxScore) {
      maxScore = normalizedScore;
      maxDisease = disease;
    }
  }

  return { disease: maxDisease, confidence: maxScore };
}

export async function analyzeCropImage(imageBuffer, imageName) {
  try {
    // Analyze image characteristics
    const characteristics = await analyzeImageCharacteristics(imageBuffer);

    // Detect disease
    const detection = await detectDisease(imageBuffer, characteristics);
    const disease = detection.disease;
    const confidence = detection.confidence;

    // Get disease info
    const diseaseInfo = DISEASE_DATABASE[disease] || DISEASE_DATABASE['healthy'];

    // Determine severity based on confidence and disease type
    let severity = 'low';
    if (confidence > 0.8) {
      severity = diseaseInfo.severity;
    } else if (confidence > 0.6) {
      severity = 'low_to_moderate';
    }

    const result = {
      accepted: true,
      disease: diseaseInfo.name,
      scientificName: diseaseInfo.scientificName,
      confidence: parseFloat((confidence * 100).toFixed(1)),
      severity,
      symptoms: diseaseInfo.symptoms,
      management: diseaseInfo.management,
      affectedCrops: diseaseInfo.crops,
      notes: `Disease detected with ${parseFloat((confidence * 100).toFixed(1))}% confidence. ${diseaseInfo.symptoms}`,
      imageName
    };

    return result;
  } catch (err) {
    console.error('Analysis error:', err);
    return {
      accepted: false,
      notes: 'Unable to process image. Please upload a valid crop/plant image.'
    };
  }
}

export function getDiseaseSuggestions(disease) {
  return DISEASE_DATABASE[disease] || DISEASE_DATABASE['healthy'];
}
