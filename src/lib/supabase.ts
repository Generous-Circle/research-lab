// Minimal Supabase client for the Lab's edge-function calls.
//
// The Lab talks to the research edge functions only — it never queries tables
// directly. Access is a personal research token (`crt_…`) pasted once and kept
// in localStorage; the functions resolve it server-side against the study's
// membership allowlist. No Supabase auth session, no user accounts here.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and fill them in.",
  );
}

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_KEY;

// The publishable/anon key is the gateway key (public by design, RLS-safe).
// It is not a credential: it cannot read the research schema without a token.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
