/**
 * API Configuration
 * Centralized API URL configuration for production and development.
 */

/**
 * Get the base API URL from environment variables.
 * Falls back to localhost for development.
 */
export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
}

/**
 * Build a full API endpoint URL.
 * @param path - The API path (e.g., '/api/whatsapp/test')
 */
export function getApiEndpoint(path: string): string {
  const base = getApiUrl();
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
