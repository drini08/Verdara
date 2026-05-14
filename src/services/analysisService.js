const API_ENDPOINT = "http://localhost:5000/api/analyze-disease";

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
        notes: error.error || 'Analysis failed. Please try again.'
      };
    }

    const data = await response.json();
    
    // Ensure all required fields are present
    return {
      accepted: data.accepted !== false,
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
      notes: 'Network error. Make sure the backend server is running on http://localhost:5000'
    };
  }
}
