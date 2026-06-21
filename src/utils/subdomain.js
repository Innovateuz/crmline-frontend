// Joriy hostdan tashkilot "server"/slug subdomenini aniqlaydi.
//   nimadir.erpline.uz → "nimadir"
//   erpline.uz (apex), www.erpline.uz, localhost, IP → null (qo'lda kiritiladi)
//
// Agar REACT_APP_ROOT_DOMAIN berilsa (masalan "erpline.uz"), faqat o'sha domen
// ostidagi subdomen olinadi — bu aniqroq (ko'p bo'lakli subdomenlar uchun ham).
// Berilmasa, evristika: kamida 3 bo'lak bo'lsa, birinchi bo'lak subdomen.
export function detectSlug() {
  if (typeof window === 'undefined') return null;
  const host = (window.location.hostname || '').toLowerCase();
  // Sof IP manzil yoki sof "localhost" — subdomen yo'q (qo'lda kiritiladi)
  if (!host || host === 'localhost' || /^[\d.]+$/.test(host)) return null;

  // Dev test uchun: "acme.localhost" → "acme" (brauzer *.localhost ni 127.0.0.1 ga
  // o'zi yechadi, hosts fayl shart emas).
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -('.localhost'.length)).split('.')[0];
    return sub && sub !== 'www' ? sub : null;
  }

  const root = (process.env.REACT_APP_ROOT_DOMAIN || '').toLowerCase().replace(/^\./, '');
  if (root && host !== root && host.endsWith('.' + root)) {
    const sub = host.slice(0, -(root.length + 1)); // ".erpline.uz" qismini kesib tashlaymiz
    const first = sub.split('.')[0];
    return first && first !== 'www' ? first : null;
  }

  const parts = host.split('.');
  if (parts.length < 3) return null; // sub.domain.tld bo'lishi kerak
  const sub = parts[0];
  return sub && sub !== 'www' ? sub : null;
}
