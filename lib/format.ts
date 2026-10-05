// Display formatting for values that arrive from the API as raw strings/numbers.

/** "12 Mar 2026, 14:05"; an unreadable date passes through as sent. */
export function formatDateTime(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${formatDate(iso)}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/** "12 Mar 2026"; an unreadable date passes through as sent. */
export function formatDate(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Bytes as megabytes, "2.41 MB". */
export function formatFileSize(bytes: number | string) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

/** "confirmed" → "Confirmed", "pending_review" → "Pending review". */
export function humanize(value: string) {
  const text = value.replace(/_/g, ' ').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}
