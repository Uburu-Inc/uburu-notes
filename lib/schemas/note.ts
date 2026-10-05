import { z } from 'zod';

import { noteAuthorSchema } from './note-author';

const inkPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  t: z.number().optional(),
});

const inkStrokeSchema = z.object({
  points: z.array(inkPointSchema),
});

/** What the note list needs, without dragging every stroke into memory. */
export const noteSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  hospitalId: z.string(),
  /** Last recognised text, empty when the ink has never been read. */
  preview: z.string(),
  strokeCount: z.number(),
  updatedAt: z.string(),
  /**
   * When the note last reached the server; null while it is only on device.
   * The index entry is the one kept current — a stored note's own copy is not
   * rewritten when an upload lands.
   */
  syncedAt: z.string().nullable(),
  /**
   * Why the last upload of this version failed, for the list to show; absent
   * once it uploads or is edited again. Lives on the index entry only.
   */
  uploadError: z.string().nullable().optional(),
  /**
   * How the last upload landed: sent as a new file, or found already on the
   * server (a duplicate the server skipped). Absent until the first upload.
   */
  uploadResult: z.enum(['uploaded', 'duplicate']).nullable().optional(),
});

const notePageSchema = z.object({
  /** One SVG path per finished stroke, for redrawing the page on the canvas. */
  paths: z.array(z.string()),
  /**
   * The same strokes as sampled points, which is what recognition needs. In
   * page coordinates: y runs down the whole page, including any part that was
   * scrolled off screen when it was written.
   */
  strokes: z.array(inkStrokeSchema),
});

const storedNoteShape = noteSummarySchema.extend({
  author: noteAuthorSchema,
  /** In order. A note always has at least one, even if it is blank. */
  pages: z.array(notePageSchema).min(1),
  createdAt: z.string(),
});

/**
 * Notes saved before pages existed kept their one page's `paths` and `strokes`
 * at the top level. They are read as a note with a single page, so they open
 * as they always did and are saved in the new shape the next time they change.
 */
export const storedNoteSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null || 'pages' in raw) return raw;

  const { paths, strokes, ...rest } = raw as Record<string, unknown>;
  return { ...rest, pages: [{ paths, strokes }] };
}, storedNoteShape);

export type NoteSummary = z.infer<typeof noteSummarySchema>;
export type NotePage = z.infer<typeof notePageSchema>;
export type StoredNote = z.infer<typeof storedNoteSchema>;

export function summaryOf({
  id,
  name,
  hospitalId,
  preview,
  strokeCount,
  updatedAt,
  syncedAt,
}: StoredNote): NoteSummary {
  return { id, name, hospitalId, preview, strokeCount, updatedAt, syncedAt };
}
