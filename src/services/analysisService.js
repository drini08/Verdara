import { apiUrl, API_URL } from '../config/api';

const API_ENDPOINT = apiUrl('/api/analyze-disease');

export async function analyzeDiseasePhoto(file) {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        accepted: false,
        lowConfidence: false,
        notes: error.error || 'Analysis failed. Please try again.'
      };
    }

    const data = await response.json();
    
    // If not accepted, pass through the rejection reason
    if (data.accepted === false) {
      return {
        accepted: false,
        lowConfidence: data.lowConfidence || false,
        confidence: data.confidence || 0,
        notes: data.notes || 'Analysis could not be completed.'
      };
    }

    // Successful analysis — ensure all required fields are present
    return {
      accepted: true,
      lowConfidence: false,
      disease: data.disease || 'Unknown Disease',
      scientificName: data.scientificName || '',
      confidence: data.confidence || 0,
      severity: data.severity || 'unknown',
      symptoms: data.symptoms || 'Unable to determine symptoms',
      management: data.management || [],
      affectedCrops: data.affectedCrops || [],
      notes: data.notes || 'Analysis complete'
    };
  } catch (err) {
    console.error('Analysis error:', err);
    return {
      accepted: false,
      lowConfidence: false,
      notes: `Network error. Make sure the backend server is running on ${API_URL}`
    };
  }
}
