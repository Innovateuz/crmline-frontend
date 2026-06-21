import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useT } from '../utils/translate';

// Universal chiroyli dropdown. Native <select> o'rniga.
//   options    — [{ value, label }] yoki [string]
//   value      — joriy qiymat
//   onChange   — (value) => void
//   searchable — true | false | 'auto' (default: variant 8+ bo'lsa qidiruv chiqadi)
//   size       — 'sm' | 'md' (default md)
// Jadval/scroll konteynerlarida kesilmasligi uchun menyu portal (fixed) orqali chiqadi.
export default function Dropdown({
  value, onChange, options = [], placeholder, disabled,
  className = '', searchable = 'auto', size = 'md', align = 'left',
}) {
  const t = useT();
  const norm = useMemo(
    () => (options || []).map(o => (typeof o === 'object' ? o : { value: o, label: String(o) })),
    [options]
  );
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const showSearch = searchable === true || (searchable === 'auto' && norm.length > 8);
  const selected = norm.find(o => String(o.value) === String(value));
  const triggerStyle = selected?.color ? { backgroundColor: selected.color + '1a', color: selected.color, borderColor: selected.color + '66' } : undefined;

  const position = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = Math.max(r.width, 160);
    const dropH = 280;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    if (spaceBelow < dropH && spaceAbove > spaceBelow) {
      setCoords({ left: r.left, bottom: window.innerHeight - r.top + 4, width: w, dir: 'up' });
    } else {
      setCoords({ left: r.left, top: r.bottom + 4, width: w, dir: 'down' });
    }
  };

  useEffect(() => {
    if (!open) return;
    position();
    const onScroll = () => position();
    const onClick = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { if (open && showSearch) setTimeout(() => searchRef.current?.focus(), 10); }, [open, showSearch]);
  useEffect(() => { if (!open) setQ(''); }, [open]);

  const filtered = q.trim()
    ? norm.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : norm;

  const pick = (v) => { onChange(v); setOpen(false); };

  const h = size === 'sm' ? 'h-8 text-xs' : 'text-sm';

  return (
    <>
      <button type="button" ref={btnRef} disabled={disabled} style={triggerStyle}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`input flex items-center justify-between gap-2 text-left ${h} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
        <span className={`truncate flex items-center gap-1.5 ${selected ? (selected.color ? 'font-medium' : 'text-ink') : 'text-ink-tertiary'}`}>
          {selected?.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
          {selected ? selected.label : (placeholder || t('common.selectPlaceholder'))}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-ink-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && coords && createPortal(
        <div ref={menuRef} style={{
          position: 'fixed',
          left:   align === 'right' ? undefined : coords.left,
          right:  align === 'right' ? (window.innerWidth - coords.left - coords.width) : undefined,
          top:    coords.dir === 'up'   ? undefined : coords.top,
          bottom: coords.dir === 'up'   ? coords.bottom : undefined,
          width:  coords.width,
        }}
          className="z-[80] bg-white rounded-xl shadow-lg border border-surface-100 py-1 max-h-64 overflow-y-auto animate-[fadeIn_0.12s_ease-out]">
          {showSearch && (
            <div className="px-2 pb-1.5 pt-0.5 sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary" />
                <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)}
                  placeholder={t('common.searchPlaceholder') || '...'}
                  className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-ink-tertiary text-center">{t('common.noResults') || '—'}</div>
          ) : filtered.map(o => {
            const active = String(o.value) === String(value);
            return (
              <button key={String(o.value)} type="button" onMouseDown={() => pick(o.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${active ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink hover:bg-surface-50'}`}>
                {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                <span className="flex-1 truncate">{o.label}</span>
                {active && <Check className="w-3.5 h-3.5 shrink-0 text-primary-600" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
