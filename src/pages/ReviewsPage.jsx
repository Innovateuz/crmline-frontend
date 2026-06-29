import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, QrCode, Trash2, Edit2, X, Download, Star, BarChart3, MessageSquareWarning, Check, Loader2, MapPin, RefreshCw, Search, ExternalLink } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PLATFORMS = [
  { type: 'google', label: 'Google' },
  { type: 'yandex', label: 'Yandex' },
  { type: '2gis',   label: '2GIS' },
  { type: 'tripadvisor', label: 'TripAdvisor' },
];

const publicUrl = (slug) => `${window.location.origin}/r/${slug}`;
const qrSrc = (slug, size = 240) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(publicUrl(slug))}`;

export default function ReviewsPage() {
  const [pages, setPages]       = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);   // page obyekti yoki 'new'
  const [qrPage, setQrPage]     = useState(null);
  const [googlePage, setGooglePage] = useState(null);
  const [tab, setTab]           = useState('pages'); // pages | feedback

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/reviews/pages`),
      axios.get(`${API_URL}/reviews/analytics`),
      axios.get(`${API_URL}/reviews/feedback`),
    ]).then(([p, a, f]) => {
      setPages(p.data.pages || []);
      setAnalytics(a.data);
      setFeedback(f.data.feedback || []);
    }).catch(() => toast.error('Yuklashda xato'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu sahifani o'chirasizmi?")) return;
    try { await axios.delete(`${API_URL}/reviews/pages/${id}`); load(); }
    catch { toast.error('Xato'); }
  };

  const markHandled = async (id) => {
    try { await axios.put(`${API_URL}/reviews/feedback/${id}/handled`); load(); }
    catch { toast.error('Xato'); }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Otzivlar</h1>
          <p className="text-sm text-ink-tertiary">QR orqali mijozlardan otziv yig'ing</p>
        </div>
        <button onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Yangi sahifa
        </button>
      </div>

      {/* Analitika */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat icon={QrCode}  label="Skanlar"     value={analytics.scans} />
          <Stat icon={Star}    label="Otziv kliki" value={analytics.clicks} />
          <Stat icon={BarChart3} label="Konversiya" value={`${analytics.conversionRate}%`} />
          <Stat icon={MessageSquareWarning} label="Yangi shikoyat" value={analytics.pendingFeedback} accent={analytics.pendingFeedback > 0} />
        </div>
      )}

      {/* Tablar */}
      <div className="flex gap-2 mb-4 border-b border-surface-200">
        {[['pages', 'Sahifalar'], ['feedback', `Ichki feedback (${feedback.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-primary-600 text-primary-600' : 'border-transparent text-ink-tertiary'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>
      ) : tab === 'pages' ? (
        pages.length === 0 ? (
          <Empty onCreate={() => setEditing('new')} />
        ) : (
          <div className="grid gap-3">
            {pages.map(p => (
              <div key={p._id} className="bg-white border border-surface-200 rounded-2xl p-4 flex items-center gap-4">
                <img src={qrSrc(p.slug, 80)} alt="QR" className="w-16 h-16 rounded-lg border border-surface-100" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">{p.name}</p>
                  <p className="text-xs text-ink-tertiary truncate">{publicUrl(p.slug)}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                    {(p.platforms || []).filter(x => x.enabled).map(x => (
                      <span key={x.type} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-ink-secondary">{x.type}</span>
                    ))}
                    {p.gating?.enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">gating</span>}
                    {p.google?.placeId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                        G {(p.google.rating || 0).toFixed(1)} · {p.google.total || 0}
                      </span>
                    )}
                    {p.yandex?.orgId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                        Y {(p.yandex.rating || 0).toFixed(1)} · {p.yandex.total || 0}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setGooglePage(p)} title="Google otzivlar" className="p-2 rounded-lg hover:bg-surface-100 text-ink-tertiary"><MapPin className="w-4 h-4" /></button>
                  <button onClick={() => setQrPage(p)}  title="QR" className="p-2 rounded-lg hover:bg-surface-100 text-ink-tertiary"><QrCode className="w-4 h-4" /></button>
                  <button onClick={() => setEditing(p)} title="Tahrir" className="p-2 rounded-lg hover:bg-surface-100 text-ink-tertiary"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p._id)} title="O'chirish" className="p-2 rounded-lg hover:bg-red-50 text-ink-tertiary hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-2">
          {feedback.length === 0 && <p className="text-center text-ink-tertiary py-10 text-sm">Hozircha ichki feedback yo'q</p>}
          {feedback.map(f => (
            <div key={f._id} className={`bg-white border rounded-xl p-3 ${f.handled ? 'border-surface-200 opacity-60' : 'border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-300'}`} />)}
                  <span className="text-xs text-ink-tertiary ml-2">{f.reviewPage?.name}</span>
                </div>
                {!f.handled && <button onClick={() => markHandled(f._id)} className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Ko'rib chiqildi</button>}
              </div>
              {f.text && <p className="text-sm text-ink mt-1.5">{f.text}</p>}
              {f.phone && <p className="text-xs text-ink-tertiary mt-1">📞 {f.phone}</p>}
            </div>
          ))}
        </div>
      )}

      {editing && <Editor page={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {qrPage  && <QrModal page={qrPage} onClose={() => setQrPage(null)} />}
      {googlePage && <GoogleModal page={googlePage} onClose={() => setGooglePage(null)} onChanged={load} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className={`bg-white border rounded-2xl p-3 ${accent ? 'border-amber-200' : 'border-surface-200'}`}>
      <div className="flex items-center gap-2 text-ink-tertiary text-xs"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-amber-600' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function Empty({ onCreate }) {
  return (
    <div className="text-center py-16 bg-white border border-dashed border-surface-300 rounded-2xl">
      <QrCode className="w-10 h-10 mx-auto mb-3 text-ink-disabled" />
      <p className="text-ink-secondary font-medium">Hali sahifa yo'q</p>
      <p className="text-sm text-ink-tertiary mb-4">Birinchi otziv sahifangizni yarating</p>
      <button onClick={onCreate} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold">Yangi sahifa</button>
    </div>
  );
}

function QrModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-ink-tertiary"><X className="w-5 h-5" /></button>
        <p className="font-semibold text-ink mb-1">{page.name}</p>
        <p className="text-xs text-ink-tertiary mb-4 break-all">{publicUrl(page.slug)}</p>
        <img src={qrSrc(page.slug, 280)} alt="QR" className="w-56 h-56 mx-auto rounded-xl border border-surface-200" />
        <a href={qrSrc(page.slug, 600)} download={`qr-${page.slug}.png`} target="_blank" rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold">
          <Download className="w-4 h-4" /> QR yuklab olish
        </a>
        <p className="text-[11px] text-ink-tertiary mt-3">Chop etib stolga qo'ying</p>
      </div>
    </div>
  );
}

function Stars({ value, size = 'w-3.5 h-3.5' }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-surface-300'}`} />
      ))}
    </span>
  );
}

function GoogleModal({ page, onClose, onChanged }) {
  const [google, setGoogle]   = useState(page.google?.placeId ? page.google : null);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState(null);   // null=qidirilmagan, []=topilmadi
  const [searching, setSearching] = useState(false);
  const [busy, setBusy]       = useState(false);   // link/sync/unlink
  const [cooldownMin, setCooldownMin] = useState(null);  // null = cooldown yo'q

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true); setResults(null);
    try {
      const { data } = await axios.get(`${API_URL}/reviews/google/search`, { params: { q: query.trim() } });
      setResults(data.results || []);
    } catch (e) {
      const msg = e.response?.data?.code === 'NO_API_KEY'
        ? 'Google API kaliti hali sozlanmagan (GOOGLE_PLACES_API_KEY)'
        : (e.response?.data?.message || 'Qidiruvda xato');
      toast.error(msg);
    } finally { setSearching(false); }
  };

  const link = async (placeId) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_URL}/reviews/pages/${page._id}/google/link`, { placeId });
      setGoogle(data.google); setResults(null); setQuery('');
      toast.success('Google joyi bog\'landi — otziv havolasi avtomatik to\'ldirildi');
      onChanged?.();
    } catch (e) { toast.error(e.response?.data?.message || 'Bog\'lashda xato'); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_URL}/reviews/pages/${page._id}/google/sync`);
      setGoogle(data.google);
      setCooldownMin(null);
      toast.success('Yangilandi');
      onChanged?.();
    } catch (e) {
      if (e.response?.data?.code === 'SYNC_COOLDOWN') {
        setCooldownMin(e.response.data.remainingMinutes);
      } else {
        toast.error(e.response?.data?.message || 'Yangilashda xato');
      }
    }
    finally { setBusy(false); }
  };

  const unlink = async () => {
    if (!window.confirm('Google bog\'lanishini uzasizmi?')) return;
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/reviews/pages/${page._id}/google`);
      setGoogle(null);
      toast.success('Uzildi');
      onChanged?.();
    } catch { toast.error('Xato'); }
    finally { setBusy(false); }
  };

  const syncedLabel = google?.syncedAt
    ? new Date(google.syncedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-ink flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> Google otzivlar — {page.name}</h2>
          <button onClick={onClose} className="text-ink-tertiary"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {!google ? (
            /* ── Bog'lanmagan: joy qidirish ── */
            <>
              <p className="text-sm text-ink-secondary">Biznesingizni Google Maps'da toping va bog'lang — reyting va otzivlar shu yerda ko'rinadi.</p>
              <div className="flex gap-2">
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  className="input flex-1" placeholder="Masalan: Caffe Bahor, Chilonzor Toshkent" autoFocus
                />
                <button onClick={search} disabled={searching || !query.trim()}
                  className="px-4 rounded-xl bg-primary-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              {results && results.length === 0 && (
                <p className="text-center text-ink-tertiary text-sm py-6">Hech narsa topilmadi — nomni aniqroq yozing</p>
              )}
              {results && results.length > 0 && (
                <div className="grid gap-2">
                  {results.map(r => (
                    <button key={r.placeId} onClick={() => link(r.placeId)} disabled={busy}
                      className="text-left bg-white border border-surface-200 rounded-xl p-3 hover:border-primary-400 transition disabled:opacity-50">
                      <p className="font-medium text-ink text-sm">{r.name}</p>
                      <p className="text-xs text-ink-tertiary truncate">{r.address}</p>
                      {r.total > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-secondary">
                          <Stars value={r.rating} size="w-3 h-3" /> {r.rating.toFixed(1)} · {r.total} otziv
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Bog'langan: reyting + otzivlar ── */
            <>
              <div className="bg-surface-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm">{google.name}</p>
                    <p className="text-xs text-ink-tertiary truncate">{google.address}</p>
                  </div>
                  {google.mapsUrl && (
                    <a href={google.mapsUrl} target="_blank" rel="noreferrer"
                      className="shrink-0 text-xs text-primary-600 flex items-center gap-1 hover:underline">
                      Xaritada <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-3xl font-bold text-ink">{(google.rating || 0).toFixed(1)}</span>
                  <div>
                    <Stars value={google.rating} />
                    <p className="text-xs text-ink-tertiary mt-0.5">{google.total || 0} ta otziv</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-tertiary">{syncedLabel ? `Yangilangan: ${syncedLabel}` : ''}</p>
                <div className="flex items-center gap-2">
                  {cooldownMin ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> {cooldownMin} daqiqadan so'ng
                    </span>
                  ) : (
                    <button onClick={sync} disabled={busy}
                      className="text-xs px-3 py-1.5 rounded-lg border border-surface-200 flex items-center gap-1.5 disabled:opacity-50">
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Yangilash
                    </button>
                  )}
                  <button onClick={unlink} disabled={busy}
                    className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">Uzish</button>
                </div>
              </div>

              <div className="grid gap-2">
                {(google.reviews || []).length === 0 && (
                  <p className="text-center text-ink-tertiary text-sm py-4">Otzivlar matni topilmadi</p>
                )}
                {(google.reviews || []).map((rv, i) => (
                  <div key={i} className="bg-white border border-surface-200 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      {rv.authorPhoto
                        ? <img src={rv.authorPhoto} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                        : <div className="w-6 h-6 rounded-full bg-surface-200" />}
                      <span className="text-sm font-medium text-ink">{rv.author || 'Foydalanuvchi'}</span>
                      <span className="text-xs text-ink-tertiary ml-auto">{rv.relativeTime}</span>
                    </div>
                    <div className="mt-1.5"><Stars value={rv.rating} size="w-3 h-3" /></div>
                    {rv.text && <p className="text-sm text-ink mt-1.5 whitespace-pre-line">{rv.text}</p>}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-tertiary text-center">Google Places API faqat oxirgi ~5 otzivni qaytaradi.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Editor({ page, onClose, onSaved }) {
  const [name, setName]         = useState(page?.name || '');
  const [headline, setHeadline] = useState(page?.headline || 'Bizni qanday baholaysiz?');
  const [gating, setGating]     = useState(page?.gating?.enabled ?? true);
  const [minStars, setMinStars] = useState(page?.gating?.minStars || 4);
  const [plats, setPlats]       = useState(() => {
    const existing = {};
    (page?.platforms || []).forEach(p => { existing[p.type] = p; });
    return PLATFORMS.map((pl, i) => ({
      type: pl.type,
      url: existing[pl.type]?.url || '',
      enabled: existing[pl.type]?.enabled ?? false,
      order: i,
    }));
  });
  const [saving, setSaving] = useState(false);

  // Google bog'lash holati (Editor ichida)
  const [linkedPlace, setLinkedPlace] = useState(
    page?.google?.placeId ? { placeId: page.google.placeId, name: page.google.name, address: page.google.address, rating: page.google.rating, total: page.google.total } : null
  );
  const [unlinkGoogle, setUnlinkGoogle] = useState(false);
  const [gQuery, setGQuery]     = useState('');
  const [gResults, setGResults] = useState(null);
  const [gSearching, setGSearching] = useState(false);
  const [showGSearch, setShowGSearch] = useState(false);

  // Yandex Business bog'lash holati (Editor ichida) — Google kabi qidiruv
  const [linkedYandex, setLinkedYandex] = useState(
    page?.yandex?.orgId ? { orgId: page.yandex.orgId, name: page.yandex.name, address: page.yandex.address } : null
  );
  const [unlinkYandexFlag, setUnlinkYandexFlag] = useState(false);
  const [yQuery, setYQuery]       = useState('');
  const [yResults, setYResults]   = useState(null);
  const [ySearching, setYSearching] = useState(false);
  const [showYSearch, setShowYSearch] = useState(false);

  const searchGoogle = async () => {
    if (!gQuery.trim()) return;
    setGSearching(true); setGResults(null);
    try {
      const { data } = await axios.get(`${API_URL}/reviews/google/search`, { params: { q: gQuery.trim() } });
      setGResults(data.results || []);
    } catch (e) {
      toast.error(e.response?.data?.code === 'NO_API_KEY' ? 'Google API kaliti sozlanmagan' : 'Qidiruvda xato');
    } finally { setGSearching(false); }
  };

  const selectPlace = (r) => {
    setLinkedPlace(r);
    setUnlinkGoogle(false);
    setShowGSearch(false);
    setGResults(null);
    setGQuery('');
    // Google URL ni platformalar ichiga avtomatik qo'shish
    const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${r.placeId}`;
    setPlats(prev => {
      const idx = prev.findIndex(p => p.type === 'google');
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, url: writeReviewUrl, enabled: true } : p);
      return [{ type: 'google', url: writeReviewUrl, enabled: true, order: 0 }, ...prev];
    });
  };

  const removePlace = () => {
    setLinkedPlace(null);
    setUnlinkGoogle(true);
    setPlats(prev => prev.map(p => p.type === 'google' ? { ...p, url: '', enabled: false } : p));
  };

  // Yandex funksiyalari — Google kabi Geosearch API qidirish
  const searchYandex = async () => {
    if (!yQuery.trim()) return;
    setYSearching(true); setYResults(null);
    try {
      const { data } = await axios.get(`${API_URL}/yandex/search`, { params: { q: yQuery.trim() } });
      setYResults(data.results || []);
    } catch (e) {
      toast.error(e.response?.data?.code === 'NO_SEARCH_KEY' ? 'Yandex API kaliti sozlanmagan' : 'Qidiruvda xato');
    } finally { setYSearching(false); }
  };

  const selectYandexOrg = (r) => {
    setLinkedYandex(r);
    setUnlinkYandexFlag(false);
    setShowYSearch(false);
    setYResults(null);
    setYQuery('');
    const writeUrl = `https://yandex.ru/maps/org/${r.orgId}/reviews`;
    setPlats(prev => {
      const idx = prev.findIndex(p => p.type === 'yandex');
      if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, url: writeUrl, enabled: true } : p);
      return [...prev, { type: 'yandex', url: writeUrl, enabled: true, order: 0 }];
    });
  };

  const removeYandex = () => {
    setLinkedYandex(null);
    setUnlinkYandexFlag(true);
    setPlats(prev => prev.map(p => p.type === 'yandex' ? { ...p, url: '', enabled: false } : p));
  };

  const setPlat = (type, field, val) => setPlats(prev => prev.map(p => p.type === type ? { ...p, [field]: val } : p));

  const save = async () => {
    if (!name.trim()) return toast.error('Nom kiriting');
    setSaving(true);
    const body = {
      name: name.trim(), headline,
      gating: { enabled: gating, minStars: Number(minStars) },
      platforms: plats.filter(p => p.url.trim()).map(p => ({ ...p, enabled: p.enabled && !!p.url.trim() })),
      ...(linkedPlace && (!page?.google?.placeId || page.google.placeId !== linkedPlace.placeId)
          ? { placeId: linkedPlace.placeId } : {}),
      ...(unlinkGoogle ? { unlinkGoogle: true } : {}),
      ...(linkedYandex && (!page?.yandex?.orgId || page.yandex.orgId !== linkedYandex.orgId)
          ? { yandexOrgId: linkedYandex.orgId } : {}),
      ...(unlinkYandexFlag ? { unlinkYandex: true } : {}),
    };
    try {
      if (page) await axios.put(`${API_URL}/reviews/pages/${page._id}`, body);
      else      await axios.post(`${API_URL}/reviews/pages`, body);
      onSaved();
    } catch (e) { toast.error(e.response?.data?.message || 'Xato'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-ink">{page ? 'Tahrirlash' : 'Yangi otziv sahifasi'}</h2>
          <button onClick={onClose} className="text-ink-tertiary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-ink-tertiary mb-1">Nom (filial)</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Chilonzor filiali" />
          </div>
          <div>
            <label className="block text-xs text-ink-tertiary mb-1">Sarlavha (mijoz ko'radi)</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} className="input" />
          </div>

          {/* Google Maps bog'lash — to'g'ridan-to'g'ri Editor ichida */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Google Maps</p>
            {linkedPlace ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{linkedPlace.name}</p>
                    <p className="text-xs text-ink-tertiary truncate">{linkedPlace.address}</p>
                    {linkedPlace.rating > 0 && (
                      <p className="text-xs text-emerald-700 mt-0.5">{linkedPlace.rating.toFixed(1)}★ · {linkedPlace.total} otziv</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => setShowGSearch(true)}
                      className="text-xs px-2 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-100">O'zgartirish</button>
                    <button type="button" onClick={removePlace}
                      className="text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50">Uzish</button>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1.5">Google otziv havolasi avtomatik to'ldirildi</p>
              </div>
            ) : (
              <button type="button" onClick={() => setShowGSearch(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-surface-300 text-sm text-ink-secondary hover:border-primary-400 hover:text-primary-600 transition">
                <MapPin className="w-4 h-4" /> Google Maps joyini bog'lash (URL avtomatik to'ladi)
              </button>
            )}

            {showGSearch && (
              <div className="mt-2 bg-surface-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={gQuery} onChange={e => setGQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchGoogle()}
                    className="input flex-1 text-sm" placeholder="Biznes nomini kiriting..." autoFocus />
                  <button type="button" onClick={searchGoogle} disabled={gSearching || !gQuery.trim()}
                    className="px-3 rounded-xl bg-primary-600 text-white disabled:opacity-50">
                    {gSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => { setShowGSearch(false); setGResults(null); setGQuery(''); }}
                    className="px-2 text-ink-tertiary hover:text-ink"><X className="w-4 h-4" /></button>
                </div>
                {gResults && gResults.length === 0 && (
                  <p className="text-xs text-center text-ink-tertiary py-2">Topilmadi — aniqroq yozing</p>
                )}
                {gResults && gResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-lg space-y-1 pr-0.5">
                    {gResults.map(r => (
                      <button key={r.placeId} type="button" onClick={() => selectPlace(r)}
                        className="w-full text-left bg-white border border-surface-200 rounded-lg px-3 py-2 hover:border-primary-400 transition">
                        <p className="text-sm font-medium text-ink">{r.name}</p>
                        <p className="text-xs text-ink-tertiary truncate">{r.address}</p>
                        {r.total > 0 && <p className="text-xs text-ink-tertiary mt-0.5">{r.rating.toFixed(1)}★ · {r.total} otziv</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Yandex Business bog'lash — Google kabi qidiruv */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Yandex Maps</p>
            {linkedYandex ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{linkedYandex.name}</p>
                    <p className="text-xs text-ink-tertiary truncate">{linkedYandex.address}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => setShowYSearch(true)}
                      className="text-xs px-2 py-1 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-100">O'zgartirish</button>
                    <button type="button" onClick={removeYandex}
                      className="text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50">Uzish</button>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1.5">Yandex otziv havolasi avtomatik to'ldirildi</p>
              </div>
            ) : (
              <button type="button" onClick={() => setShowYSearch(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-surface-300 text-sm text-ink-secondary hover:border-red-400 hover:text-red-600 transition">
                <MapPin className="w-4 h-4" /> Yandex Maps joyini bog'lash (URL avtomatik to'ladi)
              </button>
            )}
            {showYSearch && (
              <div className="mt-2 bg-surface-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={yQuery} onChange={e => setYQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchYandex()}
                    className="input flex-1 text-sm" placeholder="Biznes nomini kiriting..." autoFocus />
                  <button type="button" onClick={searchYandex} disabled={ySearching || !yQuery.trim()}
                    className="px-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                    {ySearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => { setShowYSearch(false); setYResults(null); setYQuery(''); }}
                    className="px-2 text-ink-tertiary hover:text-ink"><X className="w-4 h-4" /></button>
                </div>
                {yResults && yResults.length === 0 && (
                  <p className="text-xs text-center text-ink-tertiary py-2">Topilmadi — aniqroq yozing</p>
                )}
                {yResults && yResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto rounded-lg space-y-1 pr-0.5">
                    {yResults.map(r => (
                      <button key={r.orgId} type="button" onClick={() => selectYandexOrg(r)}
                        className="w-full text-left bg-white border border-surface-200 rounded-lg px-3 py-2 hover:border-emerald-400 transition">
                        <p className="text-sm font-medium text-ink">{r.name}</p>
                        <p className="text-xs text-ink-tertiary truncate">{r.address}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Platformalar va havolalar</p>
            <div className="space-y-2">
              {plats.map(p => {
                const isGoogleLinked = p.type === 'google' && (linkedPlace || page?.google?.placeId);
                return (
                  <div key={p.type} className="flex items-center gap-2">
                    <input type="checkbox" checked={p.enabled} onChange={e => setPlat(p.type, 'enabled', e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm w-20 shrink-0">{PLATFORMS.find(x => x.type === p.type).label}</span>
                    <div className="flex-1 relative">
                      <input value={p.url} onChange={e => setPlat(p.type, 'url', e.target.value)}
                        className="input text-sm w-full"
                        placeholder={p.type === 'google' ? 'Google joyi bog\'lansa avtomatik to\'ladi' : 'otziv havolasi (URL)'} />
                      {isGoogleLinked && p.url && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded pointer-events-none">auto</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-50 rounded-xl p-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Aqlli yo'naltirish (gating)</span>
              <input type="checkbox" checked={gating} onChange={e => setGating(e.target.checked)} className="w-4 h-4" />
            </label>
            <p className="text-xs text-ink-tertiary mt-1">Yuqori baho → xaritaga; past baho → ichki feedback</p>
            {gating && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-ink-tertiary">Ommaga yuborish chegarasi:</span>
                <select value={minStars} onChange={e => setMinStars(e.target.value)} className="input w-auto text-sm py-1">
                  <option value={4}>4★ va yuqori</option>
                  <option value={5}>faqat 5★</option>
                  <option value={3}>3★ va yuqori</option>
                </select>
              </div>
            )}
            <p className="text-[11px] text-amber-600 mt-2">⚠️ Google "review gating"ni taqiqlaydi — kerak bo'lmasa o'chiring.</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-surface-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-medium">Bekor</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
