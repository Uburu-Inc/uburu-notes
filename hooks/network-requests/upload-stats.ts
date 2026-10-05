import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getAuthToken, interceptedFetch, SCANNER_BASE_URL } from '../../lib/fetch';
import { asNumber, UnauthorizedError, useEndSession } from './scanner';

export type UploadSessionStats = {
  total_patient_folders: number;
  total_patient_records: number;
};

export const EMPTY_UPLOAD_STATS: UploadSessionStats = {
  total_patient_folders: 0,
  total_patient_records: 0,
};

/**
 * Upload totals for the signed-in user, sent with `Bearer` auth by the fetch
 * interceptor. A 404 or any other failed response counts as no uploads yet, as
 * on the web app; only a 401 is reported, so the caller can sign the user out.
 */
export async function fetchUploadStats(): Promise<UploadSessionStats> {
  const response = await interceptedFetch(`${SCANNER_BASE_URL}patients/stats`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) return EMPTY_UPLOAD_STATS;

  const payload: any = await response.json().catch(() => null);
  // Sent either wrapped in { data: {...} } or as the stats object itself.
  const stats = payload?.data ?? payload;

  return {
    total_patient_folders: asNumber(stats?.total_patient_folders),
    total_patient_records: asNumber(stats?.total_patient_records),
  };
}

/**
 * The Home screen's upload totals. Reloaded each time the screen comes into
 * focus, and on demand for pull-to-refresh. A failed load shows zeros rather
 * than blocking the screen; a rejected token signs the user out.
 */
export function useUploadStats() {
  const endSession = useEndSession();
  const [stats, setStats] = useState<UploadSessionStats>(EMPTY_UPLOAD_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest load may update the screen, so a slow earlier one cannot
  // overwrite fresher numbers.
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const id = ++latestLoad.current;

    if (!getAuthToken()) {
      await endSession();
      return;
    }

    try {
      const result = await fetchUploadStats();
      if (id === latestLoad.current) setStats(result);
    } catch (error) {
      if (id !== latestLoad.current) return;
      if (error instanceof UnauthorizedError) {
        await endSession();
        return;
      }
      setStats(EMPTY_UPLOAD_STATS);
    } finally {
      if (id === latestLoad.current) setLoading(false);
    }
  }, [endSession]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        // Leaving the screen discards whatever is still loading.
        latestLoad.current += 1;
      };
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // reload refetches without the pull-to-refresh spinner.
  return { stats, loading, refreshing, refresh, reload: load };
}
