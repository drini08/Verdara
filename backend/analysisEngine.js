import dotenv from "dotenv";
dotenv.config();
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';

let aiClient;

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/**
 * Base64-decode GOOGLE_CLOUD_ADC_KEY to credential JSON for googleAuthOptions.credentials.
 */
function credentialsFromEncodedAdcEnv() {
  const b64 = process.env.GOOGLE_CLOUD_ADC_KEY?.trim();
  if (!b64) {
    return undefined;
  }
  let jsonStr;
  try {
    jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    throw new Error('GOOGLE_CLOUD_ADC_KEY must be valid base64.');
  }
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('GOOGLE_CLOUD_ADC_KEY must decode to valid JSON credential data.');
  }
}

function effectiveGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw) return '';
  // Copied-from-example placeholders → treat as unset so Vertex + GOOGLE_CLOUD_ADC_KEY wins.
  if (/^your_/i.test(raw) || /\bchangeme\b/i.test(raw)) return '';
  return raw;
}

function getAiClient() {
  if (aiClient) {
    return aiClient;
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const apiKey = effectiveGeminiApiKey();

  // Prefer Vertex when GOOGLE_CLOUD_ADC_KEY is set; otherwise GEMINI_API_KEY wins and hits
  // generativelanguage.googleapis.com (INVALID_ARGUMENT / API_KEY_INVALID if bogus).
  if (project && process.env.GOOGLE_CLOUD_ADC_KEY?.trim()) {
    const credentials = credentialsFromEncodedAdcEnv();
    aiClient = new GoogleGenAI({
      vertexai: true,
      project,
      location,
      googleAuthOptions: {
        credentials,
        scopes: [CLOUD_PLATFORM_SCOPE],
      },
    });
    return aiClient;
  }

  if (apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  }

  if (project) {
    aiClient = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
    return aiClient;
  }

  throw new Error(
    'Google GenAI is not configured. Set GEMINI_API_KEY, or set GOOGLE_CLOUD_PROJECT with GOOGLE_CLOUD_LOCATION (optional: GOOGLE_CLOUD_ADC_KEY as base64 Google credential JSON for googleAuthOptions).'
  );
}


export async function analyzeCropImage(imageBuffer, imageName) {
  try {
    const ai = getAiClient();

    // Basic validation to ensure we have an image
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.width < 100 || metadata.height < 100) {
         return {
          accepted: false,
          lowConfidence: false,
          notes: 'Image resolution is too low. Please upload an image at least 100×100 pixels.'
        };
      }
    } catch (err) {
      return {
        accepted: false,
        lowConfidence: false,
        notes: 'Unable to process this image. Please ensure it is a valid JPEG, PNG, or WebP file.'
      };
    }

    // Call Gemini API to analyze the image
    const prompt = `
You are an expert plant pathologist and agronomist. Analyze the provided image of a plant/crop.
Determine if there is a disease, pest, nutrient deficiency, or if it is healthy.
Also, verify if the image actually contains a plant.

Provide the response strictly as a JSON object matching this schema:
{
  "isPlant": boolean, // true if the image contains a plant, false otherwise
  "disease": string, // "Healthy Plant", or the name of the disease/anomaly
  "scientificName": string, // Scientific name of the pathogen, or "N/A"
  "confidence": number, // Your confidence score between 0 and 1
  "severity": string, // One of: "none", "low", "low_to_moderate", "moderate", "high", "unknown"
  "symptoms": string, // Detailed description of symptoms seen in the image
  "management": string[], // Array of recommended management/treatment steps
  "affectedCrops": string[] // Array of common crops affected by this
}
`;

    // Convert buffer to base64 for the API
    const base64Image = imageBuffer.toString('base64');

    // Attempt to guess mime type from the first few bytes, default to image/jpeg
    let mimeType = 'image/jpeg';
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) mimeType = 'image/png';
    else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) mimeType = 'image/webp';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType: mimeType } }
        ]}
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const resultText = response.text;
    const data = JSON.parse(resultText);

    if (!data.isPlant) {
      return {
        accepted: false,
        lowConfidence: false,
        notes: 'No plant material detected in this image. Please upload a clear photo of a plant leaf or crop for disease analysis.'
      };
    }

    const confidence = data.confidence || 0;
    const isLowConfidence = confidence < 0.60;
    const isAccepted = confidence >= 0.35;

    if (!isAccepted) {
      return {
        accepted: false,
        lowConfidence: true,
        confidence: parseFloat((confidence * 100).toFixed(1)),
        notes: 'The image could not be diagnosed with sufficient confidence. Please try uploading a clearer, well-lit photo focused directly on the affected area.'
      };
    }

    const result = {
      accepted: true,
      lowConfidence: isLowConfidence,
      disease: data.disease || 'Unknown Anomaly',
      scientificName: data.scientificName || 'N/A',
      confidence: parseFloat((confidence * 100).toFixed(1)),
      severity: data.severity || 'unknown',
      symptoms: data.symptoms || 'Symptoms unclear.',
      management: data.management || [],
      affectedCrops: data.affectedCrops || [],
      notes: isLowConfidence
        ? `Analysis complete — ${data.disease} detected with ${parseFloat((confidence * 100).toFixed(1))}% confidence (Low Confidence).`
        : `Analysis complete — ${data.disease} detected with ${parseFloat((confidence * 100).toFixed(1))}% confidence.`,
      imageName
    };

    return result;
  } catch (err) {
    console.error('Analysis error:', err);
    const msg = err?.message ?? '';
    if (msg.includes('Google GenAI is not configured')) {
      return {
        accepted: false,
        lowConfidence: false,
        notes: 'AI analysis is not configured on this server. Set GEMINI_API_KEY, or GOOGLE_CLOUD_PROJECT (+ GOOGLE_CLOUD_LOCATION), optionally GOOGLE_CLOUD_ADC_KEY, then restart the backend.'
      };
    }
    if (msg.includes('GOOGLE_CLOUD_ADC_KEY')) {
      return {
        accepted: false,
        lowConfidence: false,
        notes: 'AI credentials are misconfigured. Check GOOGLE_CLOUD_ADC_KEY (must be base64 of valid Google credential JSON).'
      };
    }
    return {
      accepted: false,
      lowConfidence: false,
      notes: 'Unable to process image. An error occurred during AI analysis.'
    };
  }
}
