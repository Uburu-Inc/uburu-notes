import { noteSummarySchema, type NoteSummary, type StoredNote } from './schemas/note';

// Point the app at a backend by setting EXPO_PUBLIC_API_URL; Expo inlines it at
// build time. While it is unset there is no server, so every save stays on the
// device and nothing is ever considered "waiting to upload".
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

const REQUEST_TIMEOUT = 10_000;

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('No API endpoint is configured, so this note stays on the device.');
    this.name = 'ApiNotConfiguredError';
  }
}

export function isApiConfigured() {
  return BASE_URL.length > 0;
}

/**
 * Sends the note under its own id, so re-sending an edited note replaces the
 * server's copy instead of adding a second one. That also makes a retry after a
 * connection drop safe to repeat.
 */
export async function uploadNote(note: StoredNote): Promise<void> {
  const response = await request(`/notes/${encodeURIComponent(note.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: note.id,
      name: note.name,
      hospitalId: note.hospitalId,
      author: note.author,
      preview: note.preview,
      strokeCount: note.strokeCount,
      paths: note.paths,
      strokes: note.strokes,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload rejected with ${response.status}`);
  }
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
