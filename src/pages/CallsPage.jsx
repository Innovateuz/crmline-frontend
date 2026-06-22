import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Loader2, Play, Pause, User, Search, Trash2, X, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

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
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-colors"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <span className="text-xs text-ink-tertiary">Yozuv</span>
    </div>
  );
}

const STATUS_MAP = {
  ringing:   { label: 'Jiringlayapti',        cls: 'bg-amber-50 text-amber-600'  },
  active:    { label: 'Faol',                  cls: 'bg-emerald-50 text-emerald-600' },
  completed: { label: 'Gaplashildi',           cls: 'bg-surface-100 text-ink-tertiary' },
  missed:    { label: "O'tkazib yuborilgan",   cls: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Bekor',                 cls: 'bg-surface-100 text-ink-disabled' },
};

function DirectionIcon({ dir, status }) {
  if (status === 'missed' || status === 'cancelled')
    return <PhoneMissed className="w-4 h-4 text-red-400" />;
  if (dir === 'out') return <PhoneOutgoing className="w-4 h-4 text-blue-400" />;
  return <PhoneIncoming className="w-4 h-4 text-emerald-400" />;
}

// Sana filtrlari
const DATE_FILTERS = [
  { key: '', label: 'Hammasi' },
  { key: 'today', label: 'Bugun' },
  { key: 'week',  label: 'Bu hafta' },
  { key: 'month', label: 'Bu oy' },
];

function getDateRange(key) {
  const now = new Date();
  if (key === 'today') {
    const start = new Date(now); start.setHours(0,0,0,0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (key === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (key === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  return {};
}

export default function CallsPage() {
  const navigate  = useNavigate();
  const [calls,     setCalls]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [dirFilter, setDirFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [selected,  setSelected]  = useState(new Set());
  const [deleting,  setDeleting]  = useState(false);
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (dirFilter)   params.direction = dirFilter;
      if (search)      params.phone     = search;
      const range = getDateRange(dateFilter);
      if (range.from)  params.from = range.from;
      if (range.to)    params.to   = range.to;
      const res = await axios.get(`${API_URL}/atc/calls`, { params });
      setCalls(res.data.calls || []);
      setTotal(res.data.total || 0);
      setSelected(new Set());
    } catch { toast.error('Yuklanmadi'); }
    finally  { setLoading(false); }
  }, [page, dirFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [dirFilter, dateFilter]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => { if (page === 1) load(); };
    socket.on('atc:incoming', refresh);
    socket.on('atc:ended',    refresh);
    return () => {
      socket.off('atc:incoming', refresh);
      socket.off('atc:ended',    refresh);
    };
  }, [load, page]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') { setPage(1); load(); }
  };

  const handleClickToCall = async (phone) => {
    const ext = prompt("Qaysi kengaytmadan qo'ng'iroq qilasiz? (masalan: 701)");
    if (!ext) return;
    try {
      await axios.post(`${API_URL}/atc/call`, { phone, ext });
      toast.success("Qo'ng'iroq boshlanmoqda...");
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleOne = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === calls.length) setSelected(new Set());
    else setSelected(new Set(calls.map(c => c._id)));
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteOne = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await axios.delete(`${API_URL}/atc/calls/${id}`);
      toast.success("O'chirildi");
      load();
    } catch { toast.error('Xato'); }
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`${selected.size} ta o'chirilsinmi?`)) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/atc/calls`, { data: { ids: [...selected] } });
      toast.success(`${selected.size} ta o'chirildi`);
      load();
    } catch { toast.error('Xato'); }
    finally { setDeleting(false); }
  };

  const allChecked  = calls.length > 0 && selected.size === calls.length;
  const someChecked = selected.size > 0 && selected.size < calls.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 bg-white border-b border-surface-200">
        <div className="flex items-center gap-3 flex-wrap">
          <Phone className="w-5 h-5 text-primary-600 shrink-0" />
          <h1 className="font-bold text-ink">Qo'ng'iroqlar tarixi</h1>
          <span className="text-xs text-ink-disabled bg-surface-100 px-2 py-0.5 rounded-full">{total} ta</span>

          {/* Bulk delete */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-ink-secondary">{selected.size} ta tanlandi</span>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                O'chirish
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-ink-disabled hover:text-ink hover:bg-surface-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Sana filtri */}
            <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
              {DATE_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                    dateFilter === key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Yo'nalish filtri */}
            <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
              {[['', 'Barchasi'], ['in', 'Kiruvchi'], ['out', 'Chiquvchi']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDirFilter(val)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                    dirFilter === val ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
              <input
                className="pl-9 pr-4 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 w-44"
                placeholder="Telefon raqam..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-tertiary">
            <Phone className="w-10 h-10 mb-3 opacity-20" />
            <p>Qo'ng'iroqlar yo'q</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allChecked
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : someChecked
                          ? 'bg-primary-100 border-primary-400 text-primary-600'
                          : 'border-surface-300 hover:border-primary-300'
                    }`}
                  >
                    {(allChecked || someChecked) && <Check className="w-2.5 h-2.5" />}
                  </button>
                </th>
                <th className="text-left px-2 py-3 text-xs font-semibold text-ink-tertiary w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Telefon</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Kontakt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Holat</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Davomiylik</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Kengaytma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Vaqt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-tertiary">Yozuv</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {calls.map(call => {
                const s    = STATUS_MAP[call.status] || STATUS_MAP.completed;
                const isSelected = selected.has(call._id);
                return (
                  <tr
                    key={call._id}
                    className={`transition-colors group/row ${isSelected ? 'bg-primary-50/60' : 'hover:bg-surface-50'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleOne(call._id)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-surface-300 hover:border-primary-300 opacity-0 group-hover/row:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </button>
                    </td>

                    {/* Direction icon */}
                    <td className="px-2 py-3">
                      <DirectionIcon dir={call.direction} status={call.status} />
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-ink">{fmtPhone(call.phone)}</span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      {call.contact ? (
                        <button
                          onClick={() => navigate(`/contacts/${call.contact._id}`)}
                          className="flex items-center gap-2 hover:text-primary-600 transition-colors group/c"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                            {call.contact.name?.charAt(0)}
                          </div>
                          <span className="text-sm text-ink group-hover/c:text-primary-600 transition-colors">
                            {call.contact.name}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-ink-disabled flex items-center gap-1">
                          <User className="w-3 h-3" /> Noma'lum
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 font-mono text-sm text-ink-secondary">
                      {fmtDuration(call.duration)}
                    </td>

                    {/* Ext */}
                    <td className="px-4 py-3 text-xs text-ink-tertiary font-mono">
                      {call.ext || '—'}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-xs text-ink-tertiary whitespace-nowrap">
                      {fmtDateTime(call.startedAt || call.createdAt)}
                    </td>

                    {/* Recording */}
                    <td className="px-4 py-3">
                      <AudioPlayer url={call.recordingUrl} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleClickToCall(call.phone)}
                          title="Qayta qo'ng'iroq"
                          className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-ink-disabled hover:text-emerald-600 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteOne(call._id, e)}
                          title="O'chirish"
                          className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-ink-disabled hover:text-red-500 transition-colors"
                        >
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
    </div>
  );
}
