import { GoogleGenAI } from '@google/genai';
import { runAsync, allAsync } from './database.js';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

/**
 * Submit a new anonymous farmer report to the community intelligence database.
 */
export async function submitFarmerReport(location, cropType, issueDescription, userId = null) {
  const query = `
    INSERT INTO farmer_reports (location, cropType, issueDescription, userId)
    VALUES (?, ?, ?, ?)
  `;
  const result = await runAsync(query, [location, cropType, issueDescription, userId]);
  return result.lastID;
}

/**
 * Fetch recent reports for a region and use AI to generate agricultural intelligence.
 */
export async function analyzeRegionIntelligence(region) {
  try {
    // Fetch recent reports from the database (e.g., last 30 days)
    // For simplicity, we just fetch all reports that match the region.
    // A more advanced query might use spatial indexing or full text search.
    const query = `
      SELECT * FROM farmer_reports 
      WHERE location LIKE ? 
      ORDER BY createdAt DESC 
      LIMIT 100
    `;
    const reports = await allAsync(query, [`%${region}%`]);

    if (!reports || reports.length === 0) {
      return {
        region: region,
        active_issues: [],
        alerts: [],
        insights: "No reports found for this region recently. Conditions appear stable."
      };
    }

    const prompt = `
You are the "Community Intelligence Layer" inside Verdara, an AI-driven agricultural intelligence platform.
Your role is to collect, normalize, and analyze anonymous farmer reports and transform them into real-time local agricultural intelligence.

INPUT DATA
Here are the recent reports from farmers in the region "${region}":
${JSON.stringify(reports, null, 2)}

YOUR TASKS
1. Classify Reports: Identify category (pest / disease / soil / drought / other) and extract key entities.
2. Cluster by Geography: Group similar reports within nearby regions and detect emerging "hotspots".
3. Detect Patterns: Identify spikes and compare with recent historical baseline.
4. Generate Alerts: Create localized warnings for nearby farmers.

OUTPUT FORMAT
Return structured JSON ONLY:
{
  "region": "The primary region analyzed",
  "active_issues": [
    {
      "type": "pest/disease/soil/drought/other",
      "description": "Short description of the issue",
      "severity": "Low/Medium/High/Critical",
      "trend": "increasing/stable/decreasing"
    }
  ],
  "alerts": [
    {
      "message": "Simple, practical, and action-oriented warning",
      "target_radius_km": "Estimated radius in km",
      "urgency": "Low/Medium/High/Critical"
    }
  ],
  "insights": "Overall summary of current issues and recommended preventive actions (non-technical, farmer-friendly)"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.error('Error analyzing community reports:', err);
    throw new Error('Failed to analyze community intelligence data.');
  }
}

/**
 * Fetch all recent farmer reports from the database.
 */
export async function getAllFarmerReports() {
  const query = `
    SELECT * FROM farmer_reports 
    ORDER BY createdAt DESC 
    LIMIT 50
  `;
  const reports = await allAsync(query);
  return reports;
}

/**
 * Fetch all reports submitted by a specific user.
 */
export async function getUserReports(userId) {
  const query = `
    SELECT * FROM farmer_reports 
    WHERE userId = ?
    ORDER BY createdAt DESC
  `;
  const reports = await allAsync(query, [userId]);
  return reports;
}

/**
 * Update an existing report (only if the user is the owner).
 */
export async function updateFarmerReport(id, userId, location, cropType, issueDescription) {
  const query = `
    UPDATE farmer_reports 
    SET location = ?, cropType = ?, issueDescription = ?
    WHERE id = ? AND userId = ?
  `;
  const result = await runAsync(query, [location, cropType, issueDescription, id, userId]);
  return result.changes > 0;
}

/**
 * Delete a report (only if the user is the owner).
 */
export async function deleteFarmerReport(id, userId) {
  const query = `
    DELETE FROM farmer_reports 
    WHERE id = ? AND userId = ?
  `;
  const result = await runAsync(query, [id, userId]);
  return result.changes > 0;
}
