import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { interceptedFetch, SCANNER_BASE_URL, SessionEndedError } from '../../lib/fetch';
import { logout } from './logout';

// Shared by every scanner-service request: the error types, the GET helper and
// the loading/error/401 handling each screen's hook builds on.

/** The token was rejected, so the session is over and the user must sign in again. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Your session has expired. Sign in again.');
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('That could not be found.');
    this.name = 'NotFoundError';
  }
}

/**
 * GETs a scanner path (sent with `Bearer` auth by the fetch interceptor) and
 * returns the body, unwrapped from its `data` envelope when it has one.
 */
export async function scannerGet(path: string): Promise<any> {
  const response = await interceptedFetch(`${SCANNER_BASE_URL}${path.replace(/^\//, '')}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401) throw new UnauthorizedError();
  if (response.status === 404) throw new NotFoundError();
  if (!response.ok) throw new Error(`Something went wrong (${response.status}). Try again.`);

  const payload: any = await response.json().catch(() => null);
  return payload?.data ?? payload;
}

/** Signs out and lands on the login screen with nothing behind it to go back to. */
export function useEndSession() {
  const router = useRouter();

  return useCallback(async () => {
    await logout();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }, [router]);
}

type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
};

/**
 * Runs `fetcher` whenever it changes (wrap it in useCallback), tracking loading
 * and errors. A 401 signs the user out. Only the latest run may update state, so
 * a slow earlier page or search cannot overwrite a newer one.
 */
export function useScannerQuery<T>(fetcher: () => Promise<T>) {
  const endSession = useEndSession();
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
    notFound: false,
  });
  const latestRun = useRef(0);

  const run = useCallback(async () => {
    const id = ++latestRun.current;
    setState((current) => ({ ...current, loading: true, error: null, notFound: false }));

    try {
      const data = await fetcher();
      if (id === latestRun.current) setState({ data, loading: false, error: null, notFound: false });
    } catch (error) {
      if (id !== latestRun.current || error instanceof SessionEndedError) return;
      if (error instanceof UnauthorizedError) {
        await endSession();
        return;
      }
      // Whatever was showing stays, with the error alongside it for a retry.
      setState((current) => ({
        ...current,
        loading: false,
        notFound: error instanceof NotFoundError,
        error:
          error instanceof Error && !(error instanceof TypeError)
            ? error.message
            : 'Could not reach the server. Check your connection and try again.',
      }));
    }
  }, [fetcher, endSession]);

  useEffect(() => {
    void run();
    return () => {
      // Unmounting or a new fetcher discards whatever is still loading.
      latestRun.current += 1;
    };
  }, [run]);

  return { ...state, reload: run };
}

export function asString(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
