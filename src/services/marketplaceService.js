// Marketplace service: fetch real listings from the backend (no mock data)

import { apiUrl } from '../config/api';

export async function getMarketplaceListings() {
  const res = await fetch(apiUrl('/api/marketplace/posts'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load marketplace posts');
  }
  return res.json();
}

