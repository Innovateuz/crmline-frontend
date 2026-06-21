import { useSelector } from 'react-redux';
import uz from '../locales/uz';
import uzCyrl from '../locales/uz-cyrl';
import ru from '../locales/ru';
import en from '../locales/en';

// Supported UI languages. `uz` = Uzbek Latin (also the fallback source),
// `uz-cyrl` = Uzbek Cyrillic, `ru` = Russian, `en` = English.
export const LANGS = ['uz', 'uz-cyrl', 'ru', 'en'];
export const DEFAULT_LANG = 'uz';

const translations = { uz, 'uz-cyrl': uzCyrl, ru, en };

// Resolve a key against a translations object. Supports both flat keys
// ('save') and dotted paths ('login_page.server') so files can be organised
// either way without breaking callers.
function resolve(obj, key) {
  if (obj == null) return undefined;
  if (obj[key] !== undefined) return obj[key];            // flat fast-path
  return key.split('.').reduce(
    (acc, part) => (acc == null ? undefined : acc[part]),
    obj
  );
}

// Look up a translation. Fallback chain: requested lang → uz (Latin) → the key
// itself (so a missing key shows the key, never `undefined`).
export const t = (key, lang = DEFAULT_LANG) => {
  const hit = resolve(translations[lang], key);
  if (hit !== undefined) return hit;
  const fb = resolve(translations[DEFAULT_LANG], key);
  return fb !== undefined ? fb : key;
};

// Hook: returns a `t(key, vars?)` bound to the current UI language from Redux.
// `vars` does simple {name}-style interpolation, e.g. t('greet', { name }).
export function useT() {
  const lang = useSelector((s) => s.lang?.current) || DEFAULT_LANG;
  return (key, vars) => {
    let str = t(key, lang);
    if (vars && typeof str === 'string') {
      str = str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    }
    return str;
  };
}
