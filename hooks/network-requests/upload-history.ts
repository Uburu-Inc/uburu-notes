import { useCallback, useEffect, useState } from 'react';

import { asNumber, asString, scannerGet, useScannerQuery } from './scanner';

export const HISTORY_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE = 500;

export type UploadHistoryEntry = {
  patient_id: string;
  hospital_id: string;
  first_name: string;
  last_name: string;
  file_count: number;
  latest_file_id: string;
  latest_file_name: string;
  latest_status: string;
  latest_created_at: string;
  latest_confirmed_at: string;
};

export type UploadHistory = {
  patients: UploadHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
};

/** One page of uploads, newest first, grouped by patient. */
export async function fetchUploadHistory(
  offset = 0,
  limit = HISTORY_PAGE_SIZE,
  search = ''
): Promise<UploadHistory> {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (search.trim()) query.set('search', search.trim());

  const json = await scannerGet(`patients?${query}`);
  // The list arrives as `patients`, `results` or `items` depending on the endpoint version.
  const rows: any[] = Array.isArray(json?.patients)
    ? json.patients
    : Array.isArray(json?.results)
      ? json.results
      : Array.isArray(json?.items)
        ? json.items
        : [];

  return {
    patients: rows.map((row) => ({
      patient_id: asString(row?.patient_id),
      hospital_id: asString(row?.hospital_id),
      first_name: asString(row?.first_name),
      last_name: asString(row?.last_name),
      file_count: asNumber(row?.file_count),
      latest_file_id: asString(row?.latest_file_id),
      latest_file_name: asString(row?.latest_file_name),
      latest_status: asString(row?.latest_status),
      latest_created_at: asString(row?.latest_created_at),
      latest_confirmed_at: asString(row?.latest_confirmed_at),
    })),
    total: asNumber(json?.total ?? rows.length),
    limit: asNumber(json?.limit ?? limit) || limit,
    offset: asNumber(json?.offset ?? offset),
  };
}

/**
 * The Home screen's upload history: a search box (debounced, back to page one
 * on every new search) and paging by `offset` + `limit`.
 */
export function useUploadHistory() {
  const [searchText, setSearchText] = useState('');
  // Search and page change together, so a new search never loads its first page
  // with the previous page number.
  const [query, setQuery] = useState({ search: '', page: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchText.trim();
      setQuery((current) => (current.search === search ? current : { search, page: 1 }));
    }, SEARCH_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetcher = useCallback(
    () => fetchUploadHistory((query.page - 1) * HISTORY_PAGE_SIZE, HISTORY_PAGE_SIZE, query.search),
    [query]
  );
  const { data, loading, error, reload } = useScannerQuery(fetcher);

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (data?.limit || HISTORY_PAGE_SIZE)));

  const goToPage = useCallback(
    (page: number) => setQuery((current) => ({ ...current, page: Math.min(Math.max(1, page), pageCount) })),
    [pageCount]
  );

  return {
    patients: data?.patients ?? [],
    total,
    page: query.page,
    pageCount,
    goToPage,
    searchText,
    setSearchText,
    // The search that produced the rows on screen, for the empty-state message.
    activeSearch: query.search,
    loading,
    error,
    reload,
  };
}
