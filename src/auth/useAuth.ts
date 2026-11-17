import { useCallback, useEffect, useState } from "react";
import { getResearchToken, setResearchToken } from "@/lib/researchApi";

export interface LabUser {
  email: string | null;
  id: string | null;
}

/**
 * Lab identity is a personal research token, not a Vetted account.
 * The token is issued by a study Admin and pasted once; it can be revoked
 * server-side at any time without touching anything else.
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(() => getResearchToken());
  const [user, setUser] = useState<LabUser | null>(null);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    // Email is shown by whoami; until then we only know a token is present.
    setUser({ email: null, id: null });
  }, [token]);

  const signIn = useCallback((next: string) => {
    setResearchToken(next.trim());
    setToken(next.trim());
  }, []);

  const signOut = useCallback(() => {
    setResearchToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, signIn, signOut };
}
