// Use relative URL so it works on any deployment (Vercel, Railway, etc.)
export const API_URL = typeof window !== 'undefined' ? window.location.origin : '';
