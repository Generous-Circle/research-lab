import { createClient } from "@supabase/supabase-js";

// Minimal Supabase client for the Lab.
//
// Two ways in, both resolved server-side against the study's membership list:
//  1. A normal account on the project (email + password) — the primary path, and
//     the account the CMU team already has.
//  2. A personal research token (`crt_…`) pasted in — used for scripts, the
//     notebook, and as a fallback when someone cannot sign in.
//
// The Lab never queries tables directly: everything goes through the research
// edge functions.
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
// It is not a credential: it cannot read the research data without a session
// that resolves to a member, or a valid research token.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "research-lab-auth",
  },
});
