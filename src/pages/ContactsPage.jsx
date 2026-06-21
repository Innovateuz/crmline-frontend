import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import { Plus, Search, Pencil, Trash2, Loader2, Users, SlidersHorizontal, Check } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const LS_KEY = 'crm_contacts_columns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderFieldValue(field, value) {
  if (value === undefined || value === null || value === '') return null;
  if (field.type === 'boolean') return value ? "Ha" : "Yo'q";
  if (field.type === 'multiselect') return Array.isArray(value) ? value.join(', ') : String(value);
  if (field.type === 'date') {
    try { return new Date(value).toLocaleDateString('uz-UZ'); } catch { return value; }
  }
  if (field.type === 'file') return value ? '📎 Fayl' : null;
  return String(value);
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-2">Kontaktni o'chirish</h3>
        <p className="text-sm text-ink-secondary mb-6">
          <span className="font-medium text-ink">{name}</span> kontakti o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-md btn-secondary flex-1">Bekor</button>
          <button onClick={onConfirm} disabled={loading} className="btn-md btn-danger flex-1">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            O'chirish
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const navigate   = useNavigate();
  const colMenuRef = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  const [deleting, setDeleting]           = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Org-level custom fields (flat list, in section order)
  const [orgSections, setOrgSections] = useState([]);

  // Column visibility: { phone: true, email: true, [fieldId]: false, ... }
  const [colVis, setColVis] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      return { phone: true, email: true, ...saved };
    } catch {
      return { phone: true, email: true };
    }
  });
  const [showColMenu, setShowColMenu] = useState(false);

  const searchTimer = useRef(null);

  // ── Load org sections once ─────────────────────────────────────────────────
  useEffect(() => {
    axios.get(`${API}/organization/contact-fields`)
      .then(r => setOrgSections(Array.isArray(r.data.sections) ? r.data.sections : []))
      .catch(() => {});
  }, []);

  // ── Merge new custom fields into colVis when orgSections loads ─────────────
  useEffect(() => {
    const allFields = orgSections.flatMap(s => s.fields);
    if (allFields.length === 0) return;
    setColVis(prev => {
      const next = { ...prev };
      allFields.forEach(f => { if (!(f.id in next)) next[f.id] = false; });
      return next;
    });
  }, [orgSections]);

  // ── Persist colVis to localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (Object.keys(colVis).length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(colVis));
    }
  }, [colVis]);

  const toggleCol = (key) => {
    setColVis(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Contacts load ──────────────────────────────────────────────────────────
  const load = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30 };
      if (q.trim()) params.search = q.trim();
      const res = await axios.get(`${API}/contacts`, { params });
      setContacts(res.data.contacts || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch {
      toast.error('Kontaktlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(1); }, []); // eslint-disable-line

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, val), 400);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/contacts/${deleting._id}`);
      setContacts(cs => cs.filter(c => c._id !== deleting._id));
      setTotal(t => t - 1);
      toast.success("Kontakt o'chirildi");
      setDeleting(null);
    } catch {
      toast.error("O'chirishda xato");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Column definitions ─────────────────────────────────────────────────────
  const staticCols = [
    { key: 'phone', label: 'Telefon' },
    { key: 'email', label: 'Email' },
  ];

  const allCustomFields = orgSections.flatMap(s =>
    s.fields.map(f => ({ ...f, sectionName: s.name }))
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink">Kontaktlar</h1>
          {!loading && total > 0 && (
            <span className="text-xl font-bold text-ink-tertiary">{total}</span>
          )}
        </div>
        <button onClick={() => navigate('/contacts/new')} className="btn-md btn-primary shrink-0">
          <Plus className="w-4 h-4" />
          Yangi kontakt
        </button>
      </div>

      {/* Search + column settings */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-100 bg-white shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input
            className="input pl-9"
            placeholder="Ism, telefon, email..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Column visibility toggle */}
        <div className="relative shrink-0" ref={colMenuRef}>
          <button
            onClick={() => setShowColMenu(m => !m)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showColMenu
                ? 'bg-primary-50 border-primary-300 text-primary-600'
                : 'border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Ustunlar
          </button>

          {showColMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-surface-100 rounded-xl shadow-xl p-3 w-60">
                <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">
                  Ustunlarni sozlash
                </p>

                {/* Always-on: Kontakt */}
                <div className="flex items-center justify-between px-1 py-1.5 rounded-lg opacity-40">
                  <span className="text-sm text-ink">Kontakt</span>
                  <div className="w-4 h-4 rounded border bg-primary-500 border-primary-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>

                {/* Static columns */}
                {staticCols.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleCol(col.key)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors"
                  >
                    <span className="text-sm text-ink">{col.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      colVis[col.key] ? 'bg-primary-500 border-primary-500' : 'border-surface-200'
                    }`}>
                      {colVis[col.key] && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </button>
                ))}

                {/* Custom fields */}
                {allCustomFields.length > 0 && (
                  <>
                    <div className="h-px bg-surface-100 my-2" />
                    <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-1 px-1">
                      Qo'shimcha maydonlar
                    </p>
                    {allCustomFields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => toggleCol(field.id)}
                        className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-surface-50 transition-colors"
                      >
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm text-ink truncate">{field.key}</span>
                          <span className="text-[10px] text-ink-tertiary">{field.sectionName}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                          colVis[field.id] ? 'bg-primary-500 border-primary-500' : 'border-surface-200'
                        }`}>
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
            <p className="text-xs text-ink-tertiary mt-1">
              {search ? 'Qidiruv natijasi topilmadi' : "Birinchi kontaktni qo'shing"}
            </p>
            {!search && (
              <button onClick={() => navigate('/contacts/new')} className="btn-md btn-primary mt-4">
                <Plus className="w-4 h-4" /> Qo'shish
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50">
                    <th className="text-left text-xs font-semibold text-ink-tertiary px-6 py-3 whitespace-nowrap">
                      Kontakt
                    </th>
                    {colVis.phone && (
                      <th className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">
                        Telefon
                      </th>
                    )}
                    {colVis.email && (
                      <th className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">
                        Email
                      </th>
                    )}
                    {allCustomFields.filter(f => colVis[f.id]).map(field => (
                      <th key={field.id} className="text-left text-xs font-semibold text-ink-tertiary px-4 py-3 whitespace-nowrap">
                        {field.key}
                      </th>
                    ))}
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {contacts.map((c) => (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/contacts/${c._id}`)}
                      className={`hover:bg-surface-50 transition-colors group cursor-pointer ${c.blocked ? 'opacity-60' : ''}`}
                    >
                      {/* Kontakt (always visible) */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.contactNumber && (
                            <span className="text-xs font-semibold text-ink-tertiary shrink-0">#{c.contactNumber}</span>
                          )}
                          <p className="font-medium text-ink truncate">{c.name}</p>
                          {c.blocked && (
                            <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                              Bloklangan
                            </span>
                          )}
                        </div>
                      </td>

                      {colVis.phone && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-ink-secondary">
                            {c.phone || <span className="text-ink-disabled">—</span>}
                          </span>
                        </td>
                      )}

                      {colVis.email && (
                        <td className="px-4 py-3">
                          <span className="text-sm text-ink-secondary truncate max-w-[220px] block">
                            {c.email || <span className="text-ink-disabled">—</span>}
                          </span>
                        </td>
                      )}

                      {allCustomFields.filter(f => colVis[f.id]).map(field => {
                        const val = c.customFieldValues?.[field.id];
                        const rendered = renderFieldValue(field, val);
                        return (
                          <td key={field.id} className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-ink-secondary">
                              {rendered ?? <span className="text-ink-disabled">—</span>}
                            </span>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/contacts/${c._id}`); }}
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="px-6 py-4 border-t border-surface-100">
                <Pagination page={page} pages={pages} onChange={(p) => load(p)} />
              </div>
            )}
          </>
        )}
      </div>

      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
