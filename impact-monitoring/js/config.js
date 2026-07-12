// App-level config for the prototype.
// NOTE: the Gemini API key is NOT here anymore — it lives server-side only,
// as the Netlify environment variable GEMINI_API_KEY, read by
// netlify/functions/gemini.js. The browser never sees it.

// Supabase (auth + cloud state). The publishable key is safe to ship:
// data access is protected by Row Level Security, not by this key.
export const SUPABASE_URL = "https://ummjwbgkxkgfnqqnidzu.supabase.co";
export const SUPABASE_KEY = "sb_publishable_v2wcYSoqL3PTe5-1Ui8vfQ_oWbcEBFN";
