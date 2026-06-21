// Markaziy sana formatlash — butun tizimda yagona DD.MM.YYYY (sana) va
// DD.MM.YYYY HH:mm (sana+vaqt) ko'rinishi. Locale'dan qat'i nazar nuqtali format.
const pad = (n) => String(n).padStart(2, '0');

export function formatDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
}

export function formatDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}
