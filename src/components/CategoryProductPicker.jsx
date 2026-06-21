import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Folder, Package, Search, X, ArrowLeft, Check, Plus } from 'lucide-react';
import { useT } from '../utils/translate';

const UNCAT = '__uncat__';   // kategoriyasiz mahsulotlar uchun virtual papka

/**
 * Mahsulotni kategoriya bo'yicha tanlash: bosilganda avval kategoriyalar (papka)
 * chiqadi, ustiga bosib ichiga kiriladi, so'ng mahsulot tanlanadi. Qidiruv esa
 * butun bazadan tekis (flat) izlaydi. Ekranni to'ldirmaydigan markaziy modal.
 *
 * Props: products, categories, value(productId), onChange(productId),
 *        placeholder, disabled, filter(product)=>bool
 */
export default function CategoryProductPicker({ products, categories = [], value, onChange, placeholder, disabled, filter, rootCategory, flat = false, multi = false }) {
  const t = useT();
  const ph = placeholder || t('picker.placeholder');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [path, setPath] = useState([]);   // [{_id, name}] — joriy kategoriya yo'li

  // multi mode: value is string[], onChange(id) toggles
  const selectedIds = multi ? new Set((value || []).map(String)) : null;

  // parent → bolalar kategoriyalar
  const childCats = useMemo(() => {
    const m = {};
    categories.forEach(c => {
      const pid = (c.parent?._id ?? c.parent ?? null);
      const key = pid ? String(pid) : 'root';
      (m[key] ||= []).push(c);
    });
    Object.values(m).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return m;
  }, [categories]);

  // rootCategory berilsa — browsing shu papka va uning ichki shoxlari bilan cheklanadi.
  const scopedIds = useMemo(() => {
    if (!rootCategory) return null;
    const set = new Set([String(rootCategory)]);
    const stack = [String(rootCategory)];
    while (stack.length) {
      const cur = stack.pop();
      (childCats[cur] || []).forEach(ch => { const id = String(ch._id); if (!set.has(id)) { set.add(id); stack.push(id); } });
    }
    return set;
  }, [rootCategory, childCats]);

  const list = useMemo(() => {
    let l = filter ? products.filter(filter) : products;
    if (scopedIds) l = l.filter(p => { const cid = (p.category?._id ?? p.category ?? null); return cid && scopedIds.has(String(cid)); });
    return l;
  }, [products, filter, scopedIds]);
  const selected = products.find(p => p._id === value);

  // kategoriya _id → shu kategoriyadagi mahsulotlar (to'g'ridan-to'g'ri)
  const prodByCat = useMemo(() => {
    const m = {};
    list.forEach(p => {
      const cid = (p.category?._id ?? p.category ?? null);
      const key = cid ? String(cid) : UNCAT;
      (m[key] ||= []).push(p);
    });
    return m;
  }, [list]);

  // kategoriya (va uning ichki shoxlari) bo'yicha mahsulot soni — papkada ko'rsatish uchun
  const subtreeCount = useMemo(() => {
    const memo = {};
    const calc = (cid) => {
      if (memo[cid] !== undefined) return memo[cid];
      let n = (prodByCat[cid] || []).length;
      (childCats[cid] || []).forEach(ch => { n += calc(String(ch._id)); });
      memo[cid] = n;
      return n;
    };
    categories.forEach(c => calc(String(c._id)));
    return memo;
  }, [categories, childCats, prodByCat]);

  const rootKey = rootCategory ? String(rootCategory) : 'root';
  const currentId = path.length ? String(path[path.length - 1]._id) : rootKey;
  const folders = childCats[currentId] || [];
  const directProducts = (path.length || rootCategory) ? (prodByCat[currentId] || []) : [];
  const rootUncat = (!path.length && !rootCategory) ? (prodByCat[UNCAT] || []) : [];

  // Qidiruvda — tekis natija
  const searchHits = q.trim()
    ? list.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(q.toLowerCase()))
    : null;

  const close = () => { setOpen(false); setQ(''); setPath([]); };
  const pick = (id) => {
    if (multi) { onChange(id); }        // multi: toggle, modal stays open
    else { onChange(id); close(); }     // single: pick and close
  };
  const enter = (cat) => { setPath(p => [...p, { _id: cat._id, name: cat.name }]); };
  const goTo = (idx) => setPath(p => p.slice(0, idx));   // breadcrumb

  return (
    <>
      {multi ? (
        <button type="button" onClick={() => !disabled && setOpen(true)} disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-primary-300 text-sm text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" />
          {ph}
        </button>
      ) : (
      <button type="button" onClick={() => !disabled && setOpen(true)} disabled={disabled}
        className="input text-left flex items-center justify-between gap-2 w-full disabled:opacity-60">
        <span className={selected ? 'text-ink truncate' : 'text-ink-disabled truncate'}>
          {selected ? selected.name : ph}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
      </button>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onMouseDown={close}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[80vh] flex flex-col"
            onMouseDown={e => e.stopPropagation()}>
            {/* Header + qidiruv */}
            <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus className="input pl-9 w-full" placeholder={t('picker.search')}
                  value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <button onClick={close} className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100 hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breadcrumb (qidiruvsiz, flat emas) */}
            {!searchHits && !flat && (
              <div className="px-4 py-2 border-b border-surface-100 flex items-center gap-1 text-sm flex-wrap shrink-0">
                {path.length > 0 && (
                  <button onClick={() => setPath(p => p.slice(0, -1))}
                    className="p-1 rounded text-ink-tertiary hover:bg-surface-100 hover:text-ink mr-1" title={t('catPicker.back')}>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => goTo(0)}
                  className={`px-1.5 py-0.5 rounded hover:bg-surface-100 ${path.length ? 'text-ink-secondary' : 'text-ink font-medium'}`}>
                  {t('catPicker.all')}
                </button>
                {path.map((c, i) => (
                  <React.Fragment key={c._id}>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />
                    <button onClick={() => goTo(i + 1)}
                      className={`px-1.5 py-0.5 rounded hover:bg-surface-100 truncate max-w-[160px] ${i === path.length - 1 ? 'text-ink font-medium' : 'text-ink-secondary'}`}>
                      {c.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="overflow-y-auto p-3 flex-1">
              {flat ? (
                (searchHits || list).length === 0 ? (
                  <p className="text-center text-sm text-ink-tertiary py-10">{t('picker.notFound')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(searchHits || list).map(p => <ProductCard key={p._id} p={p} active={multi ? selectedIds.has(String(p._id)) : p._id === value} onClick={() => pick(p._id)} multi={multi} />)}
                  </div>
                )
              ) : searchHits ? (
                searchHits.length === 0 ? (
                  <p className="text-center text-sm text-ink-tertiary py-10">{t('picker.notFound')}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {searchHits.map(p => <ProductCard key={p._id} p={p} active={multi ? selectedIds.has(String(p._id)) : p._id === value} onClick={() => pick(p._id)} multi={multi} />)}
                  </div>
                )
              ) : (
                <>
                  {folders.length === 0 && directProducts.length === 0 && rootUncat.length === 0 && (
                    <p className="text-center text-sm text-ink-tertiary py-10">{t('catPicker.empty')}</p>
                  )}
                  {/* Papkalar */}
                  {folders.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                      {folders.map(c => {
                        const cnt = subtreeCount[String(c._id)] || 0;
                        return (
                          <button key={c._id} onClick={() => enter(c)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50/40 text-left transition-colors">
                            <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-ink truncate">{c.name}</p>
                              <p className="text-[11px] text-ink-tertiary">{t('catPicker.count', { n: cnt })}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Mahsulotlar (joriy kategoriyadagi yoki rootdagi kategoriyasiz) */}
                  {(directProducts.length > 0 || rootUncat.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(path.length ? directProducts : rootUncat).map(p =>
                        <ProductCard key={p._id} p={p} active={multi ? selectedIds.has(String(p._id)) : p._id === value} onClick={() => pick(p._id)} multi={multi} />)}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Multi mode footer */}
            {multi && (
              <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between shrink-0">
                <span className="text-sm text-ink-secondary">
                  {selectedIds.size > 0 ? `${selectedIds.size} ta tanlandi` : 'Hech narsa tanlanmagan'}
                </span>
                <button type="button" onClick={close}
                  className="btn-primary px-4 py-1.5 text-sm rounded-lg">
                  Tayyor
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ProductCard({ p, active, onClick, multi }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${active ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-primary-300 hover:bg-surface-50'}`}>
      {multi ? (
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'border-primary-500 bg-primary-500' : 'border-surface-300'}`}>
          {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
      ) : (
        <Package className="w-4 h-4 text-ink-tertiary shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-sm text-ink truncate">{p.name}</p>
        {p.sku && <p className="text-[11px] text-ink-tertiary font-mono truncate">{p.sku}</p>}
      </div>
    </button>
  );
}
