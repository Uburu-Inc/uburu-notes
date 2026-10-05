import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  noteSummarySchema,
  storedNoteSchema,
  summaryOf,
  type NoteSummary,
  type StoredNote,
} from './schemas/note';

// Notes are stored one key each, with a separate index of summaries. A single
// key holding everything would be simpler, but Android reads a row into a fixed
// size window, so one growing blob is what eventually fails.
const INDEX_KEY = 'uburu.notes.index.v1';
const NOTE_PREFIX = 'uburu.notes.note.v1.';

const noteKey = (id: string) => `${NOTE_PREFIX}${id}`;

// Updating the index is read-modify-write, and autosave can land two of them
// within a moment of each other — one while the previous is still awaiting the
// network. Queuing them means the second always starts from the first's result
// instead of from the same stale snapshot.
let pendingWrites: Promise<unknown> = Promise.resolve();

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = pendingWrites.then(work, work);
  pendingWrites = result.catch(() => undefined);
  return result;
}

export function createNoteId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Newest first. Unreadable entries are dropped rather than failing the list. */
export async function listNotes(): Promise<NoteSummary[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];

  try {
    return parseArray(raw)
      .flatMap((entry) => {
        const result = noteSummarySchema.safeParse(entry);
        return result.success ? [result.data] : [];
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    console.warn('Could not read the note index:', error);
    return [];
  }
}

export async function readNote(id: string): Promise<StoredNote | null> {
  // A save queued just before — leaving a note, then opening it straight away
  // — has to land first, or this would read the note as it was before the edit.
  await pendingWrites;

  const raw = await AsyncStorage.getItem(noteKey(id));
  if (!raw) return null;

  try {
    const result = storedNoteSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      console.warn(`Note ${id} does not match the current shape:`, result.error.issues);
      return null;
    }
    return result.data;
  } catch (error) {
    console.warn(`Could not read note ${id}:`, error);
    return null;
  }
}

/** Writes the note, then republishes the index entry that describes it. */
export function writeNote(note: StoredNote): Promise<void> {
  return serialized(async () => {
    await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));

    const others = (await listNotes()).filter((entry) => entry.id !== note.id);
    await saveIndex([summaryOf(note), ...others]);
  });
}

/**
 * Records that the server now holds the note as it was at `updatedAt`. Only the
 * index entry changes — sync state is read from there alone — so an upload
 * does not re-serialise every stroke just to flip one field. If a newer edit
 * was saved while the upload was in flight, what reached the server is already
 * out of date, and the note is left waiting.
 */
export function markNoteSynced(
  id: string,
  updatedAt: string,
  syncedAt: string,
  uploadResult: 'uploaded' | 'duplicate'
): Promise<void> {
  return updateIndexEntry(id, updatedAt, { syncedAt, uploadError: null, uploadResult });
}

/**
 * Records why an upload of the note as it was at `updatedAt` failed. The note
 * stays waiting, so the next sync tries it again.
 */
export function markNoteUploadFailed(id: string, updatedAt: string, uploadError: string) {
  return updateIndexEntry(id, updatedAt, { uploadError });
}

function updateIndexEntry(
  id: string,
  updatedAt: string,
  changes: Partial<NoteSummary>
): Promise<void> {
  return serialized(async () => {
    const entries = await listNotes();
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry || entry.updatedAt !== updatedAt) return;

    await saveIndex(
      entries.map((candidate) => (candidate === entry ? { ...entry, ...changes } : candidate))
    );
  });
}

/** The notes still waiting to reach the server, oldest edit first. */
export async function listPendingNotes(): Promise<StoredNote[]> {
  const waiting = (await listNotes())
    .filter((entry) => entry.syncedAt === null)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  const notes = await Promise.all(waiting.map((entry) => readNote(entry.id)));
  return notes.filter((note): note is StoredNote => note !== null);
}

export function deleteNote(id: string): Promise<void> {
  return serialized(async () => {
    const remaining = (await listNotes()).filter((entry) => entry.id !== id);
    await saveIndex(remaining);
    await AsyncStorage.removeItem(noteKey(id));
  });
}

async function saveIndex(entries: NoteSummary[]) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

// The index is written by this module alone, but a half-written or hand-edited
// value should still degrade to an empty list rather than throw on startup.
function parseArray(raw: string): unknown[] {
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}
