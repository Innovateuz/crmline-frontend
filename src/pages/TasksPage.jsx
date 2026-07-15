import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasks, invalidateTasks, upsertTask, removeTask as removeTaskAction } from '../store/tasksSlice';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useT } from '../utils/translate';
import { mediaUrl, mediaDownloadUrl } from '../utils/media';
import { getSocket } from '../utils/socket';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import {
  Plus, X, Loader2, Check, ChevronDown,
  Calendar, CheckSquare2, Pencil, Trash2,
  AlertCircle, User, UserCheck, Link2, Search, Filter, Eye, Archive, ArchiveRestore,
  Paperclip, Upload, FileText, Tag, Download, History,
} from 'lucide-react';

const isImageFile = (f) =>
  (f?.type || '').startsWith('image/') ||
  /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)$/i.test(f?.name || '');

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const PRIORITY_MAP = {
  low:    { labelKey: 'tasks.prioLow',    color: '#94a3b8', bg: '#f1f5f9', ring: 'ring-slate-300'  },
  normal: { labelKey: 'tasks.prioMedium', color: '#3b82f6', bg: '#eff6ff', ring: 'ring-blue-300'   },
  high:   { labelKey: 'tasks.prioHigh',   color: '#ef4444', bg: '#fef2f2', ring: 'ring-red-300'    },
};

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

// Sana + vaqt (tarix yozuvlari uchun) — masalan "15.07.2026 14:30"
function fmtDateTime(d) {
  if (!d) return null;
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}.${p(dt.getMonth()+1)}.${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
}

/* ─── Contact Search ──────────────────────────────────────── */
function ContactSearch({ contactId, contactName, onChange }) {
  const t = useT();
  const [q,       setQ]       = useState(contactName || '');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const timerRef = useRef(null);

  const handleInput = (val) => {
    setQ(val);
    if (!val.trim()) { onChange(null, ''); setResults([]); setOpen(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/contacts`, { params: { search: val, limit: 8 } });
        setResults(res.data.contacts || []);
        setOpen(true);
      } catch {}
    }, 300);
  };

  const pick = (c) => {
    onChange(c._id, c.name);
    setQ(c.name);
    setOpen(false);
  };

  const clear = () => {
    onChange(null, '');
    setQ('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          className="input pr-8"
          placeholder={t('tasks.contactSearch')}
          value={q}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {(q || contactId) && (
          <button type="button" onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-surface-200 rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
          {results.map(c => (
            <button key={c._id} type="button" onMouseDown={() => pick(c)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-50 transition-colors">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                {initials(c.name)}
              </div>
              <span className="text-sm font-medium text-ink">{c.name}</span>
              {c.phone && <span className="text-xs text-ink-tertiary ml-1">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
      {contactId && !open && (
        <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
          <Check className="w-3 h-3" /> {t('tasks.linked')}
        </p>
      )}
    </div>
  );
}

/* ─── Draggable Task Card ─────────────────────────────────── */
function TaskCard({ task, onView, onEdit, onArchive, onDelete, overlay = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id });
  const overdue = isOverdue(task.dueDate);
  const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;
  const t = useT();

  const card = (
    <div className={`bg-white border rounded-xl p-3 shadow-sm select-none transition-all ${
      overlay ? 'rotate-1 shadow-lg cursor-grabbing' : 'cursor-grab active:cursor-grabbing hover:shadow-md'
    } ${isDragging && !overlay ? 'opacity-30' : ''} ${
      overdue ? 'border-red-200 bg-red-50/30' : 'border-surface-200 hover:border-surface-300'
    }`}>
      {/* Priority bar */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: pri.bg, color: pri.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pri.color }} />
          {t(pri.labelKey)}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onView(task); }}
            className="p-1 rounded-md hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary transition-colors">
            <Eye className="w-3 h-3" />
          </button>
          <button onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onEdit(task); }}
            className="p-1 rounded-md hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onArchive(task); }}
            title="Arxivlash"
            className="p-1 rounded-md hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary transition-colors">
            <Archive className="w-3 h-3" />
          </button>
          <button onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(task._id); }}
            className="p-1 rounded-md hover:bg-red-50 text-ink-disabled hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-ink leading-snug">{task.title}</p>

      {task.description && (
        <p className="text-[11px] text-ink-tertiary mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.tags.map(tag => (
            <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-700">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {task.contact && (
        <div className="flex items-center gap-1 mt-1.5">
          <Link2 className="w-3 h-3 text-ink-disabled shrink-0" />
          <span className="text-[11px] text-ink-tertiary truncate">{task.contact.name}</span>
        </div>
      )}

      {task.createdBy && (
        <div className="flex items-center gap-1 mt-1.5">
          <User className="w-3 h-3 text-ink-disabled shrink-0" />
          <span className="text-[11px] text-ink-tertiary truncate">{t('tasks.createdByPrefix')} {task.createdBy.name}</span>
        </div>
      )}

      {task.assignedTo && (
        <div className="flex items-center gap-1 mt-1.5">
          <UserCheck className="w-3 h-3 text-ink-disabled shrink-0" />
          <span className="text-[11px] text-ink-tertiary truncate">{t('tasks.assignedToPrefix')} {task.assignedTo.name}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-ink-tertiary'}`}>
            {overdue && <AlertCircle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {fmtDate(task.dueDate)}
          </span>
        )}
        {task.files?.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-ink-tertiary">
            <Paperclip className="w-3 h-3" />
            {task.files.length}
          </span>
        )}
        {(task.assignedTo || task.additionalAssignees?.length > 0) && (
          <div className="flex items-center -space-x-1.5 ml-auto shrink-0">
            {task.additionalAssignees?.map(u => (
              <span key={u._id} className="w-5 h-5 rounded-full bg-surface-200 text-ink-secondary flex items-center justify-center text-[9px] font-bold shrink-0 ring-2 ring-white"
                title={u.name}>
                {initials(u.name)}
              </span>
            ))}
            {task.assignedTo && (
              <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[9px] font-bold shrink-0 ring-2 ring-white"
                title={task.assignedTo.name}>
                {initials(task.assignedTo.name)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (overlay) return card;
  return <div ref={setNodeRef} {...listeners} {...attributes} className="touch-pan-y">{card}</div>;
}

/* ─── Droppable Column ────────────────────────────────────── */
function Column({ stage, tasks, onAdd, onView, onEdit, onArchive, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: String(stage._id || stage.name) });
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate)).length;
  const t = useT();

  return (
    <div className="flex flex-col w-72 shrink-0 h-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
        <span className="text-sm font-semibold text-ink">{stage.name}</span>
        <span className="text-xs text-ink-disabled bg-surface-100 rounded-full px-1.5 py-0.5">{tasks.length}</span>
        {overdueCount > 0 && (
          <span className="text-[10px] text-red-500 bg-red-50 rounded-full px-1.5 py-0.5 font-medium">
            {overdueCount} {t('tasks.overdue')}
          </span>
        )}
        <button onClick={() => onAdd(stage)} className="ml-auto p-1 rounded-lg hover:bg-surface-200 text-ink-disabled hover:text-ink transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 overflow-y-auto transition-colors ${
          isOver ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-surface-100'
        }`}>
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onView={onView} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

/* ─── Tag Input ────────────────────────────────────────────── */
function TagInput({ tags, allTags, onChange }) {
  const t = useT();
  const [input, setInput] = useState('');

  const add = (raw) => {
    const val = raw.trim();
    if (!val || tags.includes(val)) return;
    onChange([...tags, val]);
    setInput('');
  };
  const remove = (val) => onChange(tags.filter(x => x !== val));

  const suggestions = allTags.filter(x => !tags.includes(x) && x.toLowerCase().includes(input.trim().toLowerCase()));

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
              #{tag}
              <button type="button" onClick={() => remove(tag)} className="p-0.5 rounded-full hover:bg-primary-100 hover:text-primary-900">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="input"
        placeholder={t('tasks.tagsPlaceholder')}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(input); }
          else if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
        }}
      />
      {input && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {suggestions.slice(0, 6).map(s => (
            <button key={s} type="button" onClick={() => add(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-surface-300 text-ink-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors">
              + #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Task Modal ──────────────────────────────────────────── */
function TaskModal({ initial, stages, users, allTags, onSave, onClose, saving, readOnly = false }) {
  const t = useT();
  const [title,       setTitle]       = useState(initial?.title       || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [stageId,     setStageId]     = useState(
    initial?.stageId ? String(initial.stageId) : (stages[0] ? String(stages[0]._id || stages[0].name) : '')
  );
  const [assignedTo,  setAssignedTo]  = useState(initial?.assignedTo?._id || initial?.assignedTo || '');
  const [additionalAssignees, setAdditionalAssignees] = useState(
    (initial?.additionalAssignees || []).map(u => u?._id || u)
  );
  const [dueDate,     setDueDate]     = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : '');
  const [priority,    setPriority]    = useState(initial?.priority || 'normal');
  const [contactId,   setContactId]   = useState(initial?.contact?._id || initial?.contact || null);
  const [contactName, setContactName] = useState(initial?.contact?.name || '');
  const [tags,         setTags]         = useState(initial?.tags || []);
  const [files,        setFiles]        = useState(initial?.files || []);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [imgPreview,   setImgPreview]   = useState(null);  // sahifa ichida rasm ko'rish

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API_URL}/upload/file`, fd);
      const { url, name, size, type } = res.data;
      setFiles(prev => [...prev, { name, url, size, type }]);
    } catch (err) {
      toast.error(err.response?.data?.message || t('tasks.error'));
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleFileRemove = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!title.trim()) { toast.error(t('tasks.titleRequired')); return; }
    onSave({
      title, description, stageId, priority,
      assignedTo: assignedTo || null,
      additionalAssignees,
      dueDate:    dueDate    || null,
      contact:    contactId  || null,
      tags,
      files,
    });
  };

  /* ── Mobil bottom-sheet: pastga surib yopish (swipe-to-dismiss) ── */
  const [dragY,    setDragY]    = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  const onDragStart = (e) => { startYRef.current = e.touches[0].clientY; setDragging(true); };
  const onDragMove  = (e) => {
    const dy = e.touches[0].clientY - startYRef.current;
    setDragY(dy > 0 ? dy : 0);
  };
  const onDragEnd   = () => {
    setDragging(false);
    if (dragY > 110) { onClose(); return; }   // yetarlicha pastga surilsa — yopiladi
    setDragY(0);                               // aks holda — qaytib ko'tariladi
  };

  /* iOS: klaviatura OCHILGANDA modalni ko'rinadigan hududga (visualViewport)
     bog'laymiz — footer klaviatura ustida qoladi. Klaviatura YOPIQ bo'lsa
     esa 100svh (CSS) ishlaydi — u pastki brauzer paneli uchun joy qoldiradi,
     shu bois tugmalar panel ortiga tushmaydi. */
  const [vp, setVp] = useState(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // ko'rinadigan balandlik oyna balandligidan >120px kichik bo'lsa — klaviatura ochiq
      const keyboardOpen = window.innerHeight - vv.height > 120;
      setVp(keyboardOpen ? { height: vv.height, top: vv.offsetTop } : null);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  return (
    <>
    <div className="fixed inset-x-0 top-0 h-full z-[80] flex items-end justify-center lg:items-center lg:p-4"
      style={vp ? { height: `${vp.height}px`, top: `${vp.top}px` } : undefined}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white shadow-modal w-full flex flex-col rounded-t-2xl max-h-full
                   animate-[sheetUp_0.3s_ease-out]
                   lg:rounded-2xl lg:max-w-md lg:max-h-[90dvh] lg:animate-[fadeIn_0.15s_ease-out]"
        style={{
          transform:  dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.32,0.72,0,1)',
        }}>
        {/* Drag handle — faqat mobil, pastga surib yopiladi */}
        <div className="lg:hidden pt-2.5 pb-1 flex justify-center shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div className="w-10 h-1.5 rounded-full bg-surface-300" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-4 lg:py-4 border-b border-surface-100 shrink-0 touch-none"
          onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
          <div>
            <h2 className="font-semibold text-ink">{readOnly ? t('tasks.viewTask') : initial?._id ? t('tasks.editTask') : t('tasks.newTask')}</h2>
            {initial?._id && initial?.createdBy && (
              <p className="text-[11px] text-ink-disabled mt-0.5">
                {t('tasks.createdByPrefix')} {initial.createdBy.name}
                {initial.createdAt ? ` · ${fmtDate(initial.createdAt)}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
        <fieldset disabled={readOnly} className="contents space-y-4 border-0 m-0 p-0">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.modalTitle')}</label>
            <input className="input" placeholder={t('tasks.titlePlaceholder')}
              value={title} onChange={e => setTitle(e.target.value)}
              autoFocus={typeof window !== 'undefined' && window.innerWidth >= 1024}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.description')}</label>
            <textarea className="input resize-none" rows={3} placeholder={t('tasks.descPlaceholder')}
              value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Priority + Stage row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.priority')}</label>
              <div className="flex gap-1">
                {Object.entries(PRIORITY_MAP).map(([key, p]) => (
                  <button key={key} type="button" onClick={() => setPriority(key)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                      priority === key
                        ? `border-transparent text-white`
                        : 'border-surface-200 text-ink-tertiary hover:border-surface-300'
                    }`}
                    style={priority === key ? { backgroundColor: p.color } : {}}>
                    {t(p.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.stage')}</label>
              <div className="relative">
                <select className="input appearance-none pr-8" value={stageId} onChange={e => setStageId(e.target.value)}>
                  {stages.map(s => (
                    <option key={String(s._id || s.name)} value={String(s._id || s.name)}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-disabled pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.assignee')}</label>
              <div className="relative">
                <select className="input appearance-none pr-8" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">{t('tasks.unassigned')}</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-disabled pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.dueDate')}</label>
              <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Additional assignees */}
          {users.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.additionalAssignees')}</label>
              <div className="flex flex-wrap gap-1.5">
                {users.map(u => {
                  const active = additionalAssignees.includes(u._id);
                  return (
                    <button key={u._id} type="button"
                      onClick={() => setAdditionalAssignees(prev =>
                        prev.includes(u._id) ? prev.filter(id => id !== u._id) : [...prev, u._id]
                      )}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        active
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-surface-50 border-surface-200 text-ink-tertiary hover:border-surface-300'
                      }`}>
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact link */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> {t('tasks.contact')}
            </label>
            <ContactSearch
              contactId={contactId}
              contactName={contactName}
              onChange={(id, name) => { setContactId(id); setContactName(name); }}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">{t('tasks.tags')}</label>
            <TagInput tags={tags} allTags={allTags} onChange={setTags} />
          </div>

          {/* Files */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> {t('tasks.files')}
            </label>
            <label className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-surface-200 rounded-xl text-xs transition-colors cursor-pointer ${
              uploadingFile ? 'opacity-50 pointer-events-none' : 'hover:border-primary-300 hover:text-primary-600 text-ink-tertiary'
            }`}>
              {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploadingFile ? t('tasks.uploading') : t('tasks.uploadFile')}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-50 border border-surface-100 rounded-lg group">
                    {isImageFile(f) ? (
                      // Rasm — sahifa ichida (lightbox) ochiladi, yuklab olinmaydi.
                      // <a> ishlatamiz: readOnly fieldset uni o'chirib qo'ymaydi.
                      <a href={mediaUrl(f.url)} onClick={e => { e.preventDefault(); setImgPreview(f); }}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <img src={mediaUrl(f.url)} alt="" loading="lazy"
                          className="w-7 h-7 rounded object-cover shrink-0 bg-surface-100 border border-surface-200" />
                        <span className="text-xs text-ink truncate hover:underline">{f.name}</span>
                      </a>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                        <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer"
                          className="text-xs text-ink truncate flex-1 hover:underline">
                          {f.name}
                        </a>
                      </>
                    )}
                    <button type="button" onClick={() => handleFileRemove(i)}
                      className="p-0.5 rounded text-ink-disabled hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        {/* O'zgarishlar tarixi — faqat mavjud (saqlangan) vazifada ko'rinadi */}
        {initial?._id && initial?.history?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-surface-100">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-ink-tertiary">
              <History className="w-3.5 h-3.5" /> {t('tasks.historyTitle')}
            </div>
            <ol className="space-y-3">
              {[...initial.history].reverse().map((h, i) => {
                const stageNameOf = (id) => stages.find(s => String(s._id || s.name) === String(id))?.name || '—';
                const userNameOf  = (id) => users.find(u => String(u._id) === String(id))?.name || '—';
                const actor = h.by?.name || t('tasks.histUnknownUser');
                let detail = null;
                if (h.action === 'stage_changed') {
                  detail = <>{stageNameOf(h.from)} <span className="text-ink-disabled">→</span> {stageNameOf(h.to)}</>;
                } else if (h.action === 'assigned') {
                  detail = <>→ {userNameOf(h.to)}</>;
                }
                const actionLabel = {
                  created:       t('tasks.histCreated'),
                  stage_changed: t('tasks.histStageChanged'),
                  assigned:      t('tasks.histAssigned'),
                  unassigned:    t('tasks.histUnassigned'),
                  archived:      t('tasks.histArchived'),
                  unarchived:    t('tasks.histUnarchived'),
                }[h.action] || h.action;
                return (
                  <li key={i} className="flex gap-2.5">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-ink leading-snug">
                        <span className="font-medium">{actor}</span>{' '}
                        <span className="text-ink-tertiary">{actionLabel}</span>
                        {detail && <span className="text-ink-secondary"> · {detail}</span>}
                      </p>
                      <p className="text-[11px] text-ink-disabled mt-0.5">{fmtDateTime(h.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        </div>

        <div className="flex justify-end gap-2 px-5 pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] lg:pb-4 border-t border-surface-100 shrink-0">
          <button onClick={onClose} className="btn-secondary btn-md">
            {readOnly ? t('tasks.close') : t('tasks.cancel')}
          </button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {initial?._id ? t('tasks.save') : t('tasks.create')}
            </button>
          )}
        </div>
      </div>
    </div>

    {/* ── Rasm ko'rish (lightbox) — sahifa ichida, yuklab olinmaydi ── */}
    {imgPreview && (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
        onClick={() => setImgPreview(null)}>
        <img src={mediaUrl(imgPreview.url)} alt={imgPreview.name}
          onClick={e => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <a href={mediaDownloadUrl(imgPreview.url)} download={imgPreview.name}
            onClick={e => e.stopPropagation()}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition-colors">
            <Download className="w-5 h-5" />
          </a>
          <button type="button" onClick={() => setImgPreview(null)}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[80%] truncate text-xs text-white/80 bg-black/40 px-3 py-1.5 rounded-full">
          {imgPreview.name}
        </p>
      </div>
    )}
    </>
  );
}

/* ─── Archive Modal ───────────────────────────────────────── */
function ArchiveModal({ stages, onClose, onRestored }) {
  const t = useT();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/tasks`, { params: { archived: true, limit: 1000 } })
      .then(r => setTasks(r.data.tasks || []))
      .catch(() => toast.error(t('tasks.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  const stageName = (id) => stages.find(s => String(s._id || s.name) === String(id))?.name || '—';

  const restore = async (id) => {
    setBusyId(id);
    try {
      await axios.put(`${API_URL}/tasks/${id}`, { archived: false });
      setTasks(prev => prev.filter(x => x._id !== id));
      onRestored();
      toast.success(t('tasks.restored'));
    } catch { toast.error(t('tasks.error')); }
    finally { setBusyId(null); }
  };

  const remove = async (id) => {
    if (!window.confirm(t('tasks.deleteConfirm'))) return;
    setBusyId(id);
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      setTasks(prev => prev.filter(x => x._id !== id));
      toast.success(t('tasks.deleted'));
    } catch { toast.error(t('tasks.error')); }
    finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[80dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Archive className="w-4 h-4" /> {t('tasks.archive')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-ink-tertiary text-center py-10">{t('tasks.archiveEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task._id} className="flex items-center gap-3 p-3 border border-surface-100 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{task.title}</p>
                    <p className="text-xs text-ink-tertiary truncate">{stageName(task.stageId)}</p>
                  </div>
                  <button onClick={() => restore(task._id)} disabled={busyId === task._id}
                    title={t('tasks.restore')}
                    className="p-1.5 rounded-lg text-ink-tertiary hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(task._id)} disabled={busyId === task._id}
                    className="p-1.5 rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function TasksPage() {
  const meId    = useSelector(s => s.auth.user?._id || s.auth.user?.id);
  const dispatch = useDispatch();
  const t = useT();
  const { tasks, stages, users, loading, total: tasksTotal } = useSelector(s => s.tasks);

  const [saving,   setSaving]   = useState(false);
  const [modal,    setModal]    = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  // Filters
  const [filterSearch,   setFilterSearch]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterTags,     setFilterTags]     = useState([]);
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);

  const toggleFilterTag = (tag) =>
    setFilterTags(cur => cur.includes(tag) ? cur.filter(x => x !== tag) : [...cur, tag]);

  const allTags = useMemo(() => [...new Set(tasks.flatMap(tk => tk.tags || []))], [tasks]);

  const sensors = useSensors(
    // Desktop: sichqoncha bilan 6px surilsa drag boshlanadi
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Telefon: bosib turib (200ms) drag; tez swipe — ustun scroll bo'ladi
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const load = useCallback(async () => {
    try {
      await dispatch(fetchTasks()).unwrap();
    } catch {
      toast.error(t('tasks.loadError'));
    }
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  // Real-time sync: boshqa foydalanuvchi task qo'shsa/o'zgartirsa/o'chirsa —
  // board avtomatik yangilanadi (refresh shart emas).
  useEffect(() => {
    const socket = getSocket();
    const onCreated = ({ task }) => dispatch(upsertTask(task));
    const onUpdated = ({ task }) => dispatch(upsertTask(task));
    const onDeleted = ({ taskId }) => dispatch(removeTaskAction(taskId));
    socket.on('task:created', onCreated);
    socket.on('task:updated', onUpdated);
    socket.on('task:deleted', onDeleted);
    return () => {
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
    };
  }, [dispatch]);

  const stageKey = (s) => String(s._id || s.name);

  const tasksForStage = (stage) =>
    tasks
      .filter(t => String(t.stageId) === stageKey(stage))
      .filter(t => !filterSearch   || t.title.toLowerCase().includes(filterSearch.toLowerCase())
                                   || t.description?.toLowerCase().includes(filterSearch.toLowerCase()))
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !filterAssignee
        || String(t.assignedTo?._id || t.assignedTo || '') === filterAssignee
        || (t.additionalAssignees || []).some(u => String(u?._id || u) === filterAssignee))
      .filter(t => filterTags.length === 0 || filterTags.every(tag => t.tags?.includes(tag)))
      .filter(t => !filterCreatedByMe || String(t.createdBy?._id || t.createdBy || '') === String(meId));

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetStageId = over.id;
    const task = tasks.find(t => t._id === active.id);
    if (!task || String(task.stageId) === String(targetStageId)) return;
    dispatch(upsertTask({ ...task, stageId: targetStageId }));
    try {
      const res = await axios.put(`${API_URL}/tasks/${active.id}`, { stageId: targetStageId });
      dispatch(upsertTask(res.data.task));
    } catch {
      toast.error('Xato');
      dispatch(invalidateTasks());
      load();
    }
  };

  const openCreate = (stage) => setModal({ stageId: stageKey(stage) });
  const openView   = (task)  => setModal({ task, readOnly: true });
  const openEdit   = (task)  => setModal({ task });
  const closeModal = ()      => setModal(null);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.task?._id) {
        const res = await axios.put(`${API_URL}/tasks/${modal.task._id}`, data);
        dispatch(upsertTask(res.data.task));
        toast.success(t('tasks.saved'));
      } else {
        const res = await axios.post(`${API_URL}/tasks`, {
          ...data,
          stageId:    modal?.stageId || (stages[0] ? stageKey(stages[0]) : ''),
          assignedTo: data.assignedTo || meId || null,
        });
        dispatch(upsertTask(res.data.task));
        toast.success(t('tasks.created'));
      }
      closeModal();
    } catch (e) {
      toast.error(e.response?.data?.message || t('tasks.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('tasks.deleteConfirm'))) return;
    dispatch(removeTaskAction(id));
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      toast.success(t('tasks.deleted'));
    } catch {
      toast.error(t('tasks.error'));
      dispatch(invalidateTasks());
      load();
    }
  };

  const handleArchive = async (task) => {
    dispatch(removeTaskAction(task._id));
    try {
      await axios.put(`${API_URL}/tasks/${task._id}`, { archived: true });
      toast.success(t('tasks.archived'));
    } catch {
      toast.error(t('tasks.error'));
      dispatch(invalidateTasks());
      load();
    }
  };

  const totalOverdue = tasks.filter(t => isOverdue(t.dueDate)).length;
  const hasFilters = filterSearch || filterPriority || filterAssignee || filterTags.length > 0 || filterCreatedByMe;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
        <CheckSquare2 className="w-12 h-12 text-ink-disabled mb-4" />
        <h2 className="text-lg font-semibold text-ink">{t('tasks.noStagesTitle')}</h2>
        <p className="text-sm text-ink-tertiary mt-2 max-w-xs">
          {t('tasks.noStages')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 lg:px-6 py-3 border-b border-surface-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <CheckSquare2 className="w-5 h-5 text-primary-600 shrink-0" />
            <h1 className="font-bold text-ink">{t('tasks.title')}</h1>
            <span className="text-xs text-ink-disabled bg-surface-100 rounded-full px-2 py-0.5">{tasks.length}</span>
            {totalOverdue > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 rounded-full px-2 py-0.5 font-medium">
                <AlertCircle className="w-3 h-3" />
                {totalOverdue} {t('tasks.overdue')}
              </span>
            )}
            {tasksTotal > tasks.length && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 font-medium">
                <AlertCircle className="w-3 h-3" />
                {t('tasks.totalNote').replace('{total}', tasksTotal).replace('{shown}', tasks.length)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar md:overflow-visible md:flex-wrap md:ml-auto -mx-4 px-4 md:mx-0 md:px-0">
            {/* Quick filters: assigned to me / created by me */}
            <button
              onClick={() => setFilterAssignee(v => v === meId ? '' : meId)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                filterAssignee === meId
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-surface-50 border-surface-200 text-ink-secondary hover:bg-surface-100'
              }`}>
              {t('tasks.assignedToMe')}
            </button>
            <button
              onClick={() => setFilterCreatedByMe(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                filterCreatedByMe
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-surface-50 border-surface-200 text-ink-secondary hover:bg-surface-100'
              }`}>
              {t('tasks.createdByMe')}
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
              <input
                className="pl-8 pr-3 py-1.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 w-44"
                placeholder={t('tasks.search')}
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
              />
              {filterSearch && (
                <button onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                showFilters || (filterPriority || filterAssignee || filterTags.length > 0)
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-surface-50 border-surface-200 text-ink-secondary hover:bg-surface-100'
              }`}>
              <Filter className="w-3.5 h-3.5" />
              {t('tasks.filter')}
              {(filterPriority || filterAssignee || filterTags.length > 0) && (
                <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {(filterPriority ? 1 : 0) + (filterAssignee ? 1 : 0) + filterTags.length}
                </span>
              )}
            </button>

            <button onClick={() => setShowArchive(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border bg-surface-50 border-surface-200 text-ink-secondary hover:bg-surface-100 transition-colors">
              <Archive className="w-3.5 h-3.5" /> {t('tasks.archive')}
            </button>

            <button onClick={() => openCreate(stages[0])} className="btn-primary btn-md flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('tasks.newTask')}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-100 flex-wrap">
            {/* Priority filter */}
            <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 rounded-xl p-1">
              <button onClick={() => setFilterPriority('')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${!filterPriority ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                {t('tasks.allPriorities')}
              </button>
              {Object.entries(PRIORITY_MAP).map(([key, p]) => (
                <button key={key} onClick={() => setFilterPriority(filterPriority === key ? '' : key)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                    filterPriority === key ? 'text-white shadow-sm' : 'text-ink-tertiary hover:text-ink'
                  }`}
                  style={filterPriority === key ? { backgroundColor: p.color } : {}}>
                  {t(p.labelKey)}
                </button>
              ))}
            </div>

            {/* Assignee filter */}
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
              <select className="pl-8 pr-8 py-1.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none"
                value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                <option value="">{t('tasks.allAssignees')}</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-ink-disabled shrink-0" />
                {allTags.map(tag => (
                  <button key={tag} onClick={() => toggleFilterTag(tag)}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                      filterTags.includes(tag)
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-surface-50 border-surface-200 text-ink-tertiary hover:border-primary-300 hover:text-primary-600'
                    }`}>
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {hasFilters && (
              <button onClick={() => { setFilterSearch(''); setFilterPriority(''); setFilterAssignee(''); setFilterTags([]); setFilterCreatedByMe(false); }}
                className="text-xs text-ink-tertiary hover:text-red-500 flex items-center gap-1 transition-colors">
                <X className="w-3 h-3" /> {t('tasks.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full px-6 py-5 items-stretch">
            {stages.map(stage => (
              <Column key={stageKey(stage)} stage={stage} tasks={tasksForStage(stage)}
                onAdd={openCreate} onView={openView} onEdit={openEdit} onArchive={handleArchive} onDelete={handleDelete} />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} onView={() => {}} onEdit={() => {}} onArchive={() => {}} onDelete={() => {}} overlay />}
          </DragOverlay>
        </DndContext>
      </div>

      {modal && (
        <TaskModal
          initial={modal.task || { stageId: modal.stageId }}
          stages={stages}
          users={users}
          allTags={allTags}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
          readOnly={!!modal.readOnly}
        />
      )}

      {showArchive && (
        <ArchiveModal
          stages={stages}
          onClose={() => setShowArchive(false)}
          onRestored={() => dispatch(invalidateTasks())}
        />
      )}
    </div>
  );
}
