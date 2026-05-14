// Marketplace service: fetch real listings from the backend (no mock data)

const API_URL = 'http://localhost:5000';

export async function getMarketplaceListings() {
  const res = await fetch(`${API_URL}/api/marketplace/posts`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load marketplace posts');
  }
  return res.json();
}

