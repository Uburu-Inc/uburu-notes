import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { interceptedFetch, SCANNER_BASE_URL, SessionEndedError } from '../../lib/fetch';
import { UnauthorizedError } from './scanner';

// Uploads app-generated PDFs to the scanner service through one upload session:
// init → batch presigned URLs → PUT each file to storage → confirm → complete.
// Scanner calls carry `Bearer` auth (added by the fetch interceptor); the PUTs
// to storage carry none, since the presigned URL holds its own credentials.

/** Files over this go up in parts, matching the web app. */
const MULTIPART_THRESHOLD = 10 * 1024 * 1024;

// Storage PUTs and confirm are retried on transient failures; everything else
// is left for the next sync, which starts a fresh session.
const STORAGE_ATTEMPTS = 3;
const CONFIRM_ATTEMPTS = 3;
const RETRY_DELAY = 1_000;

// A request on a dead connection must not hold the upload queue forever.
const REQUEST_TIMEOUT = 30_000;

export type DuplicatePolicy = 'SKIP' | 'REPLACE' | 'ERROR';

/** One PDF ready to send. `fileName` must be unique within the group. */
export type PdfUpload = {
  fileName: string;
  bytes: Uint8Array;
};

export type PdfUploadResult =
  | { fileName: string; status: 'completed'; fileId: string | null }
  | { fileName: string; status: 'skipped'; message: string | null }
  | { fileName: string; status: 'failed'; message: string };

type UploadFileMeta = {
  file_name: string;
  file_size: number;
  file_hash: string;
  use_multipart: boolean;
};

type MultipartPlan = {
  upload_id: string;
  chunk_size: number;
  part_urls: { part_number: number; url: string }[];
};

type BatchItem = {
  file_name: string;
  file_id?: string;
  action: 'UPLOAD' | 'MULTIPART' | 'SKIPPED' | 'ERROR';
  upload_url?: string;
  multipart?: MultipartPlan;
  error?: string;
};

/** SHA-256 of the raw PDF bytes, as lowercase hex — what the web single-scan flow sends. */
export function hashPdfBytes(bytes: Uint8Array) {
  return bytesToHex(sha256(bytes));
}

/**
 * Uploads a group of PDFs in one session and reports what happened to each.
 * A duplicate or a rejected file never stops the rest of the group. Throws only
 * when the session itself cannot be used (no connection, a rejected token).
 */
export async function uploadPdfGroup(
  pdfs: PdfUpload[],
  duplicatePolicy: DuplicatePolicy = 'SKIP'
): Promise<PdfUploadResult[]> {
  if (pdfs.length === 0) return [];

  const sessionId = await initUploadSession(pdfs.length, duplicatePolicy);

  const files: UploadFileMeta[] = pdfs.map((pdf) => ({
    file_name: pdf.fileName,
    file_size: pdf.bytes.length,
    file_hash: hashPdfBytes(pdf.bytes),
    use_multipart: pdf.bytes.length > MULTIPART_THRESHOLD,
  }));

  const items = await getBatchUrls(sessionId, files);
  const results: PdfUploadResult[] = [];

  for (const pdf of pdfs) {
    const item = items.find((candidate) => candidate.file_name === pdf.fileName);
    results.push(await uploadOne(sessionId, pdf, item));
  }

  await completeUploadSession(sessionId);
  return results;
}

async function uploadOne(
  sessionId: string,
  pdf: PdfUpload,
  item: BatchItem | undefined
): Promise<PdfUploadResult> {
  const { fileName } = pdf;

  if (!item) return { fileName, status: 'failed', message: 'The server did not accept this file.' };
  if (item.action === 'SKIPPED') return { fileName, status: 'skipped', message: item.error ?? null };
  if (item.action === 'ERROR') {
    return { fileName, status: 'failed', message: item.error ?? 'The server rejected this file.' };
  }

  try {
    if (item.action === 'UPLOAD' && item.upload_url) {
      await putToStorage(item.upload_url, pdf.bytes);
      if (item.file_id) await confirmUploadBestEffort(sessionId, item.file_id);
      return { fileName, status: 'completed', fileId: item.file_id ?? null };
    }

    if (item.action === 'MULTIPART' && item.multipart && item.file_id) {
      await uploadMultipart(sessionId, item.file_id, item.multipart, pdf.bytes);
      return { fileName, status: 'completed', fileId: item.file_id };
    }

    return { fileName, status: 'failed', message: 'The server sent no upload address.' };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof SessionEndedError) throw error;
    return {
      fileName,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Upload failed.',
    };
  }
}

export async function initUploadSession(
  expectedFiles: number,
  duplicatePolicy: DuplicatePolicy
): Promise<string> {
  const data = await scannerPost('upload/session/init', {
    duplicate_policy: duplicatePolicy,
    expected_files: expectedFiles,
  });
  const sessionId = data?.session_id;
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new Error('The server did not start an upload session.');
  }
  return sessionId;
}

export async function getBatchUrls(sessionId: string, files: UploadFileMeta[]) {
  const data = await scannerPost('upload/presigned-urls/batch', { session_id: sessionId, files });
  return Array.isArray(data?.results) ? (data.results as BatchItem[]) : [];
}

export async function completeUploadSession(sessionId: string) {
  await scannerPost('upload/session/complete', { session_id: sessionId });
}

/**
 * Tells the server a simple upload landed. Many backends learn this from
 * storage events anyway, so a failure here never fails the file.
 */
export async function confirmUploadBestEffort(sessionId: string, fileId: string) {
  for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt++) {
    try {
      await scannerPost('upload/confirm', { session_id: sessionId, file_id: fileId });
      return;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      // "Already confirmed" comes back as a 4xx and is as good as a success.
      if (error instanceof ScannerRequestError && error.status < 500) return;
      if (attempt < CONFIRM_ATTEMPTS) await wait(RETRY_DELAY * attempt);
    }
  }
}

/**
 * Sends the file in the parts the server planned, then asks it to stitch them
 * together. Any failure aborts the upload, so storage is not left holding a
 * half-finished one.
 */
async function uploadMultipart(
  sessionId: string,
  fileId: string,
  plan: MultipartPlan,
  bytes: Uint8Array
) {
  try {
    const parts: { part_number: number; etag: string }[] = [];

    for (const part of plan.part_urls) {
      const start = (part.part_number - 1) * plan.chunk_size;
      const end = Math.min(part.part_number * plan.chunk_size, bytes.length);
      const response = await putToStorage(part.url, bytes.subarray(start, end));

      const etag = response.headers.get('ETag');
      if (!etag) throw new Error(`Storage sent no ETag for part ${part.part_number}.`);
      parts.push({ part_number: part.part_number, etag });
    }

    parts.sort((a, b) => a.part_number - b.part_number);
    await scannerPost('upload/multipart/complete', {
      session_id: sessionId,
      file_id: fileId,
      upload_id: plan.upload_id,
      parts,
    });
  } catch (error) {
    await scannerPost('upload/multipart/abort', {
      session_id: sessionId,
      file_id: fileId,
      upload_id: plan.upload_id,
    }).catch(() => undefined);
    throw error;
  }
}

/**
 * PUTs bytes straight to a presigned storage URL, retrying network errors and
 * server-side failures. Plain fetch, not interceptedFetch, so no Authorization
 * header can ever be attached. A 403 means the URL has expired; the file stays
 * waiting and the next sync asks for a fresh one.
 */
async function putToStorage(url: string, bytes: Uint8Array): Promise<Response> {
  // An ArrayBuffer of exactly these bytes, which RN's fetch sends as-is; a
  // part is a view into the whole file, so it is copied out.
  const body = bytes.slice().buffer;
  let lastError: unknown;

  for (let attempt = 1; attempt <= STORAGE_ATTEMPTS; attempt++) {
    if (attempt > 1) await wait(RETRY_DELAY * (attempt - 1));

    let response: Response;
    try {
      response = await withTimeout((signal) =>
        fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body,
          signal,
        })
      );
    } catch (error) {
      lastError = error;
      continue;
    }

    if (response.ok) return response;
    if (response.status === 403) throw new Error('The upload link expired. It will be retried.');
    lastError = new Error(`Storage rejected the file (${response.status}).`);
    if (response.status < 500) break;
  }

  throw lastError instanceof Error ? lastError : new Error('Could not reach storage.');
}

class ScannerRequestError extends Error {
  constructor(readonly status: number) {
    super(`Something went wrong (${status}).`);
    this.name = 'ScannerRequestError';
  }
}

/** POSTs JSON to a scanner path and returns the body, unwrapped from `data`. */
async function scannerPost(path: string, body: unknown): Promise<any> {
  const response = await withTimeout((signal) =>
    interceptedFetch(`${SCANNER_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  );

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) throw new ScannerRequestError(response.status);

  const payload: any = await response.json().catch(() => null);
  return payload?.data ?? payload;
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT);
  try {
    return await run(abort.signal);
  } finally {
    clearTimeout(timer);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
