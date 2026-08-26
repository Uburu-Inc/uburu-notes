import { z } from 'zod';

export const noteAuthorSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name'),
  middleName: z.string().trim().min(1, 'Enter a middle name'),
  lastName: z.string().trim().min(1, 'Enter a last name'),
  hospitalId: z.string().trim().min(1, 'Enter a hospital ID'),
});

export type NoteAuthorFormValues = z.infer<typeof noteAuthorSchema>;

/** "Ada Byron Lovelace", in the order the form asks for the three parts. */
export function formatAuthorName({ firstName, middleName, lastName }: NoteAuthorFormValues) {
  return [firstName, middleName, lastName].join(' ');
}

/** The two lines that identify whose note this is, for the top of an export. */
export function noteHeading(author: NoteAuthorFormValues) {
  return `${formatAuthorName(author)}\nHospital ID: ${author.hospitalId}`;
}
