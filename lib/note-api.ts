import { noteSummarySchema, type NoteSummary } from './schemas/note';

// Reads the note list from a notes backend, when EXPO_PUBLIC_API_URL points at
// one; Expo inlines it at build time. Uploading notes does not use this: they
// go to the scanner service as PDFs (see note-sync.ts).
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

const REQUEST_TIMEOUT = 10_000;

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('No notes API endpoint is configured.');
    this.name = 'ApiNotConfiguredError';
  }
}

export function isApiConfigured() {
  return BASE_URL.length > 0;
}

/** The notes the server already holds, for merging into the on-device list. */
export async function fetchNotes(): Promise<NoteSummary[]> {
  const response = await request('/notes', { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Note list rejected with ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return [];

  // Anything the server sends that this build does not understand is skipped
  // rather than allowed to break the list.
  return payload.flatMap((entry) => {
    const result = noteSummarySchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
}

async function request(path: string, init: RequestInit) {
  if (!isApiConfigured()) throw new ApiNotConfiguredError();

  // Without this a request on a dead connection can hang long past the point
  // where falling back to the device would have been the better answer.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT);

  try {
    return await fetch(`${BASE_URL}${path}`, { ...init, signal: abort.signal });
  } finally {
    clearTimeout(timer);
  }
}
