export function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value).replace('T', ' ');
  return text.length >= 19 ? text.slice(0, 19) : text;
}

export function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

/** Convert a datetime-local input value (minutes) to the backend ISO format. */
export function toApiDateTime(value) {
  if (!value) return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  return text;
}

/** Current local time formatted for a datetime-local input. */
export function nowLocalInputValue() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return [
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  ].join('T');
}

export function initialOf(name) {
  const text = (name || '').trim();
  return text ? text.slice(0, 1) : '访';
}
