import type { ZodError } from 'zod';

type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;

/** Maps the first Zod issue per field into a simple error object for form widgets. */
export function fieldErrorsFromZod<T extends Record<string, unknown>>(
  error: ZodError<T>
): FieldErrors<T> {
  const errors: FieldErrors<T> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || errors[field as keyof T]) continue;
    errors[field as keyof T] = issue.message;
  }

  return errors;
}
