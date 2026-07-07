// Per-organization theming. A single brand hex is expanded into a 50–900
// palette and pushed into the --p-* CSS variables that Tailwind's `primary`
// colors reference. Passing a falsy color restores the default (green).

const SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

// Mix ratios toward white (light shades) / black (dark shades), with 600 = base.
const MIX = {
  50: ['#ffffff', 0.92], 100: ['#ffffff', 0.84], 200: ['#ffffff', 0.68],
  300: ['#ffffff', 0.5], 400: ['#ffffff', 0.28], 500: ['#ffffff', 0.12],
  600: null,
  700: ['#000000', 0.18], 800: ['#000000', 0.34], 900: ['#000000', 0.48],
};

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Returns { 50: [r,g,b], ... } derived from a base hex (treated as the 600 shade).
export function buildScale(hex) {
  const base = hexToRgb(hex);
  if (!base) return null;
  const out = {};
  for (const k of SHADE_KEYS) {
    const m = MIX[k];
    out[k] = m ? mix(base, hexToRgb(m[0]), m[1]) : base;
  }
  return out;
}

// Apply a brand color to the document. Falsy → reset to the default palette.
// solid=true → sidebar/topbar (primary-700..900) tanlangan ASL rangда ko'rinadi
// (to'q soyaga aylantirilmaydi); faqat 900 ozgina quyuqlashtiriladi (chuqurlik uchun).
export function applyTheme(brandColor, solid = false) {
  const root = document.documentElement;
  if (!brandColor) {
    SHADE_KEYS.forEach(k => root.style.removeProperty(`--p-${k}`));
    setThemeColorMeta(null);
    return;
  }
  const scale = buildScale(brandColor);
  if (!scale) return;
  if (solid) {
    const base = scale[600];
    scale[700] = base;
    scale[800] = base;
    scale[900] = mix(base, [0, 0, 0], 0.12);
  }
  SHADE_KEYS.forEach(k => root.style.setProperty(`--p-${k}`, scale[k].join(' ')));
  // PWA status-bar — sidebar/topbar foniga (700-soya; solid'da asl rang) moslaymiz.
  setThemeColorMeta(scale[700]);
}

// Mobil/PWA status-bar rangini (meta theme-color) berilgan RGB ga moslaydi.
// Default — brand 700 (#3083cd), index.html dagi qiymatga mos.
function setThemeColorMeta(rgb) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', rgb ? `rgb(${rgb.join(' ')})` : '#3083cd');
}
