/** Backend base URL (no trailing slash). Override with VITE_API_URL in .env */
const rawEnv = import.meta.env.VITE_API_URL;
let resolved = (rawEnv && rawEnv.trim() !== '') ? rawEnv.trim() : 'http://localhost:5000';

// If the provided URL doesn't include a protocol, assume https and prefix it.
if (!/^https?:\/\//i.test(resolved)) {
  resolved = `https://${resolved.replace(/^\/+/, '')}`;
}

export const API_URL = resolved.replace(/\/$/, '');

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}
