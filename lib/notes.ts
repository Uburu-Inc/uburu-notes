import { Directory, File, Paths } from 'expo-file-system';
import type { SkPath } from '@shopify/react-native-skia';

import { PAGE_COLOR, STROKE_COLOR, STROKE_WIDTH } from './theme';

const NOTES_DIRECTORY = 'notes';

export function getNotesDirectory() {
  const directory = new Directory(Paths.document, NOTES_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

// Local time, filesystem-safe, and sorts chronologically as a plain string.
function timestampForFileName(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSvg(paths: SkPath[], width: number, height: number) {
  const strokes = paths
    .map(
      (path) =>
        `  <path d="${escapeXml(path.toSVGString())}" fill="none" stroke="${STROKE_COLOR}" ` +
        `stroke-width="${STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="100%" height="100%" fill="${PAGE_COLOR}"/>`,
    strokes,
    '</svg>',
    '',
  ].join('\n');
}

export type SaveResult = {
  baseName: string;
  txtUri: string;
  folderUri: string;
  isSharedLocation: boolean;
};

type SaveArgs = {
  text: string;
  svg?: string;
};

// Scoped storage refuses access to the root of internal storage, so opening the
// picker there just shows "Can't use this folder". Starting inside Documents
// gives the user somewhere they are actually allowed to grant.
const ANDROID_DOCUMENTS_URI =
  'content://com.android.externalstorage.documents/document/primary%3ADocuments';

const FOLDER_MEMO_FILE = 'save-folder.txt';

function folderMemo() {
  return new File(getNotesDirectory(), FOLDER_MEMO_FILE);
}

function rememberFolder(uri: string) {
  try {
    const memo = folderMemo();
    memo.create({ overwrite: true });
    memo.write(uri);
  } catch (error) {
    console.warn('Could not remember the save folder:', error);
  }
}

function recallFolder(): Directory | null {
  try {
    const memo = folderMemo();
    if (!memo.exists) return null;
    const uri = memo.textSync().trim();
    return uri ? new Directory(uri) : null;
  } catch (error) {
    console.warn('Could not read the remembered save folder:', error);
    return null;
  }
}

export function forgetFolder() {
  try {
    const memo = folderMemo();
    if (memo.exists) memo.delete();
  } catch (error) {
    console.warn('Could not clear the remembered save folder:', error);
  }
}

/** Prompts for a folder, starting somewhere scoped storage actually allows. */
export async function pickSaveFolder() {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync(ANDROID_DOCUMENTS_URI);
  } catch {
    // Some devices reject the initial-location hint; fall back to a plain prompt.
    directory = await Directory.pickDirectoryAsync();
  }
  rememberFolder(directory.uri);
  return directory;
}

function writeInto(directory: Directory, { text, svg }: SaveArgs, isShared: boolean): SaveResult {
  const baseName = timestampedBaseName();

  const txtFile = directory.createFile(`${baseName}.txt`, 'text/plain');
  txtFile.write(text);

  // Keep the original ink beside the transcription so a misread note isn't lost.
  if (svg) {
    directory.createFile(`${baseName}.svg`, 'image/svg+xml').write(svg);
  }

  return {
    baseName,
    txtUri: txtFile.uri,
    folderUri: directory.uri,
    isSharedLocation: isShared,
  };
}

/**
 * Writes the note to the folder chosen previously, only prompting when there
 * isn't one yet or the old grant no longer works.
 */
export async function saveTextNote(args: SaveArgs): Promise<SaveResult> {
  const remembered = recallFolder();
  if (remembered) {
    try {
      return writeInto(remembered, args, true);
    } catch (error) {
      console.warn('Remembered folder is no longer writable, asking again:', error);
      forgetFolder();
    }
  }

  return writeInto(await pickSaveFolder(), args, true);
}

/** Last resort when no folder can be granted: app-private storage. */
export function saveTextNoteToAppStorage({ text, svg }: SaveArgs): SaveResult {
  const directory = getNotesDirectory();
  const baseName = timestampedBaseName();

  const txtFile = new File(directory, `${baseName}.txt`);
  txtFile.create({ overwrite: true });
  txtFile.write(text);

  if (svg) {
    const svgFile = new File(directory, `${baseName}.svg`);
    svgFile.create({ overwrite: true });
    svgFile.write(svg);
  }

  return {
    baseName,
    txtUri: txtFile.uri,
    folderUri: directory.uri,
    isSharedLocation: false,
  };
}

function timestampedBaseName() {
  return `Note_${timestampForFileName(new Date())}`;
}
