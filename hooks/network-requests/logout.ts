import { useCallback, useState } from 'react';

import { clearSession, readSession } from '../../lib/auth-storage';
import { interceptedFetch, setAuthToken } from '../../lib/fetch';

// Logging out waits on this request, so a dead connection must not hold the
// user on a spinner; the local sign-out happens either way.
const REVOKE_TIMEOUT = 8_000;

/**
 * Revokes the token on the server (best effort), then removes every auth value
 * from the device. The local part always runs, whatever the server says or if it
 * cannot be reached, matching the web app.
 */
export async function logout() {
  const session = await readSession().catch(() => null);

  if (session) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REVOKE_TIMEOUT);
    try {
      await interceptedFetch(`auth/token/${encodeURIComponent(session.uid)}/`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${session.accessToken}` },
        signal: abort.signal,
      });
    } catch {
      // Expired token, server error or no connection: still sign out locally.
    } finally {
      clearTimeout(timer);
    }
  }

  await clearSession();
  setAuthToken(null);
}

/** logout() with a loading flag for the button that triggers it. */
export function useLogout() {
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
  }, []);

  return { logout: submit, loading };
}
