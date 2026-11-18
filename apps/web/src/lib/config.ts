/** Base URL of apps/server. Set VITE_API_URL on Vercel. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/** Google OAuth web client ID. The Google button is hidden when it is not set. */
export const GOOGLE_CLIENT_ID: string | undefined =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;
