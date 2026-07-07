import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../utils/translate';

// Sana(+vaqt) tanlash: "DD/MM/YYYY HH:mm" (yoki dateOnly bo'lsa "DD/MM/YYYY") mask.
//   dateOnly      — true bo'lsa soat ko'rsatilmaydi, mask faqat sana.
//   disableFuture — bugundan keyingi kunlarni bloklaydi (default: true).
//   disablePast   — bugundan oldingilarni bloklaydi (kelib tushish sanasi uchun).
const pad = n => String(n).padStart(2, '0');
const startOfDay = dt => { const x = new Date(dt); x.setHours(0, 0, 0, 0); return x; };

export default function DateTimePicker({ value, onChange, className = '', disabled, dateOnly = false, disableFuture = true, disablePast = false, minDate = null }) {
  const parseMask = (v) => {
    if (dateOnly) {
      const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
      const [, dd, mo, yy] = m;
      return { y: +yy, m: +mo - 1, d: +dd, hh: 0, mi: 0 };
    }
    const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, dd, mo, yy, hh, mi] = m;
    return { y: +yy, m: +mo - 1, d: +dd, hh: +hh, mi: +mi };
  };
  const buildMask = (y, m, d, hh, mi) => dateOnly
    ? `${pad(d)}/${pad(m + 1)}/${y}`
    : `${pad(d)}/${pad(m + 1)}/${y} ${pad(hh)}:${pad(mi)}`;
  const t = useT();
  // Yaroqsiz/topilmagan locale tag (masalan tarjima kaliti) toLocaleDateString'ni
  // crash qildirmasin — tekshirib, xato bo'lsa uz-UZ'ga qaytamiz.
  const locale = (() => {
    const tag = t('dashboardHome.dateLocale');
    try { new Intl.DateTimeFormat(tag); return tag; }
    catch { return 'uz-UZ'; }
  })();
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const now = new Date();
  const parsed = parseMask(value);
  const sel = parsed || { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), hh: now.getHours(), mi: now.getMinutes() };
  const [view, setView] = useState({ y: sel.y, m: sel.m });

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 380 && r.top > spaceBelow;
    setPos({
      left: Math.min(r.left, window.innerWidth - 300),
      top: openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
    });
  };

  useEffect(() => {
    if (!open) return;
    if (parsed) setView({ y: parsed.y, m: parsed.m });
    place();
    const onMove = () => place();
    const onClick = (e) => {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('mousedown', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const emit = (y, m, d, hh, mi) => onChange(buildMask(y, m, d, hh, mi));
  const pickDay = (d) => emit(view.y, view.m, d, sel.hh, sel.mi);
  const setTime = (hh, mi) => emit(sel.y, sel.m, sel.d, hh, mi);
  const setNow = () => { const n = new Date(); emit(n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes()); setView({ y: n.getFullYear(), m: n.getMonth() }); };

  // Oy gridi (dushanbadan boshlab)
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;                 // Mon=0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayStart = startOfDay(now);
  const weekdays = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' })); // 2024-01-01 = dushanba
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const prevMonth = () => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 });
  const nextMonth = () => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 });

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
        className={`input flex items-center gap-2 text-left ${className} disabled:opacity-60`}>
        <Calendar className="w-4 h-4 text-ink-tertiary shrink-0" />
        <span className={`font-mono ${parsed ? 'text-ink' : 'text-ink-disabled'}`}>{value || (dateOnly ? 'DD/MM/YYYY' : 'DD/MM/YYYY HH:MM')}</span>
      </button>

      {open && pos && createPortal(
        <div ref={panelRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: 290, zIndex: 80 }}
          className="bg-white border border-surface-200 rounded-xl shadow-modal p-3">
          {/* Oy boshqaruvi */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-ink capitalize">{monthLabel}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Hafta kunlari */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekdays.map((w, i) => <div key={i} className="text-center text-[10px] font-medium text-ink-tertiary uppercase py-1">{w}</div>)}
          </div>

          {/* Kunlar */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const cellDate = new Date(view.y, view.m, d);
              const cellStart = startOfDay(cellDate);
              const minStart = minDate ? startOfDay(new Date(minDate)) : null;
              const blocked = (disableFuture && cellStart > todayStart) || (disablePast && cellStart < todayStart) || (minStart && cellStart < minStart);
              const isSel = parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === d;
              const isToday = cellStart.getTime() === todayStart.getTime();
              return (
                <button key={d} type="button" disabled={blocked} onClick={() => pickDay(d)}
                  className={`h-8 rounded-lg text-sm font-medium transition-colors
                    ${isSel ? 'bg-primary-600 text-white' : blocked ? 'text-ink-disabled cursor-not-allowed' : 'text-ink hover:bg-surface-100'}
                    ${!isSel && isToday ? 'ring-1 ring-primary-300' : ''}`}>
                  {d}
                </button>
              );
            })}
          </div>

          {/* Vaqt (faqat dateOnly bo'lmasa) */}
          {!dateOnly && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
            <Clock className="w-4 h-4 text-ink-tertiary shrink-0" />
            <select className="input py-1 px-2 w-14 font-mono text-center appearance-none cursor-pointer" value={pad(sel.hh)} onChange={e => setTime(Number(e.target.value), sel.mi)}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={pad(h)}>{pad(h)}</option>)}
            </select>
            <span className="text-ink-tertiary font-mono">:</span>
            <select className="input py-1 px-2 w-14 font-mono text-center appearance-none cursor-pointer" value={pad(sel.mi)} onChange={e => setTime(sel.hh, Number(e.target.value))}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={pad(m)}>{pad(m)}</option>)}
            </select>
            <button type="button" onClick={setNow} className="ml-auto text-xs font-medium text-primary-600 hover:bg-primary-50 px-2 py-1 rounded-lg">
              {t('dtp.now')}
            </button>
          </div>
          )}

          <div className="flex justify-end mt-2">
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-medium text-ink-secondary hover:bg-surface-100 px-3 py-1.5 rounded-lg">
              {t('dtp.done')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
