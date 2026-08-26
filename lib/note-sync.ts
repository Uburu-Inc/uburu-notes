import { isOnline } from './connectivity';
import {
  ApiNotConfiguredError,
  fetchNotes,
  isApiConfigured,
  uploadNote,
} from './note-api';
import { listNotes, listPendingNotes, writeNote } from './note-store';
import type { NoteSummary, StoredNote } from './schemas/note';

/** Where a save ended up, which is all the screen needs to say about it. */
export type SaveOutcome = 'synced' | 'device';

/** A note as the editor knows it, before anything has decided where it lives. */
export type DraftNote = Omit<StoredNote, 'syncedAt'>;

/**
 * Writes to the device first, every time, then tries the server. The device
 * copy is what makes offline work, and it is also what a failed upload falls
 * back to: the note is simply left marked as waiting.
 */
export async function saveNote(draft: DraftNote): Promise<SaveOutcome> {
  await writeNote({ ...draft, syncedAt: null });

  if (!isApiConfigured() || !(await isOnline())) return 'device';

  try {
    await uploadNote({ ...draft, syncedAt: null });
    await writeNote({ ...draft, syncedAt: new Date().toISOString() });
    return 'synced';
  } catch (error) {
    // Not a failure from the user's point of view: it is saved, just not there
    // yet, and the next reconnection will carry it up.
    console.warn(`Note ${draft.id} stays on the device for now:`, error);
    return 'device';
  }
}

/**
 * Uploads everything saved while offline. Stops at the first failure, since
 * the usual cause is the connection going away again and the rest would fail
 * the same way.
 */
export async function syncPendingNotes(): Promise<number> {
  if (!isApiConfigured() || !(await isOnline())) return 0;

  const waiting = await listPendingNotes();
  let uploaded = 0;

  for (const note of waiting) {
    try {
      await uploadNote(note);
      await writeNote({ ...note, syncedAt: new Date().toISOString() });
      uploaded += 1;
    } catch (error) {
      console.warn(`Could not upload note ${note.id}:`, error);
      break;
    }
  }

  return uploaded;
}

/**
 * Every note the user has, wherever it currently lives. The device copy wins a
 * tie on id when it is the more recently edited one, so a note written offline
 * is never hidden by an older version from the server.
 */
export async function listAllNotes(): Promise<NoteSummary[]> {
  const onDevice = await listNotes();

  if (!isApiConfigured() || !(await isOnline())) return onDevice;

  try {
    const onServer = await fetchNotes();
    return mergeNewest(onDevice, onServer);
  } catch (error) {
    if (!(error instanceof ApiNotConfiguredError)) {
      console.warn('Could not read notes from the server:', error);
    }
    return onDevice;
  }
}

function mergeNewest(onDevice: NoteSummary[], onServer: NoteSummary[]): NoteSummary[] {
  const byId = new Map(onDevice.map((note) => [note.id, note]));

  for (const note of onServer) {
    const local = byId.get(note.id);
    if (!local || note.updatedAt.localeCompare(local.updatedAt) > 0) {
      byId.set(note.id, note);
    }
  }

  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
