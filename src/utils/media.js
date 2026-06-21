// Yuklangan media (rasm/fayl) URL'ini joriy API origin'iga moslaydi.
// Backend nisbiy "/api/upload/raw/<key>" qaytaradi — bu yerda to'liq URL quriladi.
// Eski, host muzlatilgan absolyut URL'lar (masalan localhost:5001/api/upload/raw/...)
// ham joriy origin'ga qayta moslanadi — shunda boshqa qurilma/portda ham ochiladi.
const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const ORIGIN = API.replace(/\/api\/?$/, '');   // masalan: http://localhost:5001

export function mediaUrl(u) {
  if (!u || typeof u !== 'string') return u || '';
  const marker = '/api/upload/raw/';
  const idx = u.indexOf(marker);
  if (idx !== -1) return ORIGIN + u.slice(idx);
  return u;
}

export function mediaDownloadUrl(u) {
  const base = mediaUrl(u);
  if (!base) return base;
  return base + (base.includes('?') ? '&' : '?') + 'dl=1';
}
