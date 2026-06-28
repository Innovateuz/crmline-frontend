import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, QrCode, Trash2, Edit2, X, Download, Star, BarChart3, MessageSquareWarning, Check, Loader2 } from 'lucide-react';

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
                  <div className="flex gap-1 mt-1.5">
                    {(p.platforms || []).filter(x => x.enabled).map(x => (
                      <span key={x.type} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-ink-secondary">{x.type}</span>
                    ))}
                    {p.gating?.enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">gating</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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

  const setPlat = (type, field, val) => setPlats(prev => prev.map(p => p.type === type ? { ...p, [field]: val } : p));

  const save = async () => {
    if (!name.trim()) return toast.error('Nom kiriting');
    setSaving(true);
    const body = {
      name: name.trim(), headline,
      gating: { enabled: gating, minStars: Number(minStars) },
      platforms: plats.filter(p => p.url.trim()).map(p => ({ ...p, enabled: p.enabled && !!p.url.trim() })),
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

          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase mb-2">Platformalar va havolalar</p>
            <div className="space-y-2">
              {plats.map(p => (
                <div key={p.type} className="flex items-center gap-2">
                  <input type="checkbox" checked={p.enabled} onChange={e => setPlat(p.type, 'enabled', e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm w-20 shrink-0">{PLATFORMS.find(x => x.type === p.type).label}</span>
                  <input value={p.url} onChange={e => setPlat(p.type, 'url', e.target.value)}
                    className="input text-sm flex-1" placeholder="otziv havolasi (URL)" />
                </div>
              ))}
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
