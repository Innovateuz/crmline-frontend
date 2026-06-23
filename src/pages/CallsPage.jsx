import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCalls, invalidateCalls, updateCallItem, removeCallItems } from '../store/callsSlice';
import axios from 'axios';
import { useT } from '../utils/translate';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Loader2, Play, Pause, User, Search, Trash2, X, Check,
  BarChart2, List, Link2, ChevronDown, TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

/* ─── Helpers ────────────────────────────────────────────── */
function fmtPhone(p) {
  if (!p) return '—';
  const s = String(p);
  if (s.length === 12) return `+${s.slice(0,3)} (${s.slice(3,5)}) ${s.slice(5,8)}-${s.slice(8,10)}-${s.slice(10)}`;
  return `+${s}`;
}
function fmtDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2,'0')}` : `${sec}s`;
}
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

/* ─── Audio Player ───────────────────────────────────────── */
function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  if (!url) return <span className="text-xs text-ink-disabled">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
      <button onClick={toggle}
        className="w-7 h-7 rounded-full bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <span className="text-xs text-ink-tertiary">Yozuv</span>
    </div>
  );
}

const STATUS_MAP = {
  ringing:   { labelKey: 'calls.ringing',   cls: 'bg-amber-50 text-amber-600'     },
  active:    { labelKey: 'calls.completed', cls: 'bg-emerald-50 text-emerald-600' },
  completed: { labelKey: 'calls.completed', cls: 'bg-surface-100 text-ink-tertiary' },
  missed:    { labelKey: 'calls.missed',    cls: 'bg-red-50 text-red-600'         },
  cancelled: { labelKey: 'calls.busy',      cls: 'bg-surface-100 text-ink-disabled' },
};

function DirectionIcon({ dir, status }) {
  if (status === 'missed' || status === 'cancelled') return <PhoneMissed className="w-4 h-4 text-red-400" />;
  if (dir === 'out') return <PhoneOutgoing className="w-4 h-4 text-blue-400" />;
  return <PhoneIncoming className="w-4 h-4 text-emerald-400" />;
}

const DATE_FILTERS = [
  { key: '', label: 'Hammasi' },
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy' },
];

function getDateRange(key) {
  const now = new Date();
  if (key === 'today') { const s = new Date(now); s.setHours(0,0,0,0); return { from: s.toISOString(), to: now.toISOString() }; }
  if (key === 'week')  { const s = new Date(now); s.setDate(now.getDate() - now.getDay() + 1); s.setHours(0,0,0,0); return { from: s.toISOString(), to: now.toISOString() }; }
  if (key === 'month') { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { from: s.toISOString(), to: now.toISOString() }; }
  return {};
}

/* ─── Mini bar chart (inline SVG) ───────────────────────── */
function BarChart({ data, height = 80 }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const W = 600, H = height, barW = Math.max(4, Math.floor(W / data.length) - 2), gap = Math.floor(W / data.length);

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: H + 20 }}>
      {data.map((d, i) => {
        const totalH  = Math.round((d.total   / maxVal) * H);
        const missedH = Math.round((d.missed  / maxVal) * H);
        const x = i * gap + (gap - barW) / 2;
        return (
          <g key={d.key}>
            {/* total bar */}
            <rect x={x} y={H - totalH} width={barW} height={totalH} rx={2} fill="#dbeafe" />
            {/* missed overlay */}
            {d.missed > 0 && (
              <rect x={x} y={H - missedH} width={barW} height={missedH} rx={2} fill="#fca5a5" />
            )}
            {/* label — show every 2nd or every 7th for readability */}
            {(data.length <= 10 || i % Math.ceil(data.length / 10) === 0) && (
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">
                {d.key}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Analytics Panel ────────────────────────────────────── */
function AnalyticsPanel({ dateFilter }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/atc/analytics`, { params: { dateFilter: dateFilter || 'week' } })
      .then(r => setData(r.data))
      .catch(() => toast.error('Analitika yuklanmadi'))
      .finally(() => setLoading(false));
  }, [dateFilter]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary-400" /></div>;
  if (!data)   return null;

  const fmtDur = (s) => { if (!s) return '0s'; const m = Math.floor(s/60); return m ? `${m}d ${s%60}s` : `${s}s`; };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Jami qo'ng'iroqlar", value: data.total, color: 'text-ink' },
          { label: 'Gaplashildi',         value: data.completed, color: 'text-emerald-600' },
          { label: "O'tkazib yuborildi",  value: data.missed,    color: 'text-red-500' },
          { label: "O'tkazib yuborilganlar %", value: `${data.missedPct}%`, color: data.missedPct > 30 ? 'text-red-500' : 'text-amber-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-surface-200 rounded-2xl p-4">
            <p className="text-xs text-ink-tertiary mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Avg duration */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p className="text-xs text-ink-tertiary">O'rtacha gaplashish vaqti</p>
          <p className="text-lg font-bold text-ink">{fmtDur(data.avgDuration)}</p>
        </div>
        {data.missedPct > 30 && (
          <div className="ml-auto flex items-center gap-1.5 text-red-500 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">O'tkazib yuborilganlar yuqori</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-ink">Qo'ng'iroqlar dinamikasi</p>
          <div className="flex items-center gap-3 text-xs text-ink-tertiary">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-200 inline-block" /> Jami</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-300 inline-block" /> O'tkazildi</span>
          </div>
        </div>
        <BarChart data={data.chart} />
      </div>
    </div>
  );
}

/* ─── Link Call Modal ────────────────────────────────────── */
function LinkModal({ call, onSave, onClose }) {
  const [contactQ,  setContactQ]  = useState(call.contact?.name || '');
  const [contactId, setContactId] = useState(call.contact?._id  || null);
  const [dealQ,     setDealQ]     = useState(call.deal?.title   || '');
  const [dealId,    setDealId]    = useState(call.deal?._id     || null);
  const [cResults,  setCResults]  = useState([]);
  const [dResults,  setDResults]  = useState([]);
  const [cOpen,     setCOpen]     = useState(false);
  const [dOpen,     setDOpen]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const cTimer = useRef(null); const dTimer = useRef(null);

  const searchContacts = (val) => {
    setContactQ(val); setContactId(null);
    if (!val.trim()) { setCResults([]); setCOpen(false); return; }
    clearTimeout(cTimer.current);
    cTimer.current = setTimeout(async () => {
      try { const r = await axios.get(`${API_URL}/contacts`, { params: { search: val, limit: 6 } }); setCResults(r.data.contacts || []); setCOpen(true); } catch {}
    }, 300);
  };
  const searchDeals = (val) => {
    setDealQ(val); setDealId(null);
    if (!val.trim()) { setDResults([]); setDOpen(false); return; }
    clearTimeout(dTimer.current);
    dTimer.current = setTimeout(async () => {
      try { const r = await axios.get(`${API_URL}/funnels/deals/search`, { params: { q: val, limit: 6 } }); setDResults(r.data.deals || []); setDOpen(true); } catch {}
    }, 300);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/atc/calls/${call._id}`, { contact: contactId, deal: dealId });
      onSave(res.data.call);
    } catch { toast.error('Xato'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink text-sm">Qo'ng'iroqni bog'lash</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-ink-tertiary"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-ink-tertiary mb-4">Raqam: <span className="font-mono font-medium text-ink">{fmtPhone(call.phone)}</span></p>

        {/* Contact */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-ink-tertiary mb-1">Kontakt</label>
          <div className="relative">
            <input className="input pr-8" placeholder="Kontakt qidiring..." value={contactQ}
              onChange={e => searchContacts(e.target.value)}
              onBlur={() => setTimeout(() => setCOpen(false), 150)} />
            {contactId && <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />}
            {cOpen && cResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-surface-200 rounded-xl shadow-xl mt-1 max-h-36 overflow-y-auto">
                {cResults.map(c => (
                  <button key={c._id} type="button" onMouseDown={() => { setContactId(c._id); setContactQ(c.name); setCOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-50">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700">{c.name?.[0]}</div>
                    <span className="text-sm text-ink">{c.name}</span>
                    {c.phone && <span className="text-xs text-ink-tertiary">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {contactId && <button onClick={() => { setContactId(null); setContactQ(''); }} className="text-xs text-ink-disabled hover:text-red-500 mt-1 flex items-center gap-1"><X className="w-3 h-3" /> Olib tashlash</button>}
        </div>

        {/* Deal */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-ink-tertiary mb-1">Bitim</label>
          <div className="relative">
            <input className="input pr-8" placeholder="Bitim nomini yozing..." value={dealQ}
              onChange={e => searchDeals(e.target.value)}
              onBlur={() => setTimeout(() => setDOpen(false), 150)} />
            {dealId && <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500" />}
            {dOpen && dResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-surface-200 rounded-xl shadow-xl mt-1 max-h-36 overflow-y-auto">
                {dResults.map(d => (
                  <button key={d._id} type="button" onMouseDown={() => { setDealId(d._id); setDealQ(d.title); setDOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-50">
                    <span className="text-sm text-ink">{d.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {dealId && <button onClick={() => { setDealId(null); setDealQ(''); }} className="text-xs text-ink-disabled hover:text-red-500 mt-1 flex items-center gap-1"><X className="w-3 h-3" /> Olib tashlash</button>}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary btn-md">Bekor</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
const CALLS_TTL = 60 * 1000;

export default function CallsPage() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const t = useT();
  const { items: calls, total, loading } = useSelector(s => s.calls);
  const { lastFetch, paramKey } = useSelector(s => s.calls);

  const [tab,      setTab]      = useState('list');   // 'list' | 'analytics'
  const [search,   setSearch]   = useState('');
  const [dirFilter,  setDirFilter]  = useState('');
  const [statFilter, setStatFilter] = useState('');  // '' | 'missed' | 'completed'
  const [dateFilter, setDateFilter] = useState('');
  const [page,    setPage]    = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [callModal, setCallModal] = useState(null);
  const [extInput,  setExtInput]  = useState('');
  const [extCalling, setExtCalling] = useState(false);
  const [linkModal,  setLinkModal]  = useState(null);  // call object
  const LIMIT = 30;

  const searchRef = useRef(search);
  searchRef.current = search;
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    const params = { page, limit: LIMIT };
    if (dirFilter)          params.direction = dirFilter;
    if (statFilter)         params.status    = statFilter;
    if (searchRef.current)  params.phone     = searchRef.current;
    const range = getDateRange(dateFilter);
    if (range.from) params.from = range.from;
    if (range.to)   params.to   = range.to;
    const key = JSON.stringify(params);
    setSelected(new Set());
    if (key === paramKey && Date.now() - lastFetch < CALLS_TTL) return;
    try {
      await dispatch(fetchCalls(params)).unwrap();
    } catch { toast.error('Yuklanmadi'); }
  }, [dispatch, page, dirFilter, statFilter, dateFilter, paramKey, lastFetch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dirFilter, statFilter, dateFilter]);

  // Real-time search debounce
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]); // eslint-disable-line

  // Socket refresh
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => { if (page === 1) { dispatch(invalidateCalls()); load(); } };
    socket.on('atc:incoming', refresh);
    socket.on('atc:ended',    refresh);
    return () => { socket.off('atc:incoming', refresh); socket.off('atc:ended', refresh); };
  }, [dispatch, load, page]);

  const handleClickToCall = (phone) => { setExtInput(''); setCallModal(phone); };
  const handleExtSubmit = async (e) => {
    e.preventDefault();
    if (!extInput.trim()) return;
    setExtCalling(true);
    try {
      await axios.post(`${API_URL}/atc/call`, { phone: callModal, ext: extInput.trim() });
      toast.success("Qo'ng'iroq boshlanmoqda...");
      setCallModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Xato'); }
    finally { setExtCalling(false); }
  };

  const toggleOne = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (selected.size === calls.length) setSelected(new Set()); else setSelected(new Set(calls.map(c => c._id))); };

  const handleDeleteOne = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t('calls.deleteConfirm').replace('{n}', 1))) return;
    dispatch(removeCallItems([id]));
    try { await axios.delete(`${API_URL}/atc/calls/${id}`); toast.success(t('calls.deleted')); }
    catch { toast.error(t('calls.loadError')); dispatch(invalidateCalls()); load(); }
  };
  const handleDeleteSelected = async () => {
    if (!window.confirm(t('calls.deleteConfirm').replace('{n}', selected.size))) return;
    setDeleting(true);
    const ids = [...selected];
    dispatch(removeCallItems(ids));
    setSelected(new Set());
    try { await axios.delete(`${API_URL}/atc/calls`, { data: { ids } }); toast.success(t('calls.deleted')); }
    catch { toast.error(t('calls.loadError')); dispatch(invalidateCalls()); load(); } finally { setDeleting(false); }
  };

  const handleLinkSave = (updatedCall) => {
    dispatch(updateCallItem(updatedCall));
    setLinkModal(null);
    toast.success(t('calls.linked'));
  };

  const allChecked  = calls.length > 0 && selected.size === calls.length;
  const someChecked = selected.size > 0 && selected.size < calls.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 bg-white border-b border-surface-200">
        <div className="flex items-center gap-3 flex-wrap">
          <Phone className="w-5 h-5 text-primary-600 shrink-0" />
          <h1 className="font-bold text-ink">{t('calls.title')}</h1>
          <span className="text-xs text-ink-disabled bg-surface-100 px-2 py-0.5 rounded-full">{total}</span>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
            <button onClick={() => setTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-medium transition-colors ${tab === 'list' ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
              <List className="w-3.5 h-3.5" /> {t('calls.all')}
            </button>
            <button onClick={() => setTab('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-medium transition-colors ${tab === 'analytics' ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
              <BarChart2 className="w-3.5 h-3.5" /> {t('calls.analytics')}
            </button>
          </div>

          {/* Bulk delete */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-secondary">{selected.size} ta tanlandi</span>
              <button onClick={handleDeleteSelected} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {t('calls.deleteSelected')}
              </button>
              <button onClick={() => setSelected(new Set())} className="w-6 h-6 flex items-center justify-center rounded-lg text-ink-disabled hover:text-ink hover:bg-surface-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {tab === 'list' && (
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {/* Sana filtri */}
              <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
                {DATE_FILTERS.map(({ key, label }) => (
                  <button key={key} onClick={() => setDateFilter(key)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${dateFilter === key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Status filtri */}
              <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
                {[['', t('calls.all')], ['missed', t('calls.missed')], ['completed', t('calls.completed')]].map(([val, label]) => (
                  <button key={val} onClick={() => setStatFilter(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      statFilter === val ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Yo'nalish filtri */}
              <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
                {[['', t('calls.all')], ['in', t('calls.incoming')], ['out', t('calls.outgoing')]].map(([val, label]) => (
                  <button key={val} onClick={() => setDirFilter(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${dirFilter === val ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Qidiruv — real-time */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
                <input
                  className="pl-9 pr-8 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 w-44"
                  placeholder={t('calls.search')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div className="flex-1 overflow-auto bg-surface-50">
          {/* Date filter for analytics */}
          <div className="px-6 py-3 bg-white border-b border-surface-200 flex items-center gap-2">
            {DATE_FILTERS.filter(f => f.key).map(({ key, label }) => (
              <button key={key} onClick={() => setDateFilter(key)}
                className={`px-3 py-1 text-xs rounded-lg font-medium border transition-colors ${dateFilter === key ? 'bg-primary-600 text-white border-primary-600' : 'border-surface-200 text-ink-secondary hover:border-surface-300'}`}>
                {label}
              </button>
            ))}
          </div>
          <AnalyticsPanel dateFilter={dateFilter || 'week'} />
        </div>
      )}

      {/* List tab */}
      {tab === 'list' && (
        <>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-ink-tertiary">
                <Phone className="w-10 h-10 mb-3 opacity-20" />
                <p>{t('calls.noResults')}</p>
                {(search || statFilter || dirFilter) && <p className="text-xs mt-1">Filter yoki qidiruvni o'zgartiring</p>}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          allChecked ? 'bg-primary-500 border-primary-500 text-white' :
                          someChecked ? 'bg-primary-100 border-primary-400 text-primary-600' :
                          'border-surface-300 hover:border-primary-300'
                        }`}>
                        {(allChecked || someChecked) && <Check className="w-2.5 h-2.5" />}
                      </button>
                    </th>
                    <th className="text-left px-2 py-3 text-xs font-semibold text-ink-tertiary w-8"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thPhone')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thContact')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thStatus')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thDuration')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thExt')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thDate')}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">{t('calls.thRecord')}</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {calls.map(call => {
                    const s = STATUS_MAP[call.status] || STATUS_MAP.completed;
                    const isSelected = selected.has(call._id);
                    return (
                      <tr key={call._id}
                        className={`transition-colors group/row ${isSelected ? 'bg-primary-50/60' : 'hover:bg-surface-50'}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleOne(call._id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-primary-500 border-primary-500 text-white' :
                              'border-surface-300 hover:border-primary-300 opacity-0 group-hover/row:opacity-100'
                            }`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </button>
                        </td>
                        <td className="px-2 py-3"><DirectionIcon dir={call.direction} status={call.status} /></td>
                        <td className="px-4 py-3 font-mono text-sm text-ink">{fmtPhone(call.phone)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {call.contact ? (
                              <button onClick={() => navigate(`/contacts/${call.contact._id}`)}
                                className="flex items-center gap-1.5 hover:text-primary-600 transition-colors group/c">
                                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[9px] font-bold text-primary-700 shrink-0">
                                  {call.contact.name?.[0]}
                                </div>
                                <span className="text-sm text-ink group-hover/c:text-primary-600">{call.contact.name}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-ink-disabled flex items-center gap-1"><User className="w-3 h-3" /> {t('calls.unknown')}</span>
                            )}
                            {call.deal && (
                              <div className="flex items-center gap-1 text-xs text-ink-tertiary">
                                <Link2 className="w-3 h-3 text-primary-400 shrink-0" />
                                <span className="truncate max-w-[120px]">{call.deal.title}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{t(s.labelKey)}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-ink-secondary">{fmtDuration(call.duration)}</td>
                        <td className="px-4 py-3 text-xs text-ink-tertiary font-mono">{call.ext || '—'}</td>
                        <td className="px-4 py-3 text-xs text-ink-tertiary whitespace-nowrap">{fmtDateTime(call.startedAt || call.createdAt)}</td>
                        <td className="px-4 py-3"><AudioPlayer url={call.recordingUrl} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button onClick={() => setLinkModal(call)} title="Bog'lash"
                              className="w-7 h-7 rounded-lg hover:bg-primary-50 flex items-center justify-center text-ink-disabled hover:text-primary-600 transition-colors">
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleClickToCall(call.phone)} title="Qayta qo'ng'iroq"
                              className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-ink-disabled hover:text-emerald-600 transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleDeleteOne(call._id, e)} title="O'chirish"
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-ink-disabled hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="shrink-0 px-6 py-3 border-t border-surface-200 bg-white flex items-center justify-between">
              <span className="text-xs text-ink-tertiary">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} / {total}</span>
              <div className="flex gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                  className="px-3 py-1 text-xs rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
                  Oldingi
                </button>
                <button disabled={page*LIMIT>=total} onClick={() => setPage(p=>p+1)}
                  className="px-3 py-1 text-xs rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50">
                  Keyingi
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Click-to-call modal */}
      {callModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCallModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink text-sm">Qo'ng'iroq qilish</h3>
              <button onClick={() => setCallModal(null)} className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-ink-tertiary mb-3">Raqam: <span className="font-mono font-semibold text-ink">{fmtPhone(callModal)}</span></p>
            <form onSubmit={handleExtSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Kengaytma (ext)</label>
                <input className="input" placeholder="Masalan: 701" value={extInput}
                  onChange={e => setExtInput(e.target.value)} autoFocus required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCallModal(null)} className="btn-secondary btn-md">Bekor</button>
                <button type="submit" disabled={extCalling} className="btn-primary btn-md flex items-center gap-2">
                  {extCalling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                  Qo'ng'iroq
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link modal */}
      {linkModal && <LinkModal call={linkModal} onSave={handleLinkSave} onClose={() => setLinkModal(null)} />}
    </div>
  );
}
