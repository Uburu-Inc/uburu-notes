import { readNote } from './note-store';
import type { StoredNote } from './schemas/note';

// A read left unclaimed this long is dropped rather than handed out, so an
// opening that never happened cannot later serve a copy from before an edit.
const MAX_AGE = 5000;

interface Read {
  promise: Promise<StoredNote | null>;
  startedAt: number;
  /** Set once the read has finished; `undefined` until then. */
  note?: StoredNote | null;
}

const reads = new Map<string, Read>();

function current(id: string) {
  const read = reads.get(id);
  if (read && Date.now() - read.startedAt > MAX_AGE) {
    reads.delete(id);
    return undefined;
  }
  return read;
}

/**
 * Starts reading a note ahead of the screen that shows it. Called as a row is
 * tapped, so the storage read runs while navigation is still bringing up the
 * note screen — which usually means the note is already in memory by the time
 * that screen first renders, and can be drawn straight away.
 */
export function prefetchNote(id: string) {
  if (current(id)) return;

  const read: Read = { promise: readNote(id), startedAt: Date.now() };
  read.promise.then(
    (note) => {
      read.note = note;
    },
    () => {
      read.note = null;
    }
  );
  reads.set(id, read);
}

/**
 * The note if its read has already finished, without waiting: the note, `null`
 * when it could not be read, or `undefined` while it is still on its way.
 */
export function peekNote(id: string): StoredNote | null | undefined {
  return current(id)?.note;
}

/** Drops a read that is no longer needed, once its note is on screen. */
export function forgetNote(id: string) {
  reads.delete(id);
}

/**
 * Hands over the read for a note — the one under way, or a fresh one — and
 * forgets it, so the next opening reads the note again rather than reusing
 * this copy.
 */
export function takeNote(id: string): Promise<StoredNote | null> {
  const read = current(id);
  reads.delete(id);
  return read?.promise ?? readNote(id);
}
