import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Send, MessageSquare,
  Trash2, Pencil, Plus, X, Check, ChevronDown, Upload, FileText,
  MoreVertical, ShieldOff, Shield,
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Play, Pause,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY = { name: '', phone: '', email: '' };

const FIELD_TYPES = [
  { value: 'text',        label: 'Matn' },
  { value: 'textarea',    label: 'Katta matn' },
  { value: 'number',      label: 'Son' },
  { value: 'phone',       label: 'Telefon' },
  { value: 'email',       label: 'Email' },
  { value: 'url',         label: 'URL' },
  { value: 'date',        label: 'Sana' },
  { value: 'boolean',     label: "Ha / Yo'q" },
  { value: 'dropdown',    label: 'Dropdown (1 ta)' },
  { value: 'multiselect', label: "Dropdown (ko'p)" },
  { value: 'file',        label: 'Fayl' },
];

const NEEDS_OPTIONS = ['dropdown', 'multiselect'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatTime(iso) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) + ', ' + time;
}

// ─── Custom field input ───────────────────────────────────────────────────────

function CustomFieldInput({ field, value, pendingFile, onChange }) {
  if (field.type === 'boolean') {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-primary-500' : 'bg-surface-200'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={2}
        className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled resize-none leading-relaxed"
        placeholder="—"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  if (field.type === 'dropdown') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return (
      <div className="relative flex-1 min-w-0">
        <select
          className="w-full text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 appearance-none pr-5 cursor-pointer"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">— Tanlang</option>
          {opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const opts = Array.isArray(field.options) ? field.options : [];
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 py-0.5">
        {opts.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              const next = selected.includes(opt)
                ? selected.filter(v => v !== opt)
                : [...selected, opt];
              onChange(next);
            }}
            className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
              selected.includes(opt)
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-transparent border-surface-200 text-ink-secondary hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (field.type === 'file') {
    const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5002/api').replace(/\/api$/, '');
    const uploaded = value && typeof value === 'object' && value.url;
    const hasFile = pendingFile || uploaded;
    const displayName = pendingFile?.name || (uploaded ? value.name : null);
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {hasFile ? (
          <>
            <FileText className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
            {uploaded && !pendingFile ? (
              <a
                href={`${API_BASE}${value.url}?dl=1`}
                className="text-sm text-primary-600 hover:underline truncate flex-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {displayName}
              </a>
            ) : (
              <span className="text-sm text-ink truncate flex-1">{displayName}</span>
            )}
            {pendingFile && (
              <span className="text-[10px] text-amber-500 shrink-0">Saqlanmagan</span>
            )}
            <button
              onClick={() => onChange(null)}
              className="shrink-0 text-ink-tertiary hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <label className="flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-primary-600 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Fayl tanlash</span>
            <input type="file" className="hidden" onChange={e => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
            }} />
          </label>
        )}
      </div>
    );
  }

  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
      placeholder="—"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─── Call history subcomponents ──────────────────────────────────────────────

function fmtPhone(p) {
  if (!p) return '—';
  const s = String(p);
  if (s.length === 12) return `+${s.slice(0,3)} (${s.slice(3,5)}) ${s.slice(5,8)}-${s.slice(8,10)}-${s.slice(10)}`;
  return `+${s}`;
}

function fmtDur(s) {
  if (!s) return null;
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2,'0')}` : `${sec}s`;
}

function fmtDT(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

function MiniAudio({ url }) {
  const [playing, setPlaying] = React.useState(false);
  const ref = React.useRef(null);
  if (!url) return null;
  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} />
      <button
        onClick={toggle}
        className="w-6 h-6 rounded-full bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-colors"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
      <span className="text-[11px] text-ink-tertiary">Audio yozuv</span>
    </div>
  );
}

const CALL_STATUS = {
  ringing:   { label: 'Jiringlagan',        cls: 'bg-amber-50 text-amber-600' },
  active:    { label: 'Faol',               cls: 'bg-emerald-50 text-emerald-600' },
  completed: { label: 'Gaplashildi',        cls: 'bg-surface-100 text-ink-tertiary' },
  missed:    { label: "O'tkazib yuborilgan", cls: 'bg-red-50 text-red-500' },
  cancelled: { label: 'Bekor qilindi',      cls: 'bg-surface-100 text-ink-disabled' },
};

function CallItem({ call }) {
  const isMissed = call.status === 'missed' || call.status === 'cancelled';
  const isOut    = call.direction === 'out';
  const Icon = isMissed ? PhoneMissed : isOut ? PhoneOutgoing : PhoneIncoming;
  const iconCls = isMissed ? 'text-red-400' : isOut ? 'text-blue-400' : 'text-emerald-500';
  const st = CALL_STATUS[call.status] || CALL_STATUS.completed;
  return (
    <div className="flex items-start gap-2.5 py-1 group/call">
      <div className="w-7 h-7 rounded-full bg-surface-100 flex items-center justify-center shrink-0 mt-1">
        <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
      </div>
      <div className="flex-1 min-w-0 bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-surface-100">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-semibold text-ink">
            {isOut ? 'Chiquvchi' : 'Kiruvchi'} qo'ng'iroq
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-px rounded-full ${st.cls}`}>{st.label}</span>
          {call.duration ? <span className="text-[11px] text-ink-tertiary font-mono">{fmtDur(call.duration)}</span> : null}
        </div>
        <p className="text-[11px] text-ink-tertiary">{fmtDT(call.startedAt || call.createdAt)}{call.ext ? ` · Ext: ${call.ext}` : ''}</p>
        <MiniAudio url={call.recordingUrl} />
      </div>
    </div>
  );
}

// ─── Activity subcomponents ───────────────────────────────────────────────────

function SystemEvent({ activity }) {
  let text = '';
  if (activity.type === 'created') text = 'Kontakt yaratildi';
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-surface-100" />
      <span className="text-[11px] text-ink-tertiary whitespace-nowrap px-1">
        {text} · {formatTime(activity.createdAt)}
      </span>
      <div className="flex-1 h-px bg-surface-100" />
    </div>
  );
}

function NoteItem({ activity, onDelete, currentUserId }) {
  const name  = activity.createdBy?.name || 'Foydalanuvchi';
  const isOwn = activity.createdBy?._id === currentUserId || activity.createdBy === currentUserId;
  return (
    <div className="flex items-start gap-2.5 py-1 group/note">
      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-primary-600">{initials(name)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-ink">{name}</span>
          <span className="text-[10px] text-ink-tertiary">{formatTime(activity.createdAt)}</span>
        </div>
        <div className="relative">
          <div className="bg-white border border-surface-200 shadow-sm rounded-xl rounded-tl-sm px-3 py-2 text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
            {activity.text}
          </div>
          {isOwn && (
            <button
              onClick={() => onDelete(activity._id)}
              className="absolute -top-1 -right-1 opacity-0 group-hover/note:opacity-100 transition-opacity w-5 h-5 bg-white border border-surface-100 rounded-full flex items-center justify-center text-ink-tertiary hover:text-red-500 hover:border-red-200"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContactFormPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  // Contact form
  const [form, setForm]                 = useState(EMPTY);
  const [originalForm, setOriginalForm] = useState(EMPTY);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [contactNumber, setContactNumber] = useState(null);
  const [blocked, setBlocked]           = useState(false);
  const [showMenu, setShowMenu]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab]                   = useState('main');
  const nameRef  = useRef(null);
  const menuRef  = useRef(null);

  // Per-contact field values: { [fieldId]: value }
  const [customFieldValues, setCustomFieldValues]             = useState({});
  const [originalCustomFieldValues, setOriginalCustomFieldValues] = useState({});

  // Org-level schema (shared across all contacts)
  const [orgSections, setOrgSections]             = useState([]);
  const [originalOrgSections, setOriginalOrgSections] = useState([]);
  const [activeSectionId, setActiveSectionId]     = useState(null);
  const [addingSection, setAddingSection]         = useState(false);
  const [newSectionName, setNewSectionName]       = useState('');
  const [addingField, setAddingField]             = useState(false);
  const [newField, setNewField]                   = useState({ key: '', type: 'text', options: [] });
  const [newOption, setNewOption]                 = useState('');

  // Activity
  const [activities, setActivities] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [noteText, setNoteText]     = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const meId = useSelector(s => s.auth.user?._id || s.auth.user?.id);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const [contactCalls, setContactCalls] = useState([]);
  const [pendingFileUploads, setPendingFileUploads] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isDirty =
    !isEdit ||
    JSON.stringify(form)               !== JSON.stringify(originalForm) ||
    JSON.stringify(customFieldValues)  !== JSON.stringify(originalCustomFieldValues) ||
    JSON.stringify(orgSections)        !== JSON.stringify(originalOrgSections) ||
    Object.keys(pendingFileUploads).length > 0;

  // ── Load org config + contact ───────────────────────────────────────────────
  useEffect(() => {
    const fetchOrg = axios.get(`${API}/organization/contact-fields`);
    const fetchContact = isEdit ? axios.get(`${API}/contacts/${id}`) : Promise.resolve(null);

    Promise.all([fetchOrg, fetchContact])
      .then(([orgRes, contactRes]) => {
        const secs = Array.isArray(orgRes.data.sections) ? orgRes.data.sections : [];
        setOrgSections(secs);
        setOriginalOrgSections(JSON.parse(JSON.stringify(secs)));
        if (secs.length > 0) setActiveSectionId(secs[0].id);

        if (contactRes) {
          const c = contactRes.data.contact;
          const loaded = {
            name:  c.name  || '',
            phone: c.phone || '',
            email: c.email || '',
          };
          setForm(loaded);
          setOriginalForm(loaded);
          setContactNumber(c.contactNumber || null);
          setBlocked(!!c.blocked);
          const vals = (c.customFieldValues && typeof c.customFieldValues === 'object') ? c.customFieldValues : {};
          setCustomFieldValues(vals);
          setOriginalCustomFieldValues(JSON.parse(JSON.stringify(vals)));
        } else {
          setTimeout(() => nameRef.current?.focus(), 50);
        }
      })
      .catch(err => {
        if (isEdit) { toast.error('Kontakt topilmadi'); navigate('/contacts'); }
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  // ── Activities ──────────────────────────────────────────────────────────────
  const loadActivities = useCallback(async () => {
    if (!isEdit) return;
    setActLoading(true);
    try {
      const r = await axios.get(`${API}/contacts/${id}/activities`);
      setActivities(r.data.activities || []);
    } catch { /**/ }
    finally { setActLoading(false); }
  }, [id, isEdit]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  useEffect(() => {
    setContactCalls([]);
    if (!isEdit) return;
    axios.get(`${API}/atc/calls`, { params: { contact: id, limit: 100 } })
      .then(r => setContactCalls(r.data.calls || []))
      .catch(() => {});
  }, [id, isEdit]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Ism kiritilishi shart');
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      // Avval kutilayotgan fayllarni yuklaymiz
      let finalCustomValues = { ...customFieldValues };
      const pendingEntries = Object.entries(pendingFileUploads);
      if (pendingEntries.length > 0) {
        const results = await Promise.all(
          pendingEntries.map(async ([fieldId, file]) => {
            const fd = new FormData();
            fd.append('file', file);
            const r = await axios.post(`${API}/upload/file`, fd);
            if (!r.data.success) throw new Error(`Fayl yuklanmadi: ${file.name}`);
            return [fieldId, { url: r.data.url, name: r.data.name }];
          })
        );
        for (const [fieldId, fileObj] of results) {
          finalCustomValues[fieldId] = fileObj;
        }
        setCustomFieldValues(finalCustomValues);
        setPendingFileUploads({});
      }

      const orgChanged = JSON.stringify(orgSections) !== JSON.stringify(originalOrgSections);
      const contactChanged =
        !isEdit ||
        JSON.stringify(form) !== JSON.stringify(originalForm) ||
        JSON.stringify(customFieldValues) !== JSON.stringify(originalCustomFieldValues) ||
        pendingEntries.length > 0;

      const promises = [];

      if (orgChanged) {
        promises.push(
          axios.put(`${API}/organization/contact-fields`, { sections: orgSections })
            .then(() => { setOriginalOrgSections(JSON.parse(JSON.stringify(orgSections))); })
        );
      }

      if (contactChanged || !isEdit) {
        const payload = { ...form, customFieldValues: finalCustomValues };
        if (isEdit) {
          promises.push(
            axios.put(`${API}/contacts/${id}`, payload)
              .then(() => {
                setOriginalForm(form);
                setOriginalCustomFieldValues(JSON.parse(JSON.stringify(finalCustomValues)));
                loadActivities();
              })
          );
        } else {
          promises.push(
            axios.post(`${API}/contacts`, payload)
              .then(r => {
                toast.success("Kontakt qo'shildi");
                navigate(`/contacts/${r.data.contact._id}`, { replace: true });
              })
          );
        }
      }

      await Promise.all(promises);
      if (isEdit) toast.success('Saqlandi');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Xato yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  // ── Org section management ───────────────────────────────────────────────────
  const confirmAddSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    const sec = { id: uid(), name, fields: [] };
    setOrgSections(prev => [...prev, sec]);
    setActiveSectionId(sec.id);
    setNewSectionName('');
    setAddingSection(false);
  };

  const deleteSection = (secId) => {
    setOrgSections(prev => prev.filter(s => s.id !== secId));
    setActiveSectionId(orgSections.find(s => s.id !== secId)?.id || null);
    setAddingField(false);
  };

  const deleteCustomField = (secId, fieldId) => {
    setOrgSections(prev => prev.map(s =>
      s.id !== secId ? s : { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
    ));
  };

  const confirmAddField = () => {
    const key = newField.key.trim();
    if (!key) return;
    if (NEEDS_OPTIONS.includes(newField.type) && newField.options.length === 0) return;
    const field = {
      id: uid(), key, type: newField.type,
      ...(NEEDS_OPTIONS.includes(newField.type) ? { options: newField.options } : {}),
    };
    setOrgSections(prev => prev.map(s =>
      s.id !== activeSectionId ? s : { ...s, fields: [...s.fields, field] }
    ));
    setNewField({ key: '', type: 'text', options: [] });
    setNewOption('');
    setAddingField(false);
  };

  const updateFieldValue = (fieldId, value) => {
    if (value instanceof File) {
      setPendingFileUploads(prev => ({ ...prev, [fieldId]: value }));
    } else if (value === null) {
      setPendingFileUploads(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
      setCustomFieldValues(prev => ({ ...prev, [fieldId]: null }));
    } else {
      setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
    }
  };

  // ── Activity handlers ───────────────────────────────────────────────────────
  const handleSendNote = async () => {
    if (!noteText.trim() || !isEdit) return;
    setNoteSending(true);
    try {
      const r = await axios.post(`${API}/contacts/${id}/activities`, { text: noteText.trim() });
      setActivities(prev => [...prev, r.data.activity]);
      setNoteText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      textareaRef.current?.focus();
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setNoteSending(false);
    }
  };

  const handleDeleteNote = async (activityId) => {
    try {
      await axios.delete(`${API}/contacts/${id}/activities/${activityId}`);
      setActivities(prev => prev.filter(a => a._id !== activityId));
    } catch {
      toast.error("O'chirishda xato");
    }
  };

  const handleBlock = async () => {
    setShowMenu(false);
    try {
      await axios.put(`${API}/contacts/${id}`, { blocked: !blocked });
      setBlocked(b => !b);
      toast.success(blocked ? 'Blok olib tashlandi' : 'Kontakt bloklandi');
    } catch {
      toast.error('Xato yuz berdi');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/contacts/${id}`);
      toast.success("Kontakt o'chirildi");
      navigate('/contacts');
    } catch {
      toast.error("O'chirishda xato");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(); }
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // ────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  const activeOrgSection = orgSections.find(s => s.id === activeSectionId);

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-surface-100 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/contacts')}
            className="p-2 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-ink truncate">
            {isEdit ? "Ma'lumotlarni o'zgartirish" : 'Yangi kontakt'}
          </h1>
          {blocked && (
            <span className="text-xs font-medium bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
              Bloklangan
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <button onClick={handleSave} disabled={saving} className="btn-md btn-primary">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Saqlash
            </button>
          )}
          {isEdit && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(m => !m)}
                className="p-2 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-100 rounded-xl shadow-lg py-1 min-w-[180px]">
                    <button
                      onClick={handleBlock}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors"
                    >
                      {blocked ? <Shield className="w-4 h-4 text-green-500" /> : <ShieldOff className="w-4 h-4 text-orange-400" />}
                      {blocked ? 'Blokdan chiqarish' : 'Bloklash'}
                    </button>
                    <div className="my-1 border-t border-surface-100" />
                    <button
                      onClick={() => { setShowMenu(false); setConfirmDelete(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      O'chirish
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[340px]">
            <p className="text-base font-semibold text-ink mb-1">Kontaktni o'chirish</p>
            <p className="text-sm text-ink-tertiary mb-5">
              <span className="font-medium text-ink">{form.name}</span> o'chiriladi. Bu amalni bekor qilib bo'lmaydi.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-md btn-secondary flex-1">Bekor</button>
              <button onClick={handleDelete} className="btn-md flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT ── */}
        <div className="w-[460px] xl:w-[520px] shrink-0 border-r border-surface-100 flex flex-col bg-white">

          {/* Name */}
          <div className="px-5 pt-5 pb-4 border-b border-surface-100 shrink-0">
            <div className="flex items-center gap-2 group/name">
              {contactNumber && (
                <span className="text-sm font-semibold text-ink shrink-0">#{contactNumber}</span>
              )}
              <div className="relative flex-1 min-w-0">
                <input
                  ref={nameRef}
                  className="w-full text-lg font-bold text-ink bg-transparent hover:bg-surface-50 focus:bg-transparent rounded-lg border-b-2 border-transparent focus:border-primary-300 outline-none focus:outline-none focus:ring-0 pr-6 py-0.5 transition-all placeholder:text-ink-disabled cursor-default focus:cursor-text"
                  placeholder="To'liq ism..."
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
                <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover/name:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 py-3 border-b border-surface-100 shrink-0">
            <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
              {[['main', 'Asosiy'], ['settings', 'Sozlama']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    tab === key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ─── Asosiy tab ─── */}
            {tab === 'main' && (
              <div className="space-y-4">
                {/* Default fields */}
                <div className="border border-surface-100 rounded-xl overflow-hidden">
                  <div className="divide-y divide-surface-100">
                    <div className="flex items-center gap-4 px-4 py-2.5">
                      <span className="w-28 text-sm text-ink shrink-0">Telefon</span>
                      <input
                        className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                        placeholder="+998..."
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-4 px-4 py-2.5">
                      <span className="w-28 text-sm text-ink shrink-0">Email</span>
                      <input
                        type="email"
                        className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                        placeholder="email@..."
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Custom sections */}
                {orgSections.filter(s => s.fields.length > 0).map(sec => (
                  <div key={sec.id}>
                    <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">
                      {sec.name}
                    </p>
                    <div className="border border-surface-100 rounded-xl overflow-hidden">
                      <div className="divide-y divide-surface-100">
                        {sec.fields.map(field => (
                          <div key={field.id} className="flex items-center gap-4 px-4 py-2.5">
                            <span className="w-28 text-sm text-ink shrink-0">{field.key}</span>
                            <CustomFieldInput
                              field={field}
                              value={customFieldValues[field.id]}
                              pendingFile={pendingFileUploads[field.id] || null}
                              onChange={val => updateFieldValue(field.id, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Sozlama tab: faqat schema editor ─── */}
            {tab === 'settings' && (
              <div className="space-y-5">

                {/* Bo'limlar */}
                <div>
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Bo'limlar</p>

                  {/* Default Asosiy */}
                  <div className="flex items-center justify-between py-2.5 px-3 bg-surface-50 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">Asosiy</span>
                      <span className="text-[10px] text-ink-tertiary bg-surface-100 px-1.5 py-0.5 rounded">Default</span>
                    </div>
                    <span className="text-xs text-ink-tertiary">Telefon · Email · Ma'sul shaxs</span>
                  </div>

                  {/* Custom sections */}
                  {orgSections.map(sec => (
                    <div key={sec.id} className="flex items-center justify-between py-2.5 px-3 border border-surface-100 rounded-lg mb-2 group/sec">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-ink truncate">{sec.name}</span>
                        <span className="text-[10px] text-ink-tertiary shrink-0">{sec.fields.length} ta maydon</span>
                      </div>
                      <button
                        onClick={() => deleteSection(sec.id)}
                        className="opacity-0 group-hover/sec:opacity-100 p-1 rounded text-ink-tertiary hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Yangi bo'lim qo'shish */}
                  {addingSection ? (
                    <div className="flex items-center gap-2 py-2">
                      <input
                        autoFocus
                        className="input flex-1 text-sm"
                        placeholder="Bo'lim nomi..."
                        value={newSectionName}
                        onChange={e => setNewSectionName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmAddSection();
                          if (e.key === 'Escape') { setAddingSection(false); setNewSectionName(''); }
                        }}
                      />
                      <button onClick={confirmAddSection} className="btn-sm btn-primary">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setAddingSection(false); setNewSectionName(''); }}
                        className="btn-sm btn-secondary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSection(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-surface-200 rounded-lg text-sm text-ink-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Yangi bo'lim qo'shish
                    </button>
                  )}
                </div>

                {/* Maydonlar */}
                {orgSections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Maydonlar</p>

                    {/* Section tanlov */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {orgSections.map(sec => (
                        <button
                          key={sec.id}
                          onClick={() => { setActiveSectionId(sec.id); setAddingField(false); }}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            activeSectionId === sec.id
                              ? 'bg-primary-500 text-white'
                              : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                          }`}
                        >
                          {sec.name}
                        </button>
                      ))}
                    </div>

                    {activeOrgSection && (
                      <div className="space-y-1">
                        {activeOrgSection.fields.length === 0 && !addingField && (
                          <p className="text-xs text-ink-tertiary py-2">Hali maydon yo'q</p>
                        )}
                        {activeOrgSection.fields.map(field => (
                          <div key={field.id} className="flex items-center gap-3 py-2 border-b border-surface-50 group/field">
                            <span className="flex-1 text-sm text-ink">{field.key}</span>
                            <span className="text-xs text-ink-tertiary bg-surface-100 px-2 py-0.5 rounded-full shrink-0">
                              {FIELD_TYPES.find(t => t.value === field.type)?.label}
                            </span>
                            <button
                              onClick={() => deleteCustomField(activeOrgSection.id, field.id)}
                              className="shrink-0 opacity-0 group-hover/field:opacity-100 p-1 rounded text-ink-tertiary hover:text-red-500 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {addingField ? (
                          <div className="pt-3 space-y-2.5">
                            {/* Field name + type */}
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                className="input flex-1 text-sm"
                                placeholder="Maydon nomi..."
                                value={newField.key}
                                onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !NEEDS_OPTIONS.includes(newField.type)) confirmAddField();
                                  if (e.key === 'Escape') { setAddingField(false); setNewField({ key: '', type: 'text', options: [] }); setNewOption(''); }
                                }}
                              />
                              <div className="relative w-36 shrink-0">
                                <select
                                  className="input appearance-none pr-7 text-sm"
                                  value={newField.type}
                                  onChange={e => setNewField(f => ({ ...f, type: e.target.value, options: [] }))}
                                >
                                  {FIELD_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                              </div>
                            </div>

                            {/* Options editor for dropdown / multiselect */}
                            {NEEDS_OPTIONS.includes(newField.type) && (
                              <div className="pl-1 space-y-1.5">
                                <p className="text-xs text-ink-tertiary">Variantlar {newField.options.length === 0 && <span className="text-red-400">(kamida 1 ta)</span>}</p>
                                {newField.options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-ink bg-surface-50 px-2.5 py-1 rounded-lg">{opt}</span>
                                    <button
                                      onClick={() => setNewField(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                                      className="p-1 text-ink-tertiary hover:text-red-500 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <input
                                    className="input flex-1 text-sm"
                                    placeholder="Variant nomi..."
                                    value={newOption}
                                    onChange={e => setNewOption(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (newOption.trim()) {
                                          setNewField(f => ({ ...f, options: [...f.options, newOption.trim()] }));
                                          setNewOption('');
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      if (newOption.trim()) {
                                        setNewField(f => ({ ...f, options: [...f.options, newOption.trim()] }));
                                        setNewOption('');
                                      }
                                    }}
                                    className="btn-sm btn-secondary shrink-0"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button onClick={confirmAddField} className="btn-sm btn-primary flex-1">
                                <Check className="w-3.5 h-3.5" /> Qo'shish
                              </button>
                              <button
                                onClick={() => { setAddingField(false); setNewField({ key: '', type: 'text', options: [] }); setNewOption(''); }}
                                className="btn-sm btn-secondary flex-1"
                              >
                                Bekor
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingField(true)}
                            className="mt-2 flex items-center gap-1.5 text-xs text-ink-tertiary hover:text-primary-600 transition-colors py-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Maydon qo'shish
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Activity feed (notes + calls merged) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-surface-50">
          <div className="px-5 py-3 border-b border-surface-100 bg-white shrink-0">
            <p className="text-sm font-semibold text-ink">Faoliyat tarixi</p>
            <p className="text-xs text-ink-tertiary mt-0.5">Izohlar, qo'ng'iroqlar va o'zgarishlar</p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!isEdit ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 bg-white border border-surface-100 rounded-2xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-ink-disabled" />
                </div>
                <p className="text-sm font-medium text-ink-secondary">Faoliyat</p>
                <p className="text-xs text-ink-tertiary mt-1 max-w-[200px]">
                  Kontakt saqlanganidan keyin izoh va yozuvlar qo'sha olasiz
                </p>
              </div>
            ) : actLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              </div>
            ) : (activities.length === 0 && contactCalls.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 bg-white border border-surface-100 rounded-2xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-ink-disabled" />
                </div>
                <p className="text-sm font-medium text-ink-secondary">Faoliyat yo'q</p>
                <p className="text-xs text-ink-tertiary mt-1">Birinchi izohni yozing</p>
              </div>
            ) : (() => {
              const actItems = activities.map(a => ({ ...a, _feedType: 'activity', _ts: new Date(a.createdAt).getTime() }));
              const callItems = contactCalls.map(c => ({ ...c, _feedType: 'call', _ts: new Date(c.createdAt).getTime() }));
              const merged = [...actItems, ...callItems].sort((a, b) => a._ts - b._ts);
              return (
                <div className="space-y-0.5">
                  {merged.map(item =>
                    item._feedType === 'call'
                      ? <CallItem key={`call-${item._id}`} call={item} />
                      : item.type === 'note'
                        ? <NoteItem key={item._id} activity={item} onDelete={handleDeleteNote} currentUserId={meId} />
                        : <SystemEvent key={item._id} activity={item} />
                  )}
                  <div ref={bottomRef} />
                </div>
              );
            })()}
          </div>

          {isEdit && (
            <div className="shrink-0 border-t border-surface-100 bg-white px-4 py-3">
              <div className="flex items-end bg-surface-50 rounded-xl border border-surface-200 focus-within:border-primary-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-200">
                <textarea
                  ref={textareaRef}
                  className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-tertiary resize-none border-0 outline-none focus:outline-none focus:ring-0 leading-relaxed px-4 py-3"
                  placeholder="Izoh yozing..."
                  rows={3}
                  value={noteText}
                  onChange={e => { setNoteText(e.target.value); autoResize(e); }}
                  onKeyDown={handleKeyDown}
                />
                <div
                  className="shrink-0 p-2 transition-all duration-150"
                  style={{
                    opacity: noteText.trim() ? 1 : 0,
                    transform: noteText.trim() ? 'scale(1)' : 'scale(0.7)',
                    pointerEvents: noteText.trim() ? 'auto' : 'none',
                  }}
                >
                  <button
                    onClick={handleSendNote}
                    disabled={noteSending}
                    className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-400 active:scale-95 transition-all"
                  >
                    {noteSending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
              {noteText && (
                <p className="text-[10px] text-ink-tertiary mt-1.5 px-1">Shift+Enter — yangi qator</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
