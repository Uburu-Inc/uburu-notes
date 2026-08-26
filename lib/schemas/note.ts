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
  /** When the note last reached the server; null while it is only on device. */
  syncedAt: z.string().nullable(),
});

export const storedNoteSchema = noteSummarySchema.extend({
  author: noteAuthorSchema,
  /** One SVG path per finished stroke, for redrawing the note on the canvas. */
  paths: z.array(z.string()),
  /** The same strokes as sampled points, which is what recognition needs. */
  strokes: z.array(inkStrokeSchema),
  createdAt: z.string(),
});

export type NoteSummary = z.infer<typeof noteSummarySchema>;
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
