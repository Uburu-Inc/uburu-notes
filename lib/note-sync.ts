import { router } from 'expo-router';

import { logout } from '../hooks/network-requests/logout';
import { uploadPdfGroup, type PdfUpload } from '../hooks/network-requests/note-upload';
import { UnauthorizedError } from '../hooks/network-requests/scanner';
import { isOnline } from './connectivity';
import { getAuthToken, SessionEndedError } from './fetch';
import { ApiNotConfiguredError, fetchNotes, isApiConfigured } from './note-api';
import { renderNotePdf } from './note-pdf';
import {
  listNotes,
  listPendingNotes,
  markNoteSynced,
  markNoteUploadFailed,
  writeNote,
} from './note-store';
import type { NoteSummary, StoredNote } from './schemas/note';

/** A note as the editor knows it, before anything has decided where it lives. */
export type DraftNote = Omit<StoredNote, 'syncedAt'>;

/**
 * Writes the note to the device, marked as waiting to upload. Saving never
 * touches the network: the note goes up as a PDF once the user leaves it (see
 * syncPendingNotes), so a note is uploaded when it is finished rather than
 * after every pause in the writing.
 */
export async function saveNote(draft: DraftNote): Promise<void> {
  await writeNote({ ...draft, syncedAt: null, uploadError: null });
}

// The note open in the editor is still being written, so a sync started by
// the connection coming back must leave it alone; it goes up when it is left.
let noteInEditor: string | null = null;

export function setNoteInEditor(id: string) {
  noteInEditor = id;
}

/** The editor is done with this note. A later note opened since keeps its hold. */
export function leaveNoteInEditor(id: string) {
  if (noteInEditor === id) noteInEditor = null;
}

// The notes being uploaded right now, for the list to show "Uploading…". A new
// set on every change, so it can be handed to useSyncExternalStore as is.
let uploading: ReadonlySet<string> = new Set();
const uploadingListeners = new Set<() => void>();

function setUploading(ids: Iterable<string>) {
  uploading = new Set(ids);
  uploadingListeners.forEach((listener) => listener());
}

/** The ids of the notes being uploaded at this moment. */
export function getUploadingNoteIds() {
  return uploading;
}

/** Calls back whenever a note starts or stops uploading. Returns an unsubscribe. */
export function onUploadingChanged(listener: () => void) {
  uploadingListeners.add(listener);
  return () => {
    uploadingListeners.delete(listener);
  };
}

const syncListeners = new Set<() => void>();

/** Calls back after a sync has changed what the server holds. Returns an unsubscribe. */
export function onNotesSynced(listener: () => void) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

// Leaving a note and the connection coming back can both ask for a sync at
// once. Only one runs; a request made while it is running gets one more pass
// afterwards, so a note saved in the meantime is not left behind.
let running: Promise<number> | null = null;
let runAgain = false;

/**
 * Uploads every note waiting on the device as a PDF, in one upload session,
 * in the background. Returns how many reached the server. Safe to call at any
 * time: offline, signed out or already running, it does nothing extra.
 */
export function syncPendingNotes(): Promise<number> {
  if (running) {
    runAgain = true;
    return running;
  }

  running = (async () => {
    let uploaded = 0;
    do {
      runAgain = false;
      uploaded += await uploadWaitingNotes();
    } while (runAgain);
    return uploaded;
  })().finally(() => {
    running = null;
  });

  return running;
}

async function uploadWaitingNotes(): Promise<number> {
  if (!getAuthToken() || !(await isOnline())) return 0;

  let waiting = (await listPendingNotes()).filter((note) => note.id !== noteInEditor);
  let uploaded = 0;
  let changed = false;
  if (waiting.length === 0) return 0;

  console.log(`Uploading ${waiting.length} note(s)…`);
  setUploading(waiting.map((note) => note.id));

  try {
    // The server matches its answers to files by name, so two notes for the
    // same patient cannot share a session; the second goes in the next one.
    while (waiting.length > 0) {
      const group: { note: StoredNote; pdf: PdfUpload }[] = [];
      const later: StoredNote[] = [];

      for (const note of waiting) {
        const fileName = pdfFileName(note);
        if (group.some((entry) => entry.pdf.fileName === fileName)) {
          later.push(note);
          continue;
        }
        // Rendering is synchronous, so give the screen a frame between notes.
        await new Promise((resolve) => setTimeout(resolve, 0));
        group.push({ note, pdf: { fileName, bytes: renderNotePdf(note) } });
      }

      const results = await uploadPdfGroup(group.map((entry) => entry.pdf));

      for (const { note, pdf } of group) {
        const result = results.find((candidate) => candidate.fileName === pdf.fileName);
        if (!result) continue;
        changed = true;

        if (result.status === 'failed') {
          console.warn(`Note ${note.id} (${pdf.fileName}) was not uploaded: ${result.message}`);
          await markNoteUploadFailed(note.id, note.updatedAt, result.message);
        } else {
          // A duplicate ("skipped") is already on the server, which is all
          // that waiting was for.
          const outcome = result.status === 'completed' ? 'uploaded' : 'duplicate';
          console.log(
            result.status === 'completed'
              ? `Note ${note.id} uploaded as ${pdf.fileName} (file ${result.fileId ?? 'unknown'}).`
              : `Note ${note.id} (${pdf.fileName}) was already on the server: ${result.message ?? 'duplicate'}.`
          );
          await markNoteSynced(note.id, note.updatedAt, new Date().toISOString(), outcome);
          uploaded += 1;
        }
      }

      waiting = later;
      setUploading(waiting.map((note) => note.id));
    }
  } catch (error) {
    if (error instanceof SessionEndedError) return uploaded;
    if (error instanceof UnauthorizedError) {
      await endSession();
      return uploaded;
    }
    // Usually the connection going away; everything not yet up stays waiting
    // for the next time the user leaves a note or comes back online.
    console.warn('Notes stay on the device for now:', error);
  } finally {
    setUploading([]);
    if (changed) syncListeners.forEach((listener) => listener());
  }

  return uploaded;
}

/** `{firstname}_{lastname}_{patient_id}.pdf`, the name the web app's scans use. */
export function pdfFileName({ author }: StoredNote) {
  const part = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown';

  return `${part(author.firstName)}_${part(author.lastName)}_${part(author.hospitalId)}.pdf`;
}

/** The token was rejected mid-upload: sign out and land on the login screen. */
async function endSession() {
  await logout();
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
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
