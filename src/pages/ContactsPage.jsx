import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../utils/translate';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { fetchContacts, invalidateContacts, removeContact } from '../store/contactsSlice';
import Pagination from '../components/Pagination';
import { getSocket } from '../utils/socket';
import {
  Plus, Search, Pencil, Trash2, Loader2, Users, SlidersHorizontal, Check,
  Download, Upload, Copy, X, AlertTriangle, AlertCircle, ChevronDown, BarChart2,
  ChevronRight, MoreVertical, PhoneCall,
} from 'lucide-react';

function isReminderOverdue(reminderAt) {
  return !!reminderAt && new Date(reminderAt) < new Date();
}

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const LS_KEY = 'crm_contacts_columns';

/* ─── Helpers ──────────────────────────────────────────────── */
function renderFieldValue(field, value) {
  if (value === undefined || value === null || value === '') return null;
  if (field.type === 'boolean')     return value ? "Ha" : "Yo'q";
  if (field.type === 'multiselect') return Array.isArray(value) ? value.join(', ') : String(value);
  if (field.type === 'date')        { try { return new Date(value).toLocaleDateString('uz-UZ'); } catch { return value; } }
  if (field.type === 'file')        return value ? '📎 Fayl' : null;
  return String(value);
}

/* ─── CSV parse (client-side preview for import) ──────────── */
function parseCsv(text) {
  const parseRow = (line) => {
    const cells = []; let inQ = false, cell = '';
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cells.push(cell.trim()); cell = ''; }
      else { cell += ch; }
    }
    cells.push(cell.trim());
    return cells.map(c => c.replace(/^"|"$/g, '').trim());
  };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseRow(lines[0]);
  const rows    = lines.slice(1).map(l => parseRow(l));
  return { headers, rows };
}

/* ─── Delete confirm modal ─────────────────────────────────── */
function DeleteConfirm({ name, count, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-2">Kontaktni o'chirish</h3>
        <p className="text-sm text-ink-secondary mb-6">
          {count
            ? <><span className="font-medium text-red-600">{count} ta</span> kontakt o'chiriladi.</>
            : <><span className="font-medium text-ink">{name}</span> kontakti o'chiriladi.</>
          } Bu amalni ortga qaytarib bo'lmaydi.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-md btn-secondary flex-1">Bekor</button>
          <button onClick={onConfirm} disabled={loading} className="btn-md btn-danger flex-1 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            O'chirish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Import Modal ─────────────────────────────────────────── */
function ImportModal({ onClose, onDone }) {
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null); // { headers, rows }
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { toast.error('Faqat CSV fayl qabul qilinadi'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv(e.target.result);
      setPreview(parsed);
    };
    reader.readAsText(f, 'utf-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API}/contacts/import`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import xatosi');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl flex flex-col max-h-[85dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600" /> CSV import
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-ink mb-1">Import tugadi!</p>
            <p className="text-sm text-ink-secondary">
              <span className="text-emerald-600 font-semibold">{result.created} ta</span> kontakt qo'shildi,{' '}
              <span className="text-ink-tertiary">{result.skipped} ta</span> o'tkazib yuborildi (mavjud yoki bo'sh).
            </p>
            <button onClick={onClose} className="btn-primary btn-md mt-6">Yopish</button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Format hint */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <p className="font-semibold mb-1">CSV fayl formati:</p>
                <code className="font-mono">Ism,Telefon,Email</code><br/>
                <code className="font-mono">Alibek Karimov,998901234567,ali@mail.com</code>
                <p className="mt-1 text-amber-600">Birinchi qator ustun nomlari bo'lishi shart.</p>
              </div>

              {/* Drop zone */}
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-surface-300 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-ink-disabled mx-auto mb-2" />
                  <p className="text-sm font-medium text-ink-secondary">CSV faylni bu yerga tashlang</p>
                  <p className="text-xs text-ink-tertiary mt-1">yoki bosing va tanlang</p>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                    onChange={e => handleFile(e.target.files?.[0])} />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-ink">{file?.name} — {preview.rows.length} ta qator</p>
                    <button onClick={() => { setFile(null); setPreview(null); }} className="text-xs text-ink-disabled hover:text-red-500 flex items-center gap-1">
                      <X className="w-3 h-3" /> Tozalash
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-surface-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-50">
                        <tr>{preview.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-ink-tertiary whitespace-nowrap">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {preview.rows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-surface-50">
                            {preview.headers.map((_, j) => (
                              <td key={j} className="px-3 py-1.5 text-ink-secondary whitespace-nowrap max-w-[160px] truncate">{row[j] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                        {preview.rows.length > 10 && (
                          <tr><td colSpan={preview.headers.length} className="px-3 py-2 text-center text-ink-tertiary">… yana {preview.rows.length - 10} ta qator</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100 shrink-0">
              <button onClick={onClose} className="btn-secondary btn-md">Bekor</button>
              <button onClick={handleImport} disabled={!preview || importing}
                className="btn-primary btn-md flex items-center gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importlash ({preview?.rows.length || 0} ta)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Duplicates Modal ─────────────────────────────────────── */
function DuplicatesModal({ onClose, onMerged }) {
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [merging,  setMerging]  = useState(null); // group phone
  const [keepIds,  setKeepIds]  = useState({});   // { phone: contactId }

  useEffect(() => {
    axios.get(`${API}/contacts/duplicates`)
      .then(r => {
        setGroups(r.data.groups || []);
        const defaults = {};
        (r.data.groups || []).forEach(g => { defaults[g._id] = g.contacts[0]._id; });
        setKeepIds(defaults);
      })
      .catch(() => toast.error('Yuklanmadi'))
      .finally(() => setLoading(false));
  }, []);

  const handleMerge = async (group) => {
    const keepId = keepIds[group._id];
    const deleteIds = group.contacts.filter(c => String(c._id) !== String(keepId)).map(c => c._id);
    setMerging(group._id);
    try {
      await axios.post(`${API}/contacts/merge`, { keepId, deleteIds });
      setGroups(prev => prev.filter(g => g._id !== group._id));
      onMerged();
      toast.success('Birlashtrildi');
    } catch { toast.error('Xato'); } finally { setMerging(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-xl flex flex-col max-h-[85dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-500" /> Takroriy kontaktlar
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Check className="w-10 h-10 text-emerald-500 mb-3" />
              <p className="font-semibold text-ink">Takroriy kontaktlar yo'q</p>
              <p className="text-xs text-ink-tertiary mt-1">Hamma yaxshi!</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group._id} className="border border-amber-200 rounded-xl bg-amber-50/40 p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {group.count} ta takroriy raqam
                    </p>
                    <p className="text-xs text-ink-tertiary font-mono mt-0.5">{group._id}</p>
                  </div>
                  <button onClick={() => handleMerge(group)}
                    disabled={merging === group._id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors">
                    {merging === group._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                    Birlashtirish
                  </button>
                </div>
                <div className="space-y-1.5">
                  {group.contacts.map(c => (
                    <label key={c._id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                      <input type="radio" name={`keep-${group._id}`}
                        checked={String(keepIds[group._id]) === String(c._id)}
                        onChange={() => setKeepIds(prev => ({ ...prev, [group._id]: c._id }))}
                        className="accent-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-ink">{c.name}</p>
                        <p className="text-[10px] text-ink-tertiary">Yaratildi: {new Date(c.createdAt).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      {String(keepIds[group._id]) === String(c._id) && (
                        <span className="ml-auto text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Saqlanadi</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end px-5 py-4 border-t border-surface-100 shrink-0">
          <button onClick={onClose} className="btn-secondary btn-md">Yopish</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
const CONTACTS_TTL = 5 * 60 * 1000;

export default function ContactsPage() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const t = useT();
  const colMenuRef = useRef(null);

  const { items: contacts, total, pages, loading, lastFetch, paramKey } = useSelector(s => s.contacts);

  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');

  const [selected,      setSelected]      = useState(new Set());
  const [deleting,      setDeleting]      = useState(null);   // contact obj OR 'bulk'
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [showDupes,     setShowDupes]     = useState(false);

  const [orgSections, setOrgSections] = useState([]);
  const [colVis, setColVis] = useState(() => {
    try { return { phone: true, email: true, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; }
    catch { return { phone: true, email: true }; }
  });
  const [showColMenu, setShowColMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  const searchTimer = useRef(null);

  useEffect(() => {
    axios.get(`${API}/organization/contact-fields`)
      .then(r => setOrgSections(Array.isArray(r.data.sections) ? r.data.sections : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const allFields = orgSections.flatMap(s => s.fields);
    if (!allFields.length) return;
    setColVis(prev => {
      const next = { ...prev };
      allFields.forEach(f => { if (!(f.id in next)) next[f.id] = false; });
      return next;
    });
  }, [orgSections]);

  useEffect(() => {
    if (Object.keys(colVis).length > 0) localStorage.setItem(LS_KEY, JSON.stringify(colVis));
  }, [colVis]);

  const toggleCol = (key) => setColVis(prev => ({ ...prev, [key]: !prev[key] }));

  const load = useCallback(async (p = 1, q = search) => {
    const params = { page: p, limit: 30 };
    if (q.trim()) params.search = q.trim();
    const key = JSON.stringify(params);
    setPage(p);
    setSelected(new Set());
    if (key === paramKey && Date.now() - lastFetch < CONTACTS_TTL) return;
    try {
      await dispatch(fetchContacts(params)).unwrap();
    } catch { toast.error('Kontaktlar yuklanmadi'); }
  }, [dispatch, search, paramKey, lastFetch]);

  useEffect(() => { load(1); }, []); // eslint-disable-line

  // Real-time sync: boshqa foydalanuvchi kontakt qo'shsa/o'zgartirsa/o'chirsa —
  // ro'yxat avtomatik yangilanadi (refresh shart emas).
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => { dispatch(invalidateContacts()); load(page); };
    socket.on('contact:created',      refresh);
    socket.on('contact:updated',      refresh);
    socket.on('contact:deleted',      refresh);
    socket.on('contact:bulk-deleted', refresh);
    return () => {
      socket.off('contact:created',      refresh);
      socket.off('contact:updated',      refresh);
      socket.off('contact:deleted',      refresh);
      socket.off('contact:bulk-deleted', refresh);
    };
  }, [dispatch, load, page]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val), 400);
  };

  /* ─── Delete ─────────────────────────────────────────── */
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleting === 'bulk') {
        const ids = [...selected];
        await axios.delete(`${API}/contacts/bulk`, { data: { ids } });
        toast.success(t('contacts.deleted'));
        dispatch(invalidateContacts());
        load(page);
      } else {
        await axios.delete(`${API}/contacts/${deleting._id}`);
        toast.success(t('contacts.deleted'));
        dispatch(removeContact(deleting._id));
      }
      setDeleting(null);
    } catch { toast.error(t('contacts.loadError')); }
    finally { setDeleteLoading(false); }
  };

  /* ─── Selection ──────────────────────────────────────── */
  const toggleOne = (id, e) => {
    e.stopPropagation();
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = (e) => {
    e.stopPropagation();
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map(c => c._id)));
  };

  /* ─── Normalize phones ───────────────────────────────── */
  const handleNormalizeAll = async () => {
    if (!window.confirm('Barcha kontaktlardagi telefon raqamlarni +998XXXXXXXXX formatiga o\'tkazilsinmi?')) return;
    try {
      const res = await axios.post(`${API}/contacts/normalize-all`);
      toast.success(`${res.data.updated} ta raqam normallantirildi`);
      if (res.data.updated > 0) { dispatch(invalidateContacts()); load(1); }
    } catch { toast.error('Xato yuz berdi'); }
  };

  /* ─── Export CSV ─────────────────────────────────────── */
  const handleExport = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    axios.get(`${API}/contacts/export?${params.toString()}`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'contacts.csv'; a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV yuklab olindi');
      })
      .catch(() => toast.error('Eksport xatosi'));
  };

  const allCustomFields = orgSections.flatMap(s => s.fields.map(f => ({ ...f, sectionName: s.name })));
  const allChecked  = contacts.length > 0 && selected.size === contacts.length;
  const someChecked = selected.size > 0 && selected.size < contacts.length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 lg:py-4 border-b border-surface-100 bg-white shrink-0">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-ink truncate">{t('contacts.title')}</h1>
          {!loading && total > 0 && <span className="text-lg lg:text-xl font-bold text-ink-tertiary shrink-0">{total}</span>}
        </div>

        {/* Desktop: barcha amallar ko'rinadi */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate('/contacts/analytics')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-primary-300 hover:text-primary-600 transition-colors">
            <BarChart2 className="w-4 h-4" /> {t('contacts.analytics')}
          </button>
          <button onClick={handleExport} title="CSV eksport"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors">
            <Download className="w-4 h-4" /> {t('contacts.export')}
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors">
            <Upload className="w-4 h-4" /> {t('contacts.import')}
          </button>
          <button onClick={() => setShowDupes(true)} title="Takroriy raqamlarni aniqlash"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-amber-300 hover:text-amber-600 transition-colors">
            <Copy className="w-4 h-4" /> Takroriylar
          </button>
          <button onClick={handleNormalizeAll} title="Barcha raqamlarni +998 formatga o'tkazish"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-primary-300 hover:text-primary-600 transition-colors">
            Raqamlarni normallashtirish
          </button>
          <button onClick={() => navigate('/contacts/new')} className="btn-md btn-primary shrink-0">
            <Plus className="w-4 h-4" /> {t('contacts.newContact')}
          </button>
        </div>

        {/* Mobil: faqat "+" va qolgan amallar "..." menyusida */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <div className="relative">
            <button onClick={() => setShowMobileActions(v => !v)}
              className="p-2 rounded-xl border border-surface-200 text-ink-secondary hover:border-surface-300 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMobileActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMobileActions(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-surface-100 rounded-xl shadow-xl py-1 w-56">
                  <button onClick={() => { setShowMobileActions(false); navigate('/contacts/analytics'); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors">
                    <BarChart2 className="w-4 h-4 text-ink-tertiary" /> {t('contacts.analytics')}
                  </button>
                  <button onClick={() => { setShowMobileActions(false); handleExport(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors">
                    <Download className="w-4 h-4 text-ink-tertiary" /> {t('contacts.export')}
                  </button>
                  <button onClick={() => { setShowMobileActions(false); setShowImport(true); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors">
                    <Upload className="w-4 h-4 text-ink-tertiary" /> {t('contacts.import')}
                  </button>
                  <button onClick={() => { setShowMobileActions(false); setShowDupes(true); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors">
                    <Copy className="w-4 h-4 text-ink-tertiary" /> Takroriylar
                  </button>
                  <button onClick={() => { setShowMobileActions(false); handleNormalizeAll(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors">
                    <SlidersHorizontal className="w-4 h-4 text-ink-tertiary" /> Raqamlarni normallashtirish
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => navigate('/contacts/new')} className="btn-md btn-primary shrink-0 px-3">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search + bulk + column settings */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 border-b border-surface-100 bg-white shrink-0 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input className="input pl-9" placeholder={t('contacts.search')}
            value={search} onChange={e => handleSearch(e.target.value)} />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bulk delete bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-secondary font-medium">{selected.size} ta tanlandi</span>
            <button onClick={() => setDeleting('bulk')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> {t('contacts.deleteSelected').replace('{n}', selected.size)}
            </button>
            <button onClick={() => setSelected(new Set())} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-disabled hover:text-ink hover:bg-surface-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Column visibility toggle */}
        <div className="relative shrink-0 ml-auto" ref={colMenuRef}>
          <button onClick={() => setShowColMenu(m => !m)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showColMenu ? 'bg-primary-50 border-primary-300 text-primary-600' : 'border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink'
            }`}>
            <SlidersHorizontal className="w-4 h-4" /> {t('contacts.columns')}
          </button>

          {showColMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-surface-100 rounded-xl shadow-xl p-3 w-60">
                <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">Ustunlarni sozlash</p>
                <div className="flex items-center justify-between px-1 py-1.5 rounded-lg opacity-40">
                  <span className="text-sm text-ink">Kontakt</span>
                  <div className="w-4 h-4 rounded border bg-primary-500 border-primary-500 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                </div>
                {[{ key: 'phone', label: 'Telefon' }, { key: 'email', label: 'Email' }].map(col => (
                  <button key={col.key} onClick={() => toggleCol(col.key)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors">
                    <span className="text-sm text-ink">{col.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${colVis[col.key] ? 'bg-primary-500 border-primary-500' : 'border-surface-200'}`}>
                      {colVis[col.key] && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                ))}
                {allCustomFields.length > 0 && (
                  <>
                    <div className="h-px bg-surface-100 my-2" />
                    <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-1 px-1">Qo'shimcha maydonlar</p>
                    {allCustomFields.map(field => (
                      <button key={field.id} onClick={() => toggleCol(field.id)}
                        className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors">
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm text-ink truncate">{field.key}</span>
                          <span className="text-[10px] text-ink-tertiary">{field.sectionName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 transition-colors ${colVis[field.id] ? 'bg-primary-500 border-primary-500' : 'border-surface-200'}`}>
                          {colVis[field.id] && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-ink-disabled" />
            </div>
            <p className="text-sm font-medium text-ink-secondary">Kontaktlar yo'q</p>
            <p className="text-xs text-ink-tertiary mt-1">{search ? 'Qidiruv natijasi topilmadi' : "Birinchi kontaktni qo'shing"}</p>
            {!search && (
              <button onClick={() => navigate('/contacts/new')} className="btn-md btn-primary mt-4">
                <Plus className="w-4 h-4" /> Qo'shish
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    {/* Checkbox column */}
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
                    <th className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">{t('contacts.thName')}</th>
                    {colVis.phone && <th className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">{t('contacts.thPhone')}</th>}
                    {colVis.email && <th className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">{t('contacts.thEmail')}</th>}
                    {allCustomFields.filter(f => colVis[f.id]).map(field => (
                      <th key={field.id} className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">{field.key}</th>
                    ))}
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {contacts.map((c) => {
                    const isSelected = selected.has(c._id);
                    return (
                      <tr key={c._id}
                        onClick={() => navigate(`/contacts/${c._id}`)}
                        className={`transition-colors group cursor-pointer ${isSelected ? 'bg-primary-50/60' : 'hover:bg-surface-50'} ${c.blocked ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3" onClick={e => toggleOne(c._id, e)}>
                          <button className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-primary-500 border-primary-500 text-white' :
                            'border-surface-300 hover:border-primary-300 opacity-0 group-hover:opacity-100'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {c.contactNumber && <span className="text-xs font-semibold text-ink-tertiary shrink-0">#{c.contactNumber}</span>}
                            <p className="font-medium text-ink truncate">{c.name}</p>
                            {c.blocked && <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">Bloklangan</span>}
                            {isReminderOverdue(c.reminderAt) && (
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" title={t('contacts.reminderOverdue')} />
                            )}
                          </div>
                        </td>
                        {colVis.phone && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            {c.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-sm text-ink-secondary">{c.phone}</span>
                                <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} title="Qo'ng'iroq qilish"
                                  className="p-1 rounded-lg text-ink-tertiary hover:text-green-600 hover:bg-green-50 transition-colors">
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </a>
                              </span>
                            ) : <span className="text-ink-disabled">—</span>}
                          </td>
                        )}
                        {colVis.email && <td className="px-4 py-3"><span className="text-sm text-ink-secondary truncate max-w-[220px] block">{c.email || <span className="text-ink-disabled">—</span>}</span></td>}
                        {allCustomFields.filter(f => colVis[f.id]).map(field => {
                          const rendered = renderFieldValue(field, c.customFieldValues?.[field.id]);
                          return (
                            <td key={field.id} className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-ink-secondary">{rendered ?? <span className="text-ink-disabled">—</span>}</span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); navigate(`/contacts/${c._id}`); }}
                              className="p-1.5 rounded-lg text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleting(c); }}
                              className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil kartochka ro'yxati — jadval o'rniga */}
            <div className="md:hidden divide-y divide-surface-100">
              {contacts.map((c) => {
                const isSelected = selected.has(c._id);
                return (
                  <div key={c._id}
                    onClick={() => navigate(`/contacts/${c._id}`)}
                    className={`flex items-center gap-3 px-4 py-3 active:bg-surface-50 transition-colors ${isSelected ? 'bg-primary-50/60' : ''} ${c.blocked ? 'opacity-60' : ''}`}>
                    <button onClick={e => toggleOne(c._id, e)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-surface-300'
                      }`}>
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {c.contactNumber && <span className="text-xs font-semibold text-ink-tertiary shrink-0">#{c.contactNumber}</span>}
                        <p className="font-medium text-ink truncate">{c.name}</p>
                        {c.blocked && <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">Bloklangan</span>}
                        {isReminderOverdue(c.reminderAt) && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" title={t('contacts.reminderOverdue')} />
                        )}
                      </div>
                      {(colVis.phone && c.phone) && <p className="text-xs text-ink-tertiary truncate mt-0.5">{c.phone}</p>}
                      {(colVis.email && c.email) && <p className="text-xs text-ink-tertiary truncate">{c.email}</p>}
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl text-green-600 bg-green-50 shrink-0">
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                    <ChevronRight className="w-4 h-4 text-ink-disabled shrink-0" />
                  </div>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="px-4 lg:px-6 py-4 border-t border-surface-100">
                <Pagination page={page} pages={pages} total={total} limit={30} onPage={(p) => load(p)} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {deleting && (
        <DeleteConfirm
          name={deleting === 'bulk' ? undefined : deleting.name}
          count={deleting === 'bulk' ? selected.size : undefined}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
          loading={deleteLoading}
        />
      )}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { dispatch(invalidateContacts()); load(1); }} />}
      {showDupes  && <DuplicatesModal onClose={() => setShowDupes(false)} onMerged={() => { dispatch(invalidateContacts()); load(1); }} />}
    </div>
  );
}
