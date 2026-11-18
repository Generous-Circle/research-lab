import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getResearchToken, setResearchToken } from "@/lib/researchApi";

export interface LabUser {
  email: string | null;
  id: string | null;
}

/**
 * The Lab accepts the account the member already has (email + password), and a
 * personal research token as a fallback for scripts and lockouts. Either way the
 * server decides whether the caller is on the study team.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(() => getResearchToken());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        // A signed-in account wins over a stale pasted token.
        setResearchToken(null);
        setToken(null);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);

  const signInWithToken = useCallback((next: string) => {
    setResearchToken(next.trim());
    setToken(next.trim());
  }, []);

  const signOut = useCallback(async () => {
    setResearchToken(null);
    setToken(null);
    await supabase.auth.signOut().catch(() => {});
  }, []);

  const user: LabUser | null = session?.user
    ? { email: session.user.email ?? null, id: session.user.id }
    : token
      ? { email: null, id: null }
      : null;

  return {
    ready,
    user,
    signedIn: Boolean(session || token),
    /** The bearer the API client should send: account session first, token second. */
    bearer: session?.access_token ?? token,
    signIn,
    signInWithToken,
    signOut,
  };
}
