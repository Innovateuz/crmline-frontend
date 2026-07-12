import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useT } from '../utils/translate';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Send, MessageSquare, Trash2, Pencil,
  Plus, X, Check, ChevronDown, Upload, FileText, MoreVertical,
  User, DollarSign, Kanban, Phone, Trophy, XCircle, RotateCcw,
  Mail, AlertCircle, ExternalLink, Layers,
} from 'lucide-react';
import { getSocket } from '../utils/socket';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// ─── Floating dropdown (portal, fixed-positioned, no clipping) ───────────────

function FloatingDropdown({ anchorRef, open, onClose, children, minWidth = 240 }) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = 260; // approximate max height
    const top = spaceBelow > dropH ? rect.bottom + 4 : rect.top - dropH - 4;
    setStyle({ top, left: rect.left, minWidth: Math.max(minWidth, rect.width) });
  }, [open, anchorRef, minWidth]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden"
        style={style}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

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
];
const NEEDS_OPTIONS = ['dropdown', 'multiselect'];

function uid() { return Math.random().toString(36).slice(2, 9); }
function initials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function formatTime(iso) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) + ', ' + time;
}
function fmtNum(n) { return n ? n.toLocaleString('uz-UZ') : '0'; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function CustomFieldInput({ field, value, onChange }) {
  if (field.type === 'boolean') {
    return (
      <button type="button" onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-primary-500' : 'bg-surface-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea rows={2}
        className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled resize-none leading-relaxed"
        placeholder="—" value={value || ''} onChange={e => onChange(e.target.value)} />
    );
  }
  if (field.type === 'dropdown') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return (
      <div className="relative flex-1 min-w-0">
        <select className="w-full text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 appearance-none pr-5 cursor-pointer"
          value={value || ''} onChange={e => onChange(e.target.value)}>
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
          <button key={opt} type="button"
            onClick={() => onChange(selected.includes(opt) ? selected.filter(v => v !== opt) : [...selected, opt])}
            className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${selected.includes(opt) ? 'bg-primary-500 border-primary-500 text-white' : 'bg-transparent border-surface-200 text-ink-secondary hover:border-primary-300 hover:text-primary-600'}`}>
            {opt}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
      placeholder="—" value={value || ''} onChange={e => onChange(e.target.value)} />
  );
}

function SystemEvent({ activity }) {
  const colorMap = {
    created:       'text-ink-tertiary',
    stage_changed: 'text-primary-600',
    won:           'text-emerald-600',
    lost:          'text-red-500',
  };
  const labelMap = { created: 'Yaratildi' };
  const text = labelMap[activity.type] || activity.text || '';
  const color = colorMap[activity.type] || 'text-ink-tertiary';
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-surface-100" />
      <span className={`text-[11px] font-medium whitespace-nowrap px-1 ${color}`}>
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
            <button onClick={() => onDelete(activity._id)}
              className="absolute -top-1 -right-1 opacity-0 group-hover/note:opacity-100 transition-opacity w-5 h-5 bg-white border border-surface-100 rounded-full flex items-center justify-center text-ink-tertiary hover:text-red-500 hover:border-red-200">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DealDetailPage({ funnelId, dealId }) {
  const navigate  = useNavigate();
  const t = useT();
  const currency  = useSelector(s => s.auth.user?.organization?.currency || 'UZS');
  const meId      = useSelector(s => s.auth.user?._id || s.auth.user?.id);
  const allFunnels = useSelector(s => s.funnels.list);
  const isNew     = dealId === 'new';

  // Core data
  const [funnel,   setFunnel]   = useState(null);
  const [deal,     setDeal]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('main');

  // Form state
  const [title,      setTitle]      = useState('');
  const [stageId,    setStageId]    = useState('');
  const [value,      setValue]      = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [contact,    setContact]    = useState('');
  const [source,     setSource]     = useState('');
  const [notes,      setNotes]      = useState('');

  // Custom fields
  const [customFieldValues,    setCustomFieldValues]    = useState({});
  const [origCustomFieldValues, setOrigCustomFieldValues] = useState({});
  const [orgSections,          setOrgSections]          = useState([]);
  const [origOrgSections,      setOrigOrgSections]      = useState([]);
  const [activeSectionId,      setActiveSectionId]      = useState(null);
  const [addingSection,        setAddingSection]        = useState(false);
  const [newSectionName,       setNewSectionName]       = useState('');
  const [addingField,          setAddingField]          = useState(false);
  const [newField,             setNewField]             = useState({ key: '', type: 'text', options: [] });
  const [newOption,            setNewOption]            = useState('');

  // Aux data
  const [contacts, setContacts] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [dealSources, setDealSources] = useState([]);
  const [linkedContact,        setLinkedContact]        = useState(null);
  const [linkedContactLoading, setLinkedContactLoading] = useState(false);
  const [showAssignedPicker, setShowAssignedPicker] = useState(false);
  const [showContactPicker,  setShowContactPicker]  = useState(false);
  const [contactSearch,      setContactSearch]      = useState('');
  const [confirmDelete,      setConfirmDelete]      = useState(false);
  const [showMenu,           setShowMenu]           = useState(false);

  // Boshqa varonkaga o'tkazish
  const [showMoveFunnel,     setShowMoveFunnel]     = useState(false);
  const [moveFunnelId,       setMoveFunnelId]       = useState('');
  const [moveStageId,        setMoveStageId]        = useState('');
  const [moving,             setMoving]             = useState(false);

  // Files
  const [files,        setFiles]        = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Activities
  const [activities,   setActivities]  = useState([]);
  const [actLoading,   setActLoading]  = useState(false);
  const [noteText,     setNoteText]    = useState('');
  const [noteSending,  setNoteSending] = useState(false);

  // Deal calls (statistika uchun)
  const [dealCalls,    setDealCalls]   = useState([]);

  // F-12: won/lost status
  const [dealStatus,   setDealStatus]  = useState('active');
  const [closeReason,  setCloseReason] = useState('');
  const [showWonLost,  setShowWonLost] = useState(false); // 'won'|'lost'|false
  const [wlReason,     setWlReason]    = useState('');
  const bottomRef        = useRef(null);
  const textareaRef      = useRef(null);
  const contactAnchorRef = useRef(null);
  const assignedAnchorRef = useRef(null);

  // Originals for dirty check
  const [origTitle,      setOrigTitle]      = useState('');
  const [origStageId,    setOrigStageId]    = useState('');
  const [origValue,      setOrigValue]      = useState('');
  const [origAssignedTo, setOrigAssignedTo] = useState('');
  const [origContact,    setOrigContact]    = useState('');
  const [origSource,     setOrigSource]     = useState('');

  const isDirty = isNew || (
    title !== origTitle ||
    stageId !== origStageId ||
    String(value) !== String(origValue) ||
    assignedTo !== origAssignedTo ||
    contact !== origContact ||
    source !== origSource ||
    JSON.stringify(customFieldValues) !== JSON.stringify(origCustomFieldValues) ||
    JSON.stringify(orgSections) !== JSON.stringify(origOrgSections)
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [fRes, cRes, uRes, fieldsRes, sourcesRes] = await Promise.all([
          isNew
            ? axios.get(`${API}/funnels/${funnelId}`)
            : axios.get(`${API}/funnels/${funnelId}/deals/${dealId}`),
          axios.get(`${API}/contacts?limit=200`),
          axios.get(`${API}/organization/users`),
          axios.get(`${API}/organization/deal-fields`),
          axios.get(`${API}/organization/deal-sources`),
        ]);
        setDealSources(sourcesRes.data.sources || []);

        const funnelData = fRes.data.funnel;
        setFunnel(funnelData);

        const secs = Array.isArray(fieldsRes.data.sections) ? fieldsRes.data.sections : [];
        setOrgSections(secs);
        setOrigOrgSections(JSON.parse(JSON.stringify(secs)));
        if (secs.length > 0) setActiveSectionId(secs[0].id);

        setContacts(cRes.data.contacts || []);
        setUsers(uRes.data.users || []);

        if (!isNew) {
          const d = fRes.data.deal;
          setDeal(d);
          setTitle(d.title || '');
          setStageId(String(d.stageId || ''));
          setValue(d.value ?? '');
          setAssignedTo(d.assignedTo?._id || d.assignedTo || '');
          setContact(d.contact?._id || d.contact || '');
          setSource(d.source || '');
          setNotes(d.notes || '');
          setFiles(d.files || []);
          setDealStatus(d.status || 'active');
          setCloseReason(d.closeReason || '');
          const vals = d.customFieldValues || {};
          setCustomFieldValues(vals);
          setCustomFieldValues(vals);
          setOrigCustomFieldValues(JSON.parse(JSON.stringify(vals)));
          // originals
          setOrigTitle(d.title || '');
          setOrigStageId(String(d.stageId || ''));
          setOrigValue(d.value ?? '');
          setOrigAssignedTo(d.assignedTo?._id || d.assignedTo || '');
          setOrigContact(d.contact?._id || d.contact || '');
          setOrigSource(d.source || '');
        } else {
          // New deal: first stage + current user as default assignee
          const firstStage = funnelData?.stages?.[0];
          setStageId(firstStage ? String(firstStage._id) : '');
          setOrigStageId(firstStage ? String(firstStage._id) : '');
          if (meId) setAssignedTo(meId);
        }
      } catch {
        toast.error('Yuklanmadi');
        navigate(`/funnel/${funnelId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [funnelId, dealId, isNew, navigate, meId]);

  // Activities
  const loadActivities = useCallback(async () => {
    if (isNew) return;
    setActLoading(true);
    try {
      const r = await axios.get(`${API}/funnels/${funnelId}/deals/${dealId}/activities`);
      setActivities(r.data.activities || []);
    } catch { /**/ }
    finally { setActLoading(false); }
  }, [funnelId, dealId, isNew]);

  useEffect(() => { loadActivities(); }, [loadActivities]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activities]);

  // Real-time sync: boshqa foydalanuvchi shu sdelkaga izoh qo'shsa/o'chirsa
  // yoki bosqichini o'zgartirsa — bu yerda ochib turgan odamda ham darhol ko'rinadi.
  useEffect(() => {
    if (isNew) return;
    const socket = getSocket();
    const onActivityCreated = ({ dealId: did, activity }) => {
      if (String(did) !== String(dealId)) return;
      setActivities(prev => prev.some(a => a._id === activity._id) ? prev : [...prev, activity]);
    };
    const onActivityDeleted = ({ dealId: did, activityId }) => {
      if (String(did) !== String(dealId)) return;
      setActivities(prev => prev.filter(a => a._id !== activityId));
    };
    socket.on('deal:activity-created', onActivityCreated);
    socket.on('deal:activity-deleted', onActivityDeleted);
    return () => {
      socket.off('deal:activity-created', onActivityCreated);
      socket.off('deal:activity-deleted', onActivityDeleted);
    };
  }, [dealId, isNew]);

  // Biriktirilgan kontaktning to'liq ma'lumotini tortib olish (200 talik ro'yxatga tayanmasdan)
  useEffect(() => {
    if (!contact) { setLinkedContact(null); return; }
    setLinkedContactLoading(true);
    axios.get(`${API}/contacts/${contact}`)
      .then(r => setLinkedContact(r.data.contact))
      .catch(() => setLinkedContact(null))
      .finally(() => setLinkedContactLoading(false));
  }, [contact]);

  // Statistika tab: qo'ng'iroqlarni deal va/yoki kontakt bo'yicha yuklash
  useEffect(() => {
    if (tab !== 'stats' || isNew) return;
    const promises = [];
    if (dealId) promises.push(axios.get(`${API}/atc/calls`, { params: { deal: dealId, limit: 200 } }).then(r => r.data.calls || []));
    if (contact) promises.push(axios.get(`${API}/atc/calls`, { params: { contact, limit: 200 } }).then(r => r.data.calls || []));
    if (promises.length === 0) { setDealCalls([]); return; }
    Promise.all(promises).then(results => {
      const merged = Object.values(
        results.flat().reduce((acc, c) => { acc[c._id] = c; return acc; }, {})
      );
      setDealCalls(merged);
    }).catch(() => {});
  }, [tab, contact, dealId, isNew]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error('Sarlavha kiritilishi shart'); return; }
    if (!stageId) { toast.error(t('deals.stage') + '!'); return; }
    setSaving(true);
    try {
      const orgChanged = JSON.stringify(orgSections) !== JSON.stringify(origOrgSections);
      if (orgChanged) {
        await axios.put(`${API}/organization/deal-fields`, { sections: orgSections });
        setOrigOrgSections(JSON.parse(JSON.stringify(orgSections)));
      }

      const payload = {
        title: title.trim(), stageId, value: Number(value) || 0,
        assignedTo: assignedTo || null, contact: contact || null,
        source: source || '',
        notes, customFieldValues,
      };

      if (isNew) {
        const res = await axios.post(`${API}/funnels/${funnelId}/deals`, payload);
        toast.success(t('deals.created'));
        navigate(`/funnel/${funnelId}/deal/${res.data.deal._id}`, { replace: true });
      } else {
        await axios.put(`${API}/funnels/${funnelId}/deals/${dealId}`, payload);
        setOrigTitle(title);
        setOrigStageId(stageId);
        setOrigValue(value);
        setOrigAssignedTo(assignedTo);
        setOrigContact(contact);
        setOrigSource(source);
        setOrigCustomFieldValues(JSON.parse(JSON.stringify(customFieldValues)));
        toast.success('Saqlandi');
        loadActivities();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('deals.loadError'));
    } finally {
      setSaving(false);
    }
  };

  // F-12: Won / Lost
  const handleSetStatus = async (status, reason) => {
    try {
      await axios.put(`${API}/funnels/${funnelId}/deals/${dealId}`, { status, closeReason: reason });
      setDealStatus(status);
      setCloseReason(reason);
      setShowWonLost(false);
      setWlReason('');
      toast.success(status === 'won' ? 'Bitim yutildi!' : status === 'lost' ? "Bitim yo'qotildi" : 'Holat yangilandi');
      loadActivities();
    } catch {
      toast.error(t('deals.loadError'));
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/funnels/${funnelId}/deals/${dealId}`);
      toast.success("O'chirildi");
      navigate(`/funnel/${funnelId}`);
    } catch {
      toast.error(t('deals.loadError'));
    }
  };

  // ── Boshqa varonkaga o'tkazish ───────────────────────────────────────────
  const moveTargetFunnels = allFunnels.filter(f => String(f._id) !== String(funnelId));
  const moveTargetFunnel  = moveTargetFunnels.find(f => String(f._id) === String(moveFunnelId));

  const openMoveFunnel = () => {
    setShowMenu(false);
    setMoveFunnelId('');
    setMoveStageId('');
    setShowMoveFunnel(true);
  };

  const handleMoveFunnel = async () => {
    if (!moveFunnelId || !moveStageId) return;
    setMoving(true);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/${dealId}/move`, {
        targetFunnelId: moveFunnelId, targetStageId: moveStageId,
      });
      toast.success(t('deals.moveSuccess'));
      setShowMoveFunnel(false);
      navigate(`/funnel/${moveFunnelId}/deal/${res.data.deal._id}`, { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t('deals.loadError'));
    } finally {
      setMoving(false);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || isNew) return;
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await axios.post(`${API}/upload/file`, form);
      const { url, name: fileName, size, type } = uploadRes.data;
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/${dealId}/files`, { name: fileName, url, size, type });
      setFiles(res.data.files);
      toast.success('Fayl yuklandi');
    } catch {
      toast.error('Yuklashda xato');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      const res = await axios.delete(`${API}/funnels/${funnelId}/deals/${dealId}/files/${fileId}`);
      setFiles(res.data.files);
    } catch {
      toast.error(t('deals.loadError'));
    }
  };

  // ── Activity ─────────────────────────────────────────────────────────────
  const handleSendNote = async () => {
    if (!noteText.trim() || isNew) return;
    setNoteSending(true);
    try {
      const r = await axios.post(`${API}/funnels/${funnelId}/deals/${dealId}/activities`, { text: noteText.trim() });
      setActivities(prev => [...prev, r.data.activity]);
      setNoteText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      textareaRef.current?.focus();
    } catch {
      toast.error(t('deals.loadError'));
    } finally {
      setNoteSending(false);
    }
  };

  const handleDeleteNote = async (actId) => {
    try {
      await axios.delete(`${API}/funnels/${funnelId}/deals/${dealId}/activities/${actId}`);
      setActivities(prev => prev.filter(a => a._id !== actId));
    } catch { toast.error(t('deals.loadError')); }
  };

  // ── Org sections ─────────────────────────────────────────────────────────
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
    setOrgSections(prev => prev.map(s => s.id !== secId ? s : { ...s, fields: s.fields.filter(f => f.id !== fieldId) }));
  };
  const confirmAddField = () => {
    const key = newField.key.trim();
    if (!key) return;
    if (NEEDS_OPTIONS.includes(newField.type) && newField.options.length === 0) return;
    const field = { id: uid(), key, type: newField.type, ...(NEEDS_OPTIONS.includes(newField.type) ? { options: newField.options } : {}) };
    setOrgSections(prev => prev.map(s => s.id !== activeSectionId ? s : { ...s, fields: [...s.fields, field] }));
    setNewField({ key: '', type: 'text', options: [] });
    setNewOption('');
    setAddingField(false);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const activeOrgSection = orgSections.find(s => s.id === activeSectionId);
  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.phone?.includes(contactSearch)
  ).slice(0, 30);

  const assignedUser    = users.find(u => u._id === assignedTo);
  const selectedContact = contacts.find(c => c._id === contact);
  const selectedStage   = funnel?.stages?.find(s => String(s._id) === stageId);
  const isLead          = funnel?.stages?.[0] && String(funnel.stages[0]._id) === stageId;

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-2 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4 border-b border-surface-100 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={() => navigate(`/funnel/${funnelId}`)}
            className="p-2 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-ink-tertiary shrink-0">{funnel?.name}</span>
            <span className="text-ink-disabled">/</span>
            <h1 className="text-lg font-bold text-ink truncate">
              {isNew ? (isLead ? 'Yangi zayavka' : 'Yangi sdelka') : (title || '—')}
            </h1>
          </div>
          {!isNew && isLead && (
            <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Zayavka</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
          {/* F-12: won/lost status badge + buttons */}
          {!isNew && dealStatus === 'won' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Yutildi</span>
              <button onClick={() => handleSetStatus('active', '')} title="Faolga qaytarish" className="ml-1 text-emerald-400 hover:text-emerald-700 transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
          {!isNew && dealStatus === 'lost' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-red-600">Yo'qotildi</span>
              {closeReason && <span className="text-[10px] text-red-400 truncate max-w-[100px]">{closeReason}</span>}
              <button onClick={() => handleSetStatus('active', '')} title="Faolga qaytarish" className="ml-1 text-red-400 hover:text-red-600 transition-colors">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
          {!isNew && dealStatus === 'active' && (
            <>
              <button onClick={() => { setShowWonLost('won'); setWlReason(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 transition-colors">
                <Trophy className="w-3.5 h-3.5" /> Yutildi
              </button>
              <button onClick={() => { setShowWonLost('lost'); setWlReason(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-medium text-red-600 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Yo'qotildi
              </button>
            </>
          )}
          {isDirty && (
            <button onClick={handleSave} disabled={saving} className="btn-md btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('deals.save')}
            </button>
          )}
          {!isNew && (
            <div className="relative">
              <button onClick={() => setShowMenu(m => !m)}
                className="p-2 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-100 rounded-xl shadow-lg py-1 min-w-[220px]">
                    {moveTargetFunnels.length > 0 && (
                      <button onClick={openMoveFunnel}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-surface-100 transition-colors">
                        <Layers className="w-4 h-4" /> {t('deals.moveToFunnel')}
                      </button>
                    )}
                    <button onClick={() => { setShowMenu(false); setConfirmDelete(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" /> {t('deals.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Won/Lost modal ── */}
      {showWonLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowWonLost(false); setWlReason(''); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${showWonLost === 'won' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {showWonLost === 'won'
                ? <Trophy className="w-6 h-6 text-emerald-600" />
                : <XCircle className="w-6 h-6 text-red-500" />}
            </div>
            <h3 className="text-base font-bold text-ink text-center mb-1">
              {showWonLost === 'won' ? t('deals.wonTitle') : t('deals.lostTitle')}
            </h3>
            <p className="text-sm text-ink-tertiary text-center mb-5">
              {showWonLost === 'won' ? t('deals.wonReason') : t('deals.lostReason')}
            </p>
            <textarea
              autoFocus
              className="input w-full resize-none text-sm"
              rows={2}
              placeholder={t('deals.reasonPlaceholder')}
              value={wlReason}
              onChange={e => setWlReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowWonLost(false); setWlReason(''); }} className="btn-secondary btn-md flex-1">{t('deals.cancel')}</button>
              <button
                onClick={() => handleSetStatus(showWonLost, wlReason)}
                className={`btn-md flex-1 font-medium rounded-xl transition-colors text-white ${showWonLost === 'won' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {t('deals.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[340px]">
            <p className="text-base font-semibold text-ink mb-1">{t('deals.deleteConfirm')}</p>
            <p className="text-sm text-ink-tertiary mb-5">
              <span className="font-medium text-ink">{title}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button onClick={handleDelete} className="btn-md flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">{t('deals.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Boshqa varonkaga o'tkazish modal ── */}
      {showMoveFunnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="text-base font-semibold text-ink mb-4">{t('deals.moveToFunnel')}</p>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.moveFunnelLabel')}</label>
            <select
              className="input w-full mb-3"
              value={moveFunnelId}
              onChange={e => { setMoveFunnelId(e.target.value); setMoveStageId(''); }}
            >
              <option value="">{t('deals.moveFunnelPlaceholder')}</option>
              {moveTargetFunnels.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.stage')}</label>
            <select
              className="input w-full mb-5"
              value={moveStageId}
              onChange={e => setMoveStageId(e.target.value)}
              disabled={!moveTargetFunnel}
            >
              <option value="">{t('deals.moveStagePlaceholder')}</option>
              {(moveTargetFunnel?.stages || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>

            <div className="flex gap-2">
              <button onClick={() => setShowMoveFunnel(false)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button
                onClick={handleMoveFunnel}
                disabled={!moveFunnelId || !moveStageId || moving}
                className="btn-md btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {moving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('deals.moveSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-column body (telefonda vertikal stack, desktopda yonma-yon) ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">

        {/* ── LEFT ── */}
        <div className="w-full lg:w-[460px] xl:w-[520px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-surface-100 flex flex-col bg-white">

          {/* Title */}
          <div className="px-5 pt-5 pb-4 border-b border-surface-100 shrink-0">
            <div className="flex items-center gap-2 group/name">
              <div className="relative flex-1 min-w-0">
                <input
                  className="w-full text-lg font-bold text-ink bg-transparent hover:bg-surface-50 focus:bg-transparent rounded-lg border-b-2 border-transparent focus:border-primary-300 outline-none focus:outline-none focus:ring-0 pr-6 py-0.5 transition-all placeholder:text-ink-disabled cursor-default focus:cursor-text"
                  placeholder={isLead ? 'Mijoz ismi...' : 'Sdelka nomi...'}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                <Pencil className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary opacity-0 group-hover/name:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 py-3 border-b border-surface-100 shrink-0">
            <div className="flex bg-surface-100 rounded-xl p-1 gap-1">
              {[['main', 'Asosiy'], ['stats', 'Statistika'], ['files', 'Fayllar'], ['settings', 'Sozlama']].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === k ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Tab body */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-5 py-4">

            {/* ─── Asosiy tab ─── */}
            {tab === 'main' && (
              <div className="space-y-4">
                {/* Main info card */}
                <div className="border border-surface-100 rounded-xl overflow-hidden divide-y divide-surface-100">

                  {/* Stage */}
                  <div className="flex items-center gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <Kanban className="w-3.5 h-3.5 text-ink-tertiary" />
                      <span className="text-sm text-ink">{t('deals.stage')}</span>
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <select className="w-full text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 appearance-none pr-5 cursor-pointer"
                        value={stageId} onChange={e => setStageId(e.target.value)}>
                        {(funnel?.stages || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                    </div>
                    {selectedStage && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedStage.color || '#94a3b8' }} />
                    )}
                  </div>

                  {/* Value */}
                  <div className="flex items-center gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <DollarSign className="w-3.5 h-3.5 text-ink-tertiary" />
                      <span className="text-sm text-ink">{t('deals.value')}</span>
                    </div>
                    <input type="number" min="0"
                      className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                      placeholder="0" value={value} onChange={e => setValue(e.target.value)} />
                    <span className="text-xs text-ink-tertiary shrink-0">{currency}</span>
                  </div>

                  {/* Source */}
                  {dealSources.length > 0 && (
                    <div className="flex items-center gap-4 px-4 py-2.5">
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <Layers className="w-3.5 h-3.5 text-ink-tertiary" />
                        <span className="text-sm text-ink">Manba</span>
                      </div>
                      <select className="flex-1 min-w-0 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0"
                        value={source} onChange={e => setSource(e.target.value)}>
                        <option value="">— Tanlanmagan —</option>
                        {dealSources.map(s => (
                          <option key={String(s._id)} value={String(s._id)}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="flex items-center gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <Phone className="w-3.5 h-3.5 text-ink-tertiary" />
                      <span className="text-sm text-ink">{t('deals.contact')}</span>
                    </div>
                    <button
                      ref={contactAnchorRef}
                      type="button"
                      onClick={() => { setShowContactPicker(v => !v); setShowAssignedPicker(false); }}
                      className="flex-1 flex items-center justify-between gap-2 min-w-0 hover:text-primary-600 transition-colors"
                    >
                      {(linkedContact || selectedContact) ? (
                        <span className="text-sm truncate">
                          <span className="font-medium text-ink">{(linkedContact || selectedContact).name}</span>
                          {(linkedContact || selectedContact).phone && <span className="text-ink-tertiary ml-2">{(linkedContact || selectedContact).phone}</span>}
                        </span>
                      ) : <span className="text-sm text-ink-disabled">— Tanlang</span>}
                      <ChevronDown className={`w-3.5 h-3.5 text-ink-tertiary shrink-0 transition-transform ${showContactPicker ? 'rotate-180' : ''}`} />
                    </button>
                    <FloatingDropdown
                      anchorRef={contactAnchorRef}
                      open={showContactPicker}
                      onClose={() => { setShowContactPicker(false); setContactSearch(''); }}
                    >
                      <div className="p-2 border-b border-surface-100">
                        <input
                          autoFocus
                          className="input text-sm w-full h-8"
                          placeholder={t('funnel.searchPlaceholder')}
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        <button type="button"
                          onClick={() => { setContact(''); setShowContactPicker(false); setContactSearch(''); }}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${!contact ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink-tertiary hover:bg-surface-50'}`}>
                          {t('funnel.noContact')}
                        </button>
                        {filteredContacts.map(c => (
                          <button key={c._id} type="button"
                            onClick={() => { setContact(c._id); setShowContactPicker(false); setContactSearch(''); }}
                            className={`w-full text-left px-3 py-2.5 text-xs border-t border-surface-50 transition-colors flex items-center justify-between gap-2 ${contact === c._id ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-50 text-ink'}`}>
                            <span>
                              <span className="font-medium">{c.name}</span>
                              {c.phone && <span className="text-ink-tertiary ml-2">{c.phone}</span>}
                            </span>
                            {contact === c._id && <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />}
                          </button>
                        ))}
                        {filteredContacts.length === 0 && contactSearch && (
                          <p className="px-3 py-4 text-xs text-ink-tertiary text-center">Topilmadi</p>
                        )}
                      </div>
                    </FloatingDropdown>
                  </div>

                  {/* Biriktirilgan kontakt ma'lumotlari */}
                  {linkedContactLoading && (
                    <div className="flex items-center gap-2 text-xs text-ink-tertiary px-4 pb-3">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Yuklanmoqda...
                    </div>
                  )}
                  {!linkedContactLoading && linkedContact && (
                    <div className="mx-4 mb-3 border border-surface-100 rounded-xl overflow-hidden">
                      <div className="divide-y divide-surface-100">
                        <div className="flex items-center gap-4 px-4 py-2.5">
                          <span className="w-28 text-sm text-ink-tertiary shrink-0">Kontakt</span>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            {linkedContact.contactNumber && (
                              <span className="text-xs font-semibold text-ink-tertiary shrink-0">#{linkedContact.contactNumber}</span>
                            )}
                            <span className="text-sm font-medium text-ink truncate">{linkedContact.name}</span>
                            {linkedContact.blocked && (
                              <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                                Bloklangan
                              </span>
                            )}
                          </div>
                        </div>
                        {linkedContact.phone && (
                          <div className="flex items-center gap-4 px-4 py-2.5">
                            <span className="w-28 text-sm text-ink-tertiary shrink-0 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> Telefon
                            </span>
                            <span className="text-sm text-ink">{linkedContact.phone}</span>
                          </div>
                        )}
                        {linkedContact.email && (
                          <div className="flex items-center gap-4 px-4 py-2.5">
                            <span className="w-28 text-sm text-ink-tertiary shrink-0 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" /> Email
                            </span>
                            <span className="text-sm text-ink truncate">{linkedContact.email}</span>
                          </div>
                        )}
                        {linkedContact.reminderAt && new Date(linkedContact.reminderAt) < new Date() && (
                          <div className="flex items-center gap-4 px-4 py-2.5">
                            <span className="w-28 text-sm text-ink-tertiary shrink-0 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Eslatma
                            </span>
                            <span className="text-sm text-red-500 font-medium">Muddati o'tdi</span>
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => navigate(`/contacts/${linkedContact._id}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 border-t border-surface-100 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" /> Kontaktni ochish
                      </button>
                    </div>
                  )}

                  {/* Assigned to */}
                  <div className="flex items-center gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <User className="w-3.5 h-3.5 text-ink-tertiary" />
                      <span className="text-sm text-ink">{t('deals.assignee')}</span>
                    </div>
                    <button
                      ref={assignedAnchorRef}
                      type="button"
                      onClick={() => { setShowAssignedPicker(v => !v); setShowContactPicker(false); setContactSearch(''); }}
                      className="flex-1 flex items-center gap-2 min-w-0 hover:text-primary-600 transition-colors"
                    >
                      {assignedUser ? (
                        <>
                          <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary-600">{initials(assignedUser.name)}</span>
                          </div>
                          <span className="text-sm text-ink font-medium truncate">{assignedUser.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-ink-disabled">— Tanlanmagan</span>
                      )}
                      <ChevronDown className={`w-3.5 h-3.5 text-ink-tertiary ml-auto shrink-0 transition-transform ${showAssignedPicker ? 'rotate-180' : ''}`} />
                    </button>
                    <FloatingDropdown
                      anchorRef={assignedAnchorRef}
                      open={showAssignedPicker}
                      onClose={() => setShowAssignedPicker(false)}
                    >
                      <div className="max-h-56 overflow-y-auto">
                        <button type="button"
                          onClick={() => { setAssignedTo(''); setShowAssignedPicker(false); }}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors ${!assignedTo ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink-tertiary hover:bg-surface-50'}`}>
                          — Tanlanmagan
                        </button>
                        {users.map(u => (
                          <button key={u._id} type="button"
                            onClick={() => { setAssignedTo(u._id); setShowAssignedPicker(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs border-t border-surface-50 transition-colors ${assignedTo === u._id ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-50 text-ink'}`}>
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-primary-600">{initials(u.name)}</span>
                            </div>
                            <span className="font-medium">{u.name}</span>
                            {assignedTo === u._id && <Check className="w-3.5 h-3.5 ml-auto text-primary-500 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </FloatingDropdown>
                  </div>
                </div>

                {/* Custom sections */}
                {orgSections.filter(s => s.fields.length > 0).map(sec => (
                  <div key={sec.id}>
                    <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2 px-1">{sec.name}</p>
                    <div className="border border-surface-100 rounded-xl overflow-hidden">
                      <div className="divide-y divide-surface-100">
                        {sec.fields.map(field => (
                          <div key={field.id} className="flex items-center gap-4 px-4 py-2.5">
                            <span className="w-28 text-sm text-ink shrink-0">{field.key}</span>
                            <CustomFieldInput field={field} value={customFieldValues[field.id]}
                              onChange={val => setCustomFieldValues(prev => ({ ...prev, [field.id]: val }))} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Statistika tab ─── */}
            {tab === 'stats' && (() => {
              const createdAt  = deal?.createdAt ? new Date(deal.createdAt) : null;
              const closedAt   = deal?.closedAt  ? new Date(deal.closedAt)  : null;
              const daysActive = createdAt ? Math.floor((Date.now() - createdAt) / 86400000) : 0;
              const fmt2 = d => d ? `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}` : '—';
              const noteCount  = activities.filter(a => a.type === 'note').length;
              const allCalls   = dealCalls.length;
              const inCount    = dealCalls.filter(c => c.direction === 'in').length;
              const outCount   = dealCalls.filter(c => c.direction === 'out').length;
              const missedCount = dealCalls.filter(c => c.status === 'missed').length;

              // Last 14 days activity chart
              const today = new Date(); today.setHours(0,0,0,0);
              const days14 = Array.from({ length: 14 }, (_, i) => {
                const d = new Date(today); d.setDate(d.getDate() - 13 + i);
                return d;
              });
              const actByDay = days14.map(day => {
                const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
                const count = activities.filter(a => {
                  const t = new Date(a.createdAt);
                  return t >= day && t < nextDay;
                }).length;
                return { day, count };
              });
              const maxAct = Math.max(...actByDay.map(d => d.count), 1);
              const BAR_H = 40;

              return (
                <div className="space-y-3">
                  {/* Status banner */}
                  {dealStatus !== 'active' && (
                    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${dealStatus === 'won' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                      {dealStatus === 'won' ? <Trophy className="w-5 h-5 text-emerald-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${dealStatus === 'won' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {dealStatus === 'won' ? 'Bitim yutildi' : "Bitim yo'qotildi"}
                        </p>
                        {closeReason && <p className="text-xs text-ink-tertiary truncate">{closeReason}</p>}
                        {closedAt && <p className="text-xs text-ink-tertiary">{fmt2(closedAt)}</p>}
                      </div>
                    </div>
                  )}

                  {/* Dates row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-surface-100 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-ink-tertiary mb-0.5">Yaratilgan</p>
                      <p className="text-sm font-semibold text-ink">{fmt2(createdAt)}</p>
                    </div>
                    <div className="border border-surface-100 rounded-xl px-3 py-2.5 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-ink leading-none">{daysActive}</span>
                      <span className="text-[10px] text-ink-tertiary mt-0.5">kun davomida</span>
                    </div>
                  </div>

                  {/* 3-column KPIs */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border border-surface-100 rounded-xl px-3 py-3 flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ink">{allCalls}</span>
                      <span className="text-[10px] text-ink-tertiary text-center">Qo'ng'iroq</span>
                    </div>
                    <div className="border border-surface-100 rounded-xl px-3 py-3 flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ink">{inCount}/{outCount}</span>
                      <span className="text-[10px] text-ink-tertiary text-center">Kir/Chiq</span>
                    </div>
                    <div className="border border-surface-100 rounded-xl px-3 py-3 flex flex-col items-center gap-0.5">
                      <span className="text-xl font-bold text-ink">{noteCount}</span>
                      <span className="text-[10px] text-ink-tertiary text-center">Izoh</span>
                    </div>
                  </div>

                  {missedCount > 0 && (
                    <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-amber-700">O'tkazib yuborilgan qo'ng'iroqlar</span>
                      <span className="text-sm font-bold text-amber-700">{missedCount}</span>
                    </div>
                  )}

                  {/* Activity bar chart (last 14 days) */}
                  <div className="border border-surface-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Oxirgi 14 kun faolligi</p>
                    <svg width="100%" viewBox={`0 0 ${14 * 18} ${BAR_H + 16}`} className="overflow-visible">
                      {actByDay.map(({ day, count }, i) => {
                        const barH = count > 0 ? Math.max(4, Math.round((count / maxAct) * BAR_H)) : 3;
                        const x = i * 18 + 2;
                        const isToday = day.toDateString() === new Date().toDateString();
                        return (
                          <g key={i}>
                            <rect
                              x={x} y={BAR_H - barH} width={14} height={barH}
                              rx={3}
                              fill={count === 0 ? '#e2e8f0' : isToday ? '#6366f1' : '#a5b4fc'}
                            />
                            {(isToday || i % 4 === 0) && (
                              <text x={x + 7} y={BAR_H + 12} textAnchor="middle" fontSize={8} fill="#94a3b8">
                                {String(day.getDate()).padStart(2,'0')}/{String(day.getMonth()+1).padStart(2,'0')}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              );
            })()}

            {/* ─── Fayllar tab ─── */}
            {tab === 'files' && (
              <div className="space-y-3">
                {!isNew && (
                  <label className={`w-full flex items-center justify-center gap-2.5 py-3 border-2 border-dashed border-surface-200 rounded-xl text-sm transition-colors cursor-pointer ${uploadingFile ? 'opacity-50 pointer-events-none' : 'hover:border-primary-300 hover:text-primary-600 text-ink-tertiary'}`}>
                    {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingFile ? 'Yuklanmoqda...' : '+ Fayl yuklash'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                  </label>
                )}
                {isNew && (
                  <p className="text-xs text-ink-tertiary text-center py-4">Fayl yuklash uchun avval saqlab oling</p>
                )}
                {files.length === 0 && !isNew && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="w-8 h-8 text-ink-disabled mb-2" />
                    <p className="text-sm text-ink-tertiary">Hali fayl yo'q</p>
                  </div>
                )}
                {files.map(f => (
                  <div key={f._id} className="flex items-center gap-3 p-3 border border-surface-100 rounded-xl group hover:bg-surface-50 transition-colors">
                    <FileText className="w-8 h-8 text-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{f.name}</p>
                      {f.size > 0 && <p className="text-xs text-ink-tertiary">{fmtSize(f.size)}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <a href={`${API.replace('/api', '')}${f.url}?dl=1`} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded hover:bg-primary-50 text-ink-tertiary hover:text-primary-600 transition-colors"
                        title="Yuklab olish">
                        <Upload className="w-3.5 h-3.5 rotate-180" />
                      </a>
                      <button onClick={() => handleFileDelete(f._id)}
                        className="p-1.5 rounded hover:bg-red-50 text-ink-tertiary hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Sozlama tab ─── */}
            {tab === 'settings' && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Bo'limlar</p>
                  <div className="flex items-center justify-between py-2.5 px-3 bg-surface-50 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">Asosiy</span>
                      <span className="text-[10px] text-ink-tertiary bg-surface-100 px-1.5 py-0.5 rounded">Default</span>
                    </div>
                    <span className="text-xs text-ink-tertiary">Bosqich · Summa · Manba · Kontakt · Mas'ul</span>
                  </div>
                  {orgSections.map(sec => (
                    <div key={sec.id} className="flex items-center justify-between py-2.5 px-3 border border-surface-100 rounded-lg mb-2 group/sec">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-ink truncate">{sec.name}</span>
                        <span className="text-[10px] text-ink-tertiary shrink-0">{sec.fields.length} ta maydon</span>
                      </div>
                      <button onClick={() => deleteSection(sec.id)}
                        className="opacity-0 group-hover/sec:opacity-100 p-1 rounded text-ink-tertiary hover:text-red-500 transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {addingSection ? (
                    <div className="flex items-center gap-2 py-2">
                      <input autoFocus className="input flex-1 text-sm" placeholder="Bo'lim nomi..."
                        value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmAddSection(); if (e.key === 'Escape') { setAddingSection(false); setNewSectionName(''); } }} />
                      <button onClick={confirmAddSection} className="btn-sm btn-primary"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setAddingSection(false); setNewSectionName(''); }} className="btn-sm btn-secondary"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingSection(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-surface-200 rounded-lg text-sm text-ink-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors">
                      <Plus className="w-4 h-4" /> Yangi bo'lim qo'shish
                    </button>
                  )}
                </div>

                {orgSections.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Maydonlar</p>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {orgSections.map(sec => (
                        <button key={sec.id} onClick={() => { setActiveSectionId(sec.id); setAddingField(false); }}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${activeSectionId === sec.id ? 'bg-primary-500 text-white' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'}`}>
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
                            <button onClick={() => deleteCustomField(activeOrgSection.id, field.id)}
                              className="shrink-0 opacity-0 group-hover/field:opacity-100 p-1 rounded text-ink-tertiary hover:text-red-500 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {addingField ? (
                          <div className="pt-3 space-y-2.5">
                            <div className="flex gap-2">
                              <input autoFocus className="input flex-1 text-sm" placeholder="Maydon nomi..."
                                value={newField.key} onChange={e => setNewField(f => ({ ...f, key: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !NEEDS_OPTIONS.includes(newField.type)) confirmAddField();
                                  if (e.key === 'Escape') { setAddingField(false); setNewField({ key: '', type: 'text', options: [] }); setNewOption(''); }
                                }} />
                              <div className="relative w-36 shrink-0">
                                <select className="input appearance-none pr-7 text-sm"
                                  value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value, options: [] }))}>
                                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                              </div>
                            </div>
                            {NEEDS_OPTIONS.includes(newField.type) && (
                              <div className="pl-1 space-y-1.5">
                                <p className="text-xs text-ink-tertiary">Variantlar {newField.options.length === 0 && <span className="text-red-400">(kamida 1 ta)</span>}</p>
                                {newField.options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <span className="flex-1 text-sm text-ink bg-surface-50 px-2.5 py-1 rounded-lg">{opt}</span>
                                    <button onClick={() => setNewField(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                                      className="p-1 text-ink-tertiary hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <input className="input flex-1 text-sm" placeholder="Variant nomi..."
                                    value={newOption} onChange={e => setNewOption(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newOption.trim()) { setNewField(f => ({ ...f, options: [...f.options, newOption.trim()] })); setNewOption(''); } } }} />
                                  <button onClick={() => { if (newOption.trim()) { setNewField(f => ({ ...f, options: [...f.options, newOption.trim()] })); setNewOption(''); } }}
                                    className="btn-sm btn-secondary shrink-0"><Plus className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={confirmAddField} className="btn-sm btn-primary flex-1"><Check className="w-3.5 h-3.5" /> Qo'shish</button>
                              <button onClick={() => { setAddingField(false); setNewField({ key: '', type: 'text', options: [] }); setNewOption(''); }}
                                className="btn-sm btn-secondary flex-1">Bekor</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setAddingField(true)}
                            className="mt-2 flex items-center gap-1.5 text-xs text-ink-tertiary hover:text-primary-600 transition-colors py-2">
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

        {/* ── RIGHT: Activity feed (telefonda pastda joylashadi) ── */}
        <div className="w-full lg:flex-1 flex flex-col lg:min-w-0 bg-surface-50">
          <div className="px-5 py-3 border-b border-surface-100 bg-white shrink-0">
            <p className="text-sm font-semibold text-ink">{t('contactForm.tabActivity')}</p>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('deals.activitySub')}</p>
          </div>
          <div className="min-h-[40vh] lg:min-h-0 lg:flex-1 lg:overflow-y-auto px-5 py-4">
            {isNew ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 bg-white border border-surface-100 rounded-2xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-ink-disabled" />
                </div>
                <p className="text-sm font-medium text-ink-secondary">{t('deals.activityEmpty')}</p>
                <p className="text-xs text-ink-tertiary mt-1 max-w-[200px]">{t('deals.activityHint')}</p>
              </div>
            ) : actLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-14 h-14 bg-white border border-surface-100 rounded-2xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7 text-ink-disabled" />
                </div>
                <p className="text-sm font-medium text-ink-secondary">{t('deals.activityEmpty')}</p>
                <p className="text-xs text-ink-tertiary mt-1">{t('deals.activityHint')}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activities.map(a =>
                  a.type === 'note'
                    ? <NoteItem key={a._id} activity={a} onDelete={handleDeleteNote} currentUserId={meId} />
                    : <SystemEvent key={a._id} activity={a} />
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
          {!isNew && (
            <div className="shrink-0 border-t border-surface-100 bg-white px-4 py-3">
              <div className="flex items-end bg-surface-50 rounded-xl border border-surface-200 focus-within:border-primary-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-200">
                <textarea ref={textareaRef}
                  className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-tertiary resize-none border-0 outline-none focus:outline-none focus:ring-0 leading-relaxed px-4 py-3"
                  placeholder={t('deals.notePlaceholder')} rows={3} value={noteText}
                  onChange={e => { setNoteText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }} />
                <div className="shrink-0 p-2 transition-all duration-150"
                  style={{ opacity: noteText.trim() ? 1 : 0, transform: noteText.trim() ? 'scale(1)' : 'scale(0.7)', pointerEvents: noteText.trim() ? 'auto' : 'none' }}>
                  <button onClick={handleSendNote} disabled={noteSending}
                    className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-400 active:scale-95 transition-all">
                    {noteSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {noteText && <p className="text-[10px] text-ink-tertiary mt-1.5 px-1">Shift+Enter — yangi qator</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
