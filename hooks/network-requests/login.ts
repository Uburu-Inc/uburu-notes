import { useCallback, useState } from 'react';
import { z } from 'zod';

import { readSession, saveSession, type StoredSession } from '../../lib/auth-storage';
import { interceptedFetch, setAuthToken } from '../../lib/fetch';

export type LoginCredentials = {
  username: string;
  password: string;
};

// Only the parts of the sign-in response the app keeps; the rest is ignored.
const loginResponseSchema = z.object({
  data: z.object({
    access_token: z.string().min(1),
    account: z.object({
      uid: z.coerce.string(),
      institution: z.object({ uid: z.coerce.string() }).nullish(),
    }),
  }),
});

/**
 * Exchanges a username and password for a token and keeps it in secure storage,
 * so every later request through interceptedFetch is sent as this user, and the
 * session survives the app restarting.
 */
export async function login(credentials: LoginCredentials): Promise<StoredSession> {
  const response = await interceptedFetch('auth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const payload: any = await response.json().catch(() => null);

  if (!response.ok) {
    // The API reports failures as { error: { detail: "..." } }.
    throw new Error(payload?.error?.detail ?? payload?.detail ?? `Sign in failed (${response.status})`);
  }

  const parsed = loginResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('Sign in succeeded but the response was not understood.');
  }

  const { access_token, account } = parsed.data.data;
  const session: StoredSession = {
    accessToken: access_token,
    uid: account.uid,
    institutionUid: account.institution?.uid ?? null,
  };

  await saveSession(session);
  setAuthToken(session.accessToken);
  return session;
}

/**
 * Loads a session saved by an earlier sign-in into memory. Returns whether there
 * was one, so the app can skip the login form.
 */
export async function restoreSession() {
  const session = await readSession().catch(() => null);
  setAuthToken(session?.accessToken ?? null);
  return session !== null;
}

/** login() with the loading and error state a sign-in form needs. */
export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      return await login(credentials);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login: submit, loading, error };
}
