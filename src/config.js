// API configuration - uses environment variable in production, localhost in development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
