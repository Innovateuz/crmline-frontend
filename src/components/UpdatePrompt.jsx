import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useT } from '../utils/translate';

// Har deploy'da CRA build hashlangan fayl nomlarini (asset-manifest.json) o'zgartiradi.
// Shu faylni davriy tekshirib, o'zgargan bo'lsa — yangi versiya chiqqanini bilamiz va
// pastda ishni to'xtatmaydigan ogohlantirish ko'rsatamiz ("Yangilash" yoki yopish).
const MANIFEST = `${process.env.PUBLIC_URL || ''}/asset-manifest.json`;
const POLL_MS = 60 * 1000;

async function fetchVersion() {
  const res = await fetch(`${MANIFEST}?_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest fetch failed');
  const data = await res.json();
  // entrypoints (hashlangan bundle ro'yxati) eng ishonchli imzo; bo'lmasa — butun manifest.
  return JSON.stringify(data.entrypoints || data.files || data);
}

export default function UpdatePrompt() {
  const t = useT();
  const baseline = useRef(null);   // ilk yuklanishdagi versiya imzosi
  const [show, setShow] = useState(false);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const v = await fetchVersion();
        if (stopped) return;
        if (baseline.current == null) { baseline.current = v; return; }
        if (v !== baseline.current) { baseline.current = v; setShow(true); }
      } catch { /* tarmoq xatosi — jim o'tkazamiz */ }
    };
    check();
    const id = setInterval(check, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[95] flex justify-center sm:justify-end pointer-events-none">
      <div className="pointer-events-auto bg-ink text-white rounded-xl shadow-lg ring-1 ring-black/10 px-3.5 py-2.5 flex items-center gap-3 max-w-sm animate-[fadeIn_.2s_ease-out]">
        <RefreshCw className="w-4 h-4 text-primary-300 shrink-0" />
        <div className="text-sm leading-tight">
          <p className="font-medium">{t('update.title')}</p>
          <p className="text-white/60 text-xs">{t('update.subtitle')}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
          {t('update.action')}
        </button>
        <button
          onClick={() => setShow(false)}
          title={t('update.dismiss')}
          className="shrink-0 text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
