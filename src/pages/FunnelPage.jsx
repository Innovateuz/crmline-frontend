import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useT } from '../utils/translate';
import { useModalOpen } from '../utils/modalLock';
import axios from 'axios';
import toast from 'react-hot-toast';
import { invalidateContacts } from '../store/contactsSlice';
import { getSocket } from '../utils/socket';
import { usePermissions } from '../utils/permissions';
import CallButton from '../components/CallButton';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Loader2, Check, User, UserCheck, Phone, DollarSign, Pencil, Trash2, Search, Clock, Calendar, Download, Upload, Layers, ChevronDown, BarChart2, Tag, GitBranch, Archive, ArchiveRestore, ArrowUpDown, Trophy, XCircle, RotateCcw } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const fmt = (n) => n ? n.toLocaleString('uz-UZ') : '0';


function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now  = new Date();
  const diffMs   = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }) +
    ', ' + date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function daysSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d)) / 86400000);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Deal card (draggable) ── */
function DealCard({ deal, isLead, onEdit, onDelete, onMove, onArchive, onClaim, currency, canEdit = true, canDelete = true, overlay = false, selectMode = false, selected = false, onToggleSelect }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal._id, disabled: selectMode });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const days = daysSince(deal.createdAt);

  const actions = (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {canEdit && (
        <button
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onEdit(deal); }}
          className="p-1 rounded hover:bg-surface-100 text-ink-tertiary hover:text-ink transition-colors">
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {canEdit && (
        <button
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onMove(deal); }}
          title={t('deals.moveToFunnel')}
          className="p-1 rounded hover:bg-primary-50 text-ink-tertiary hover:text-primary-600 transition-colors">
          <Layers className="w-3 h-3" />
        </button>
      )}
      {canEdit && (
        <button
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onArchive(deal); }}
          title="Arxivlash"
          className="p-1 rounded hover:bg-amber-50 text-ink-tertiary hover:text-amber-600 transition-colors">
          <Archive className="w-3 h-3" />
        </button>
      )}
      {canDelete && (
        <button
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onDelete(deal._id); }}
          className="p-1 rounded hover:bg-red-50 text-ink-tertiary hover:text-red-500 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const card = isLead ? (
    /* ── ZAYAVKA card ── */
    <div className={`bg-white rounded-xl border border-amber-200 shadow-card group select-none overflow-hidden ${overlay ? 'rotate-1 shadow-card-hover' : 'hover:shadow-card-hover transition-shadow'}`}>
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
            Zayavka
          </span>
          {actions}
        </div>
        {/* Big name */}
        <p className="text-base font-bold text-ink leading-tight mb-2">{deal.title}</p>
        {/* Value */}
        {deal.value > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700">{fmt(deal.value)} {currency}</span>
          </div>
        )}
        {/* Date + time */}
        <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{fmtDate(deal.createdAt)}</span>
          {days > 1 && (
            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600">
              {days} kun
            </span>
          )}
        </div>
      </div>
    </div>
  ) : (
    /* ── SDELKA card ── */
    <div className={`bg-white rounded-xl border border-surface-200 shadow-card group select-none overflow-hidden ${overlay ? 'rotate-1 shadow-card-hover' : 'hover:shadow-card-hover transition-shadow'}`}>
      <div className="h-1 w-full bg-primary-400" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-bold text-ink leading-tight">{deal.title}</p>
          {actions}
        </div>
        {/* Phone */}
        {deal.contact?.phone && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Phone className="w-3 h-3 text-ink-tertiary shrink-0" />
            <span className="text-xs text-ink-secondary font-medium">{deal.contact.phone}</span>
            <span onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}>
              <CallButton phone={deal.contact.phone} iconClassName="w-3 h-3"
                className="p-1 rounded-lg text-green-600 hover:bg-green-50 transition-colors shrink-0" />
            </span>
          </div>
        )}
        {/* Contact name */}
        {deal.contact?.name && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <User className="w-3 h-3 text-ink-tertiary shrink-0" />
            <span className="text-xs text-ink-secondary truncate">{deal.contact.name}</span>
          </div>
        )}
        {/* Value */}
        {deal.value > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="w-3 h-3 text-primary-500 shrink-0" />
            <span className="text-xs font-bold text-primary-700">{fmt(deal.value)} {currency}</span>
          </div>
        )}
        {/* Bottom row: assigned + date + days badge */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-100">
          {deal.assignedTo ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-primary-700">{initials(deal.assignedTo.name)}</span>
              </div>
              <span className="text-[11px] text-ink-tertiary truncate">{deal.assignedTo.name}</span>
            </div>
          ) : onClaim && canEdit ? (
            <button
              onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
              onClick={e => { e.stopPropagation(); e.preventDefault(); onClaim(deal._id); }}
              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
            >
              O'zimga olish
            </button>
          ) : <div />}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <Clock className="w-3 h-3 text-ink-disabled" />
            <span className="text-[11px] text-ink-tertiary">{fmtDate(deal.updatedAt || deal.createdAt)}</span>
            {days > 1 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600">
                {days} kun
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (overlay) return card;
  return (
    <div ref={setNodeRef} style={style} className="relative">
      {selectMode && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleSelect(deal._id); }}
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            selected ? 'bg-primary-600 border-primary-600' : 'bg-white border-surface-300'
          }`}
        >
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      )}
      <div {...(selectMode ? {} : { ...attributes, ...listeners })}
        className={selectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        onClick={e => {
          if (selectMode) { onToggleSelect(deal._id); return; }
          // Only navigate if it wasn't a real drag (distance constraint handles this, but
          // we additionally skip if the user clicked on action buttons)
          if (!isDragging && !e.defaultPrevented) onEdit(deal);
        }}>
        <div className={selectMode && selected ? 'ring-2 ring-primary-400 rounded-xl' : ''}>{card}</div>
      </div>
    </div>
  );
}

/* ── Yopilgan sdelka kartochkasi ("G'olib"/"Yo'qotilgan" ustunlarida) — drag yo'q,
   o'rniga "Qayta faollashtirish" tugmasi bilan istalgan voronka/bosqichga qaytariladi ── */
function ClosedDealCard({ deal, currency, onOpen, onReactivate, canEdit = true }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
      <div className={`h-1 w-full ${deal.status === 'won' ? 'bg-emerald-400' : 'bg-red-400'}`} />
      <div className="p-3 cursor-pointer" onClick={() => onOpen(deal)}>
        <p className="text-sm font-bold text-ink leading-tight mb-1.5">{deal.title}</p>
        {deal.contact?.phone && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Phone className="w-3 h-3 text-ink-tertiary shrink-0" />
            <span className="text-xs text-ink-secondary font-medium">{deal.contact.phone}</span>
          </div>
        )}
        {deal.value > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <DollarSign className="w-3 h-3 text-primary-500 shrink-0" />
            <span className="text-xs font-bold text-primary-700">{fmt(deal.value)} {currency}</span>
          </div>
        )}
        {deal.closeReason && (
          <p className="text-xs text-ink-tertiary bg-surface-50 rounded-lg px-2 py-1 mt-1.5 line-clamp-2">{deal.closeReason}</p>
        )}
      </div>
      {canEdit && (
        <button
          onClick={e => { e.stopPropagation(); onReactivate(deal); }}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 border-t border-surface-100 hover:bg-primary-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Qayta faollashtirish
        </button>
      )}
    </div>
  );
}

/* ── "G'olib" / "Yo'qotilgan" ustuni (drag'siz, statik) ── */
function ClosedColumn({ label, color, icon: Icon, deals, currency, onOpen, onReactivate, canEdit }) {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      <div className="text-center mb-3 px-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
          <span className="font-bold text-sm text-ink truncate">{label}</span>
        </div>
        <span className="text-xs text-ink-tertiary">
          <span className="font-semibold" style={{ color }}>{deals.length}</span> sdelka
          {total > 0 && <span className="ml-1">• <span className="font-semibold">{fmt(total)} {currency}</span></span>}
        </span>
      </div>
      <div className="flex-1 rounded-xl p-2 space-y-2 overflow-y-auto bg-surface-100">
        {deals.length === 0 ? (
          <p className="text-xs text-ink-disabled text-center py-6">Bo'sh</p>
        ) : (
          deals.map(deal => (
            <ClosedDealCard key={deal._id} deal={deal} currency={currency} onOpen={onOpen} onReactivate={onReactivate} canEdit={canEdit} />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Stage column (droppable) ── */
function StageColumn({ stage, deals, onOpen, onDelete, onMove, onArchive, onClaim, onQuickAdd, currency, isFirst, canCreate = true, canEdit = true, canDelete = true, selectMode = false, selectedIds, onToggleSelect, onSelectAllStage }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage._id });
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  const stageAllSelected = selectMode && deals.length > 0 && deals.every(d => selectedIds?.has(d._id));

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      {/* Header — centered */}
      <div className="text-center mb-3 px-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          {selectMode && deals.length > 0 && (
            <input type="checkbox" checked={stageAllSelected} onChange={() => onSelectAllStage(stage._id)}
              title="Shu bosqichdagilarni tanlash"
              className="w-3.5 h-3.5 rounded border-surface-300 shrink-0" />
          )}
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
          <span className="font-bold text-sm text-ink truncate">{stage.name}</span>
          {canCreate && (
            <button
              onClick={() => onQuickAdd(stage._id)}
              className="p-0.5 rounded hover:bg-surface-200 text-ink-disabled hover:text-primary-500 transition-colors"
              title="Tez qo'shish"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isFirst ? (
          <span className="text-xs text-ink-tertiary">
            Zayavka: <span className="font-semibold text-amber-600">{deals.length}</span>
            {total > 0 && <span className="ml-1">• <span className="font-semibold text-amber-600">{fmt(total)} {currency}</span></span>}
          </span>
        ) : (
          <span className="text-xs text-ink-tertiary">
            <span className="font-semibold text-primary-600">{deals.length}</span> sdelka
            {total > 0 && <span className="ml-1">• <span className="font-semibold">{fmt(total)} {currency}</span></span>}
          </span>
        )}
      </div>

      {/* Cards — scrollable, fills remaining height */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 overflow-y-auto transition-colors ${isOver ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-surface-100'}`}
      >
        <SortableContext items={deals.map(d => d._id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard key={deal._id} deal={deal} isLead={isFirst} currency={currency} onEdit={() => onOpen(deal._id)} onDelete={onDelete} onMove={onMove} onArchive={onArchive} onClaim={onClaim}
              canEdit={canEdit} canDelete={canDelete}
              selectMode={selectMode} selected={selectedIds?.has(deal._id)} onToggleSelect={onToggleSelect} />
          ))}
        </SortableContext>
      </div>

    </div>
  );
}

/* ── Deal form modal ── */
function DealModal({ stageId, stages, contacts, users, deal, isLead, currency, onSave, onClose, onContactCreated }) {
  const t = useT();
  useModalOpen();
  const [title,      setTitle]      = useState(deal?.title || '');
  const [stage,      setStage]      = useState(stageId || deal?.stageId || stages[0]?._id || '');
  const [value,      setValue]      = useState(deal?.value ?? '');
  const [source,     setSource]     = useState(deal?.source || '');
  const [notes,      setNotes]      = useState(deal?.notes || '');
  const [assignedTo, setAssignedTo] = useState(deal?.assignedTo?._id || deal?.assignedTo || '');
  const [contact,    setContact]    = useState(deal?.contact?._id || deal?.contact || '');
  const [saving,     setSaving]     = useState(false);
  const [cSearch,    setCSearch]    = useState('');
  const [dealSources, setDealSources] = useState([]);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact,     setNewContact]     = useState({ name: '', phone: '', email: '' });
  const [savingContact,  setSavingContact]  = useState(false);

  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
    axios.get(`${API_URL}/organization/deal-sources`)
      .then(r => setDealSources(r.data.sources || []))
      .catch(() => {});
  }, []);

  const filteredC = contacts.filter(c =>
    !cSearch || c.name.toLowerCase().includes(cSearch.toLowerCase()) || c.phone?.includes(cSearch)
  ).slice(0, 30);

  const submit = async () => {
    if (!title.trim()) { toast.error(t('funnel.titleRequired')); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), stageId: stage, value: Number(value) || 0, source: source || '', notes, assignedTo: assignedTo || null, contact: contact || null });
      onClose();
    } finally { setSaving(false); }
  };

  const handleCreateContact = async () => {
    if (!newContact.name.trim() || savingContact) return;
    setSavingContact(true);
    try {
      const res = await axios.post(`${API}/contacts`, { ...newContact, assignedTo: assignedTo || undefined });
      onContactCreated?.(res.data.contact);
      setContact(res.data.contact._id);
      toast.success(t('funnel.contactCreated'));
      setShowNewContact(false);
      setNewContact({ name: '', phone: '', email: '' });
      setCSearch('');
    } catch (e) {
      const duplicate = e.response?.data?.duplicate;
      if (duplicate) {
        onContactCreated?.(duplicate);
        setContact(duplicate._id);
        toast.success(`${t('funnel.contactExists')}: ${duplicate.name}`);
        setShowNewContact(false);
        setNewContact({ name: '', phone: '', email: '' });
        setCSearch('');
      } else {
        toast.error(e.response?.data?.message || t('funnel.loadError'));
      }
    } finally {
      setSavingContact(false);
    }
  };

  const isLeadStage = stages.length > 0 && String(stage) === String(stages[0]?._id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-md flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink">
            {deal ? t('funnel.edit') : (isLeadStage ? t('funnel.newLead') : t('funnel.newDeal'))}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              {isLeadStage ? t('funnel.leadNameLabel') : t('deals.titleLabel')}
            </label>
            <input className="input" placeholder={isLeadStage ? t('funnel.leadNameLabel') : t('deals.titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('deals.stage')}</label>
            <select className="input" value={stage} onChange={e => setStage(e.target.value)}>
              {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {/* Value */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('deals.value')} ({currency})</label>
            <input className="input" type="number" min="0" placeholder="0" value={value} onChange={e => setValue(e.target.value)} />
          </div>
          {/* Source */}
          {dealSources.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Manba</label>
              <select className="input" value={source} onChange={e => setSource(e.target.value)}>
                <option value="">— Tanlanmagan —</option>
                {dealSources.map(s => (
                  <option key={s._id} value={String(s._id)}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Contact */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('funnel.contactOpt')}</label>
            <input className="input mb-1.5 text-sm" placeholder={t('funnel.searchPlaceholder')} value={cSearch} onChange={e => setCSearch(e.target.value)} />
            <div className="border border-surface-200 rounded-lg max-h-32 overflow-y-auto">
              <button type="button" onClick={() => setContact('')}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${!contact ? 'bg-primary-50 text-primary-700 font-medium' : 'text-ink-tertiary hover:bg-surface-50'}`}>
                {t('funnel.noContact')}
              </button>
              {filteredC.map(c => (
                <button key={c._id} type="button" onClick={() => setContact(c._id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors border-t border-surface-100 ${contact === c._id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-surface-50 text-ink'}`}>
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-ink-tertiary ml-2">{c.phone}</span>}
                </button>
              ))}
            </div>

            {showNewContact ? (
              <div className="mt-2 bg-surface-50 border border-surface-200 rounded-xl p-3 space-y-2">
                <input className="input text-xs" placeholder={t('funnel.contactNamePh')}
                  value={newContact.name} onChange={e => setNewContact(f => ({ ...f, name: e.target.value }))} autoFocus />
                <input className="input text-xs" placeholder={t('funnel.contactPhonePh')}
                  value={newContact.phone} onChange={e => setNewContact(f => ({ ...f, phone: e.target.value }))} />
                <input className="input text-xs" placeholder={t('funnel.contactEmailPh')}
                  value={newContact.email} onChange={e => setNewContact(f => ({ ...f, email: e.target.value }))} />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowNewContact(false)}
                    className="flex-1 py-1.5 text-xs rounded-lg bg-surface-100 text-ink-secondary hover:bg-surface-200 transition-colors">
                    {t('deals.cancel')}
                  </button>
                  <button type="button" onClick={handleCreateContact} disabled={!newContact.name.trim() || savingContact}
                    className="flex-1 py-1.5 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1">
                    {savingContact ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    {t('deals.save')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { setNewContact(f => ({ ...f, name: f.name || title })); setShowNewContact(true); }}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-surface-300 text-xs text-ink-tertiary hover:border-primary-400 hover:text-primary-600 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {t('funnel.createContact')}
              </button>
            )}
          </div>
          {/* Assigned to */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('funnel.responsibleLabel')}</label>
            <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">{t('funnel.unassigned')}</option>
              {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('deals.notes')}</label>
            <textarea className="input resize-none text-sm" rows={2} placeholder={t('funnel.notesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100 shrink-0">
          <button onClick={onClose} className="btn-secondary btn-md">{t('deals.cancel')}</button>
          <button onClick={submit} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {deal ? t('deals.save') : t('funnel.addBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main FunnelPage ── */
/* ── Import leads modal (.xlsx) ── */
function ImportLeadsModal({ funnelId, funnelName, onClose, onDone }) {
  const t = useT();
  const [file,      setFile]      = useState(null);
  const [importing, setImporting] = useState(false);
  const [tplLoading, setTplLoading] = useState(false);
  const [result,    setResult]    = useState(null);
  const fileRef = useRef(null);

  const handleTemplate = async () => {
    setTplLoading(true);
    try {
      const res = await axios.get(`${API}/funnels/${funnelId}/deals/template`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leadlar-shablon.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('funnel.templateError'));
    } finally {
      setTplLoading(false);
    }
  };

  const pickFile = (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { toast.error(t('funnel.onlyXlsx')); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/import`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || t('funnel.importError'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg flex flex-col max-h-[85dvh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary-600" /> {t('funnel.importTitle')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-ink mb-1">{t('funnel.importDone')}</p>
            <p className="text-sm text-ink-secondary">
              <span className="text-emerald-600 font-semibold">{result.created}</span> {t('funnel.importCreated')},{' '}
              <span className="text-ink-tertiary">{result.skipped}</span> {t('funnel.importSkipped')}
            </p>
            <button onClick={onClose} className="btn-primary btn-md mt-6">{t('funnel.close')}</button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <p className="font-semibold mb-1">{t('funnel.importFormat')}</p>
                <code className="font-mono">Sarlavha, Bosqich, Kontakt, Telefon, Manba, Qiymat, Status, Izoh</code>
                <p className="mt-1 text-amber-600">{t('funnel.importHint')}</p>
                <button onClick={handleTemplate} disabled={tplLoading}
                  className="mt-2 inline-flex items-center gap-1.5 font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900 disabled:opacity-50">
                  {tplLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {t('funnel.downloadTemplate')}
                </button>
              </div>

              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-surface-300 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-ink-disabled mx-auto mb-2" />
                  <p className="text-sm font-medium text-ink-secondary">{t('funnel.dropXlsx')}</p>
                  <p className="text-xs text-ink-tertiary mt-1">{t('funnel.orClick')}</p>
                  <input ref={fileRef} type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
                </div>
              ) : (
                <div className="flex items-center justify-between border border-surface-200 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                  <button onClick={() => setFile(null)} className="text-xs text-ink-disabled hover:text-red-500 flex items-center gap-1 shrink-0">
                    <X className="w-3 h-3" /> {t('funnel.clear')}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100 shrink-0">
              <button onClick={onClose} className="btn-secondary btn-md">{t('funnel.cancel')}</button>
              <button onClick={handleImport} disabled={!file || importing}
                className="btn-primary btn-md flex items-center gap-2">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t('funnel.importBtn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Intake statistika (nechta lid keldi vs nechtasi menejerga biriktirildi) ── */
function IntakeStatsPanel({ funnelId }) {
  const [dateFilter, setDateFilter] = useState('week'); // 'today' | 'week' | 'month'
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

  useEffect(() => {
    const to = new Date();
    const from = new Date(to);
    if (dateFilter === 'today') { /* from = to */ }
    else if (dateFilter === 'month') from.setDate(to.getDate() - 29);
    else from.setDate(to.getDate() - 6);

    setLoading(true);
    axios.get(`${API}/funnels/${funnelId}/intake-stats`, {
      params: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    }).then(r => setStats(r.data)).catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, [funnelId, dateFilter, API]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>;
  if (!stats) return null;

  const chart = stats.chart || [];
  const maxVal = Math.max(1, ...chart.map(d => d.total));
  const fmtDay = (iso) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; };
  // ~35px/bar minimum shown, tanlab (30 kunda hammasini emas, siyraklashtirib) label chiqariladi
  const labelEvery = Math.ceil(chart.length / 10) || 1;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Davr tanlash */}
        <div className="flex items-center gap-1.5 bg-surface-100 rounded-xl p-1 w-fit">
          {[['today', 'Bugun'], ['week', '7 kun'], ['month', '30 kun']].map(([key, label]) => (
            <button key={key} onClick={() => setDateFilter(key)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${dateFilter === key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-surface-200 rounded-2xl p-4">
            <p className="text-xs text-ink-tertiary mb-1">Jami tashrif</p>
            <p className="text-2xl font-bold text-ink">{stats.total}</p>
          </div>
          <div className="bg-white border border-surface-200 rounded-2xl p-4">
            <p className="text-xs text-ink-tertiary mb-1">Menejerga biriktirilgan</p>
            <p className="text-2xl font-bold" style={{ color: '#059669' }}>{stats.assigned}</p>
          </div>
          <div className="bg-white border border-surface-200 rounded-2xl p-4">
            <p className="text-xs text-ink-tertiary mb-1">Biriktirilish foizi</p>
            <p className="text-2xl font-bold text-ink">{stats.assignRate}%</p>
          </div>
        </div>

        {stats.total === 0 ? (
          <div className="text-center py-14 text-ink-tertiary text-sm">Shu davrda lid kelmagan</div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-ink-secondary">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#3b82f6' }} /> Jami tashrif</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#059669' }} /> Menejerga biriktirilgan</span>
            </div>

            {/* Bar chart */}
            <div className="bg-white border border-surface-200 rounded-2xl p-4">
              <svg viewBox={`0 0 ${chart.length * 28} 140`} className="w-full" style={{ height: 140 }} role="img" aria-label="Kunlar bo'yicha tashrif va biriktirish soni">
                {chart.map((d, i) => {
                  const x = i * 28 + 6;
                  const totalH    = Math.round((d.total    / maxVal) * 100);
                  const assignedH = Math.round((d.assigned / maxVal) * 100);
                  return (
                    <g key={d.date}>
                      <title>{`${fmtDay(d.date)}: ${d.total} tashrif, ${d.assigned} biriktirilgan`}</title>
                      <rect x={x} y={110 - totalH} width={16} height={totalH} rx={2} fill="#3b82f6" />
                      {d.assigned > 0 && <rect x={x} y={110 - assignedH} width={16} height={assignedH} rx={2} fill="#059669" />}
                      {i % labelEvery === 0 && (
                        <text x={x + 8} y={126} textAnchor="middle" fontSize={8} fill="#94a3b8">{fmtDay(d.date)}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <button onClick={() => setShowTable(v => !v)} className="text-xs text-primary-600 hover:underline">
              {showTable ? 'Jadvalni yashirish' : 'Jadval ko\'rinishida ko\'rish'}
            </button>
            {showTable && (
              <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-ink-tertiary">Sana</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-ink-tertiary">Jami tashrif</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-ink-tertiary">Menejerga biriktirilgan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.map(d => (
                      <tr key={d.date} className="border-t border-surface-100">
                        <td className="px-4 py-2 text-ink-secondary">{fmtDay(d.date)}</td>
                        <td className="px-4 py-2 text-right text-ink">{d.total}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#059669' }}>{d.assigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Arxivlangan lidlar ── */
function DealArchiveModal({ funnelId, stages, onClose, onRestored, canEdit = true, canDelete = true }) {
  const navigate = useNavigate();
  useModalOpen();
  const [deals,   setDeals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState(null);

  useEffect(() => {
    axios.get(`${API}/funnels/${funnelId}/deals`, { params: { archived: true } })
      .then(r => setDeals(r.data.deals || []))
      .catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, [funnelId]);

  const stageName = (id) => stages.find(s => String(s._id) === String(id))?.name || '—';

  const restore = async (id) => {
    setBusyId(id);
    try {
      await axios.post(`${API}/funnels/${funnelId}/deals/bulk-archive`, { dealIds: [id], archived: false });
      setDeals(prev => prev.filter(x => x._id !== id));
      onRestored();
      toast.success('Arxivdan qaytarildi');
    } catch (e) { toast.error(e.response?.data?.message || 'Xato'); }
    finally { setBusyId(null); }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await axios.delete(`${API}/funnels/${funnelId}/deals`, { data: { dealIds: [id] } });
      setDeals(prev => prev.filter(x => x._id !== id));
      toast.success("O'chirildi");
    } catch (e) { toast.error(e.response?.data?.message || 'Xato'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-semibold text-ink flex items-center gap-2">
            <Archive className="w-4 h-4" /> Arxiv
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
          ) : deals.length === 0 ? (
            <p className="text-sm text-ink-tertiary text-center py-10">Arxiv bo'sh</p>
          ) : (
            <div className="space-y-2">
              {deals.map(deal => (
                <div key={deal._id} className="flex items-start gap-3 p-3 border border-surface-100 rounded-xl">
                  <button
                    onClick={() => { onClose(); navigate(`/funnel/${funnelId}/deal/${deal._id}`, { state: { fromArchive: true } }); }}
                    className="flex-1 min-w-0 text-left hover:bg-surface-50 -m-1 p-1 rounded-lg transition-colors"
                    title="Sdelkani ochish"
                  >
                    <p className="text-sm font-medium text-ink truncate">{deal.title}</p>
                    <p className="text-xs text-ink-tertiary truncate">{stageName(deal.stageId)}</p>
                    {deal.contact?.phone && (
                      <p className="text-xs text-ink-secondary truncate mt-0.5">
                        {deal.contact.name ? `${deal.contact.name} — ` : ''}{deal.contact.phone}
                      </p>
                    )}
                    {deal.archiveReason && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1.5">
                        {deal.archiveReason}
                      </p>
                    )}
                  </button>
                  {canEdit && (
                    <button onClick={() => restore(deal._id)} disabled={busyId === deal._id}
                      title="Qaytarish"
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <ArchiveRestore className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => remove(deal._id)} disabled={busyId === deal._id}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FunnelPage({ funnelId }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();
  const t = useT();
  const currency  = useSelector(s => s.auth.user?.organization?.currency || 'UZS');
  const perm = usePermissions();
  const canCreate = perm.can('funnels', 'create');
  const canEdit   = perm.can('funnels', 'edit');
  const canDelete = perm.can('funnels', 'delete');
  const [funnel,      setFunnel]      = useState(null);
  const [deals,       setDeals]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeId,    setActiveId]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState(''); // '' = hammasi
  const [sortBy, setSortBy] = useState(''); // '' = standart (surish tartibi)
  const [filterSource, setFilterSource] = useState('');         // '' = hammasi, '__none__' = manbasiz
  const [filterCF,     setFilterCF]     = useState({});          // { [fieldId]: value } — dropdown/multiselect custom maydonlar
  const [filterDateFrom, setFilterDateFrom] = useState(''); // yaratilgan sana bo'yicha filtr — dan
  const [filterDateTo,   setFilterDateTo]   = useState(''); // yaratilgan sana bo'yicha filtr — gacha
  // Yopilgan (g'olib/yo'qotilgan) sdelkalar odatiy holatda taxtadan yashiringan —
  // amoCRM'dagi kabi, faqat shu belgi yoqilsa ko'rinadi.
  const [showClosed, setShowClosed] = useState(false);
  // Yopilgan sdelkani qayta faollashtirish — istalgan voronka/bosqichga qaytarish
  const [reactivateDeal,     setReactivateDeal]     = useState(null);
  const [reactivateFunnelId, setReactivateFunnelId] = useState('');
  const [reactivateStageId,  setReactivateStageId]  = useState('');
  const [reactivating,       setReactivating]       = useState(false);
  const [dealSources,  setDealSources]  = useState([]);
  const [cfSections,   setCfSections]   = useState([]);
  const [pendingMove, setPendingMove] = useState(null);
  const [moveValue,   setMoveValue]   = useState('');

  // Boshqa varonkaga o'tkazish (kartochkadagi tugma)
  const [moveDeal,          setMoveDeal]          = useState(null); // qaysi deal o'tkazilyapti
  const [moveFunnelId,      setMoveFunnelId]      = useState('');
  const [moveStageId,       setMoveStageId]       = useState('');
  const [movingFunnel,      setMovingFunnel]      = useState(false);

  // Ommaviy (bulk) amallar: bir nechta lidni tanlab bosqich/varonka o'zgartirish
  const [selectMode,        setSelectMode]        = useState(false);
  const [selectedIds,       setSelectedIds]       = useState(() => new Set());
  const [bulkMovingStage,   setBulkMovingStage]   = useState(false);
  const [bulkMoveOpen,      setBulkMoveOpen]      = useState(false);
  const [bulkMoveFunnelId,  setBulkMoveFunnelId]  = useState('');
  const [bulkMoveStageId,   setBulkMoveStageId]   = useState('');
  const [bulkMovingFunnel,  setBulkMovingFunnel]  = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting,      setBulkDeleting]      = useState(false);
  const [bulkArchiving,     setBulkArchiving]     = useState(false);
  const [archiveTargetIds,  setArchiveTargetIds]  = useState(null); // null = yopiq; array = ochiq (1 yoki ko'p lid)
  const [bulkArchiveReason, setBulkArchiveReason] = useState('');
  const [bulkAssigning,     setBulkAssigning]     = useState(false);
  const [showArchive,       setShowArchive]       = useState(false);

  // F-13: quick-add modal
  const [contacts,      setContacts]      = useState([]);
  const [users,         setUsers]         = useState([]);
  const [quickStageId,  setQuickStageId]  = useState(null); // null = closed
  const [showImport,    setShowImport]    = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [toolbarOpen,   setToolbarOpen]   = useState(true);
  const [showStats,     setShowStats]     = useState(false);
  // Barcha voronka nomlari (ko'rinish cheklovisiz) - "boshqa voronkaga yuborish" tanlovi uchun
  const [allFunnelNames, setAllFunnelNames] = useState([]);

  // Bosqich ustunlari ekranga sig'sa markazga tortiladi; sig'masa (ko'p bosqich)
  // odatdagidek chapdan boshlab scroll qilinadi.
  const boardRef = useRef(null);
  const [boardFits, setBoardFits] = useState(false);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const check = () => setBoardFits(el.scrollWidth <= el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [funnel, deals]);

  const sensors = useSensors(
    // Desktop: sichqoncha bilan 5px surilsa drag boshlanadi
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Telefon: bosib turib (200ms) drag; tez swipe — ro'yxat scroll bo'ladi
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const load = useCallback(async () => {
    if (!funnelId) return;
    setLoading(true);
    try {
      const [fRes, cRes, uRes, nRes, sRes, dfRes] = await Promise.all([
        axios.get(`${API}/funnels/${funnelId}/deals`),
        // Contacts moduli alohida RBAC bilan boshqariladi (masalan "operator" kabi
        // rol funnels'ga ega bo'lib, contacts'ga ega bo'lmasligi mumkin) — shu sabab
        // 403 bo'lsa ham butun boardni yuklashni to'xtatmaymiz, kontaktlar bo'sh qoladi.
        axios.get(`${API}/contacts?limit=200`).catch(() => ({ data: {} })),
        axios.get(`${API}/organization/users`),
        axios.get(`${API}/funnels/names`),
        axios.get(`${API}/organization/deal-sources`).catch(() => ({ data: {} })),
        axios.get(`${API}/organization/deal-fields`).catch(() => ({ data: {} })),
      ]);
      setFunnel(fRes.data.funnel);
      setDeals(fRes.data.deals);
      setContacts(cRes.data.contacts || []);
      setUsers(uRes.data.users || []);
      setAllFunnelNames(nRes.data.funnels || []);
      setDealSources(sRes.data.sources || []);
      setCfSections(dfRes.data.sections || []);
    } catch (e) {
      console.error('[funnel] load error:', e.response?.data?.message || e.message);
      toast.error(t('funnel.loadError'));
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);

  // Arxivdagi lidni ochib, "orqaga" bosilganda — arxiv oynasi qayta ochilsin
  useEffect(() => {
    if (location.state?.openArchive) {
      setShowArchive(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /* Excel eksport */
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/funnels/${funnelId}/deals/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(funnel?.name || 'leadlar').replace(/[^\wЀ-ӿ\- ]+/g, '').trim() || 'leadlar'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('funnel.exportDone'));
    } catch {
      toast.error(t('funnel.exportError'));
    } finally {
      setExporting(false);
    }
  };

  // Real-time sync: boshqa foydalanuvchi lid qo'shsa/o'zgartirsa/o'chirsa yoki
  // varonka bosqichlarini tahrirlasa — sahifa avtomatik yangilanadi (refresh shart emas).
  useEffect(() => {
    if (!funnelId) return;
    const socket = getSocket();
    const sameFunnel = (fid) => String(fid) === String(funnelId);
    const onDealCreated = ({ funnelId: fid, deal }) => {
      if (!sameFunnel(fid)) return;
      setDeals(prev => prev.some(d => d._id === deal._id) ? prev : [...prev, deal]);
    };
    const onDealUpdated = ({ funnelId: fid, deal }) => {
      if (!sameFunnel(fid)) return;
      setDeals(prev => prev.map(d => d._id === deal._id ? deal : d));
    };
    const onDealDeleted = ({ funnelId: fid, dealId }) => {
      if (!sameFunnel(fid)) return;
      setDeals(prev => prev.filter(d => d._id !== dealId));
    };
    const onFunnelUpdated = ({ funnel: f }) => {
      if (!sameFunnel(f._id)) return;
      setFunnel(f);
    };
    socket.on('deal:created',   onDealCreated);
    socket.on('deal:updated',   onDealUpdated);
    socket.on('deal:deleted',   onDealDeleted);
    socket.on('funnel:updated', onFunnelUpdated);
    return () => {
      socket.off('deal:created',   onDealCreated);
      socket.off('deal:updated',   onDealUpdated);
      socket.off('deal:deleted',   onDealDeleted);
      socket.off('funnel:updated', onFunnelUpdated);
    };
  }, [funnelId]);

  /* Filtrlash mumkin bo'lgan custom maydonlar: faqat tanlovli (dropdown/
     multiselect) — teg, biznes yo'nalishi, hudud kabi. Matn/son maydonlar
     (Kompaniya, Xodimlar soni, Izoh) filtrga chiqmaydi. Xavfsizlik uchun
     ≤30 xil qiymat sharti ham qoladi. */
  const filterableFields = cfSections
    .flatMap(s => (s.fields || []))
    .filter(f => f && f.id && (f.type === 'dropdown' || f.type === 'multiselect'))
    .map(f => {
      const fromOptions = Array.isArray(f.options) ? f.options.map(String) : [];
      const fromDeals = deals.flatMap(d => {
        const cv = d.customFieldValues?.[f.id];
        if (Array.isArray(cv)) return cv.map(String);
        return cv !== undefined && cv !== null && String(cv).trim() !== '' ? [String(cv)] : [];
      });
      return { ...f, _values: [...new Set([...fromOptions, ...fromDeals])] };
    })
    .filter(f => f._values.length > 0 && f._values.length <= 30);
  /* Deal'larda uchraydigan, lekin ro'yxatda yo'q manbalar ham filtrда chiqsin */
  const extraSources = [...new Set(
    deals.map(d => d.source).filter(v => v && !dealSources.some(s => String(s._id) === String(v) || s.name === v))
  )];

  /* Filtrsiz (faqat arxivlanmagan) jami sdelkalar soni — yuqoridagi hisoblagich uchun */
  const totalDealsCount = deals.filter(d => !d.archived).length;

  /* Search + mas'ul + manba + custom maydon filtrlari */
  const q = search.trim().toLowerCase();
  const cfActive = Object.entries(filterCF).filter(([, v]) => v);
  const filteredDeals = deals
    .filter(d => !d.archived)
    .filter(d => !q ||
        d.title.toLowerCase().includes(q) ||
        d.contact?.name?.toLowerCase().includes(q) ||
        d.contact?.phone?.includes(q)
      )
    .filter(d => !filterAssignedTo || String(d.assignedTo?._id || d.assignedTo || '') === String(filterAssignedTo))
    .filter(d => {
      if (!filterSource) return true;
      if (filterSource === '__none__') return !d.source;
      return String(d.source) === filterSource || d.source === filterSource;
    })
    .filter(d => {
      for (const [fid, val] of cfActive) {
        const cv = d.customFieldValues?.[fid];
        if (val === '__none__') {
          if (Array.isArray(cv) ? cv.length : (cv !== undefined && cv !== null && String(cv).trim() !== '')) return false;
          continue;
        }
        if (Array.isArray(cv) ? !cv.map(String).includes(val) : String(cv ?? '') !== val) return false;
      }
      return true;
    })
    .filter(d => {
      if (!filterDateFrom && !filterDateTo) return true;
      const created = new Date(d.createdAt);
      if (filterDateFrom && created < new Date(`${filterDateFrom}T00:00:00`)) return false;
      if (filterDateTo && created > new Date(`${filterDateTo}T23:59:59.999`)) return false;
      return true;
    });

  /* Saralash — standart holatda surish tartibi (order), aks holda tanlangan mezon bo'yicha */
  const sortDeals = (a, b) => {
    switch (sortBy) {
      case 'created_asc':  return new Date(a.createdAt) - new Date(b.createdAt);
      case 'created_desc': return new Date(b.createdAt) - new Date(a.createdAt);
      case 'updated_asc':  return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
      case 'updated_desc': return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      case 'title_asc':    return a.title.localeCompare(b.title, 'uz');
      case 'title_desc':   return b.title.localeCompare(a.title, 'uz');
      default:              return a.order - b.order;
    }
  };

  /* Group deals by stage — faqat faol sdelkalar (yopilganlar "Yopilganlarni ko'rsatish"
     yoqilganda alohida G'olib/Yo'qotilgan ustunlarida ko'rinadi, pastga qarang) */
  const dealsByStage = (funnel?.stages || []).reduce((acc, s) => {
    acc[s._id] = filteredDeals.filter(d => d.status === 'active' && String(d.stageId) === String(s._id)).sort(sortDeals);
    return acc;
  }, {});

  /* Yopilgan sdelkalar — "Yopilganlarni ko'rsatish" yoqilganda, bosqichidan qat'i
     nazar, holatiga (g'olib/yo'qotilgan) qarab ikkita ustunga yig'iladi */
  const closedWonDeals  = filteredDeals.filter(d => d.status === 'won').sort(sortDeals);
  const closedLostDeals = filteredDeals.filter(d => d.status === 'lost').sort(sortDeals);

  const activeDeal = activeId ? deals.find(d => d._id === activeId) : null;

  /* Ommaviy tanlash */
  const toggleSelect = (dealId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId); else next.add(dealId);
      return next;
    });
  };
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setBulkDeleteConfirm(false); };
  // Bosqich bo'yicha "hammasini tanlash" — faqat o'sha bosqichdagi lidlarga tegishli
  const toggleSelectStage = (stageId) => {
    const stageDealIds = (dealsByStage[stageId] || []).map(d => d._id);
    const allIn = stageDealIds.length > 0 && stageDealIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      stageDealIds.forEach(id => allIn ? next.delete(id) : next.add(id));
      return next;
    });
  };

  /* DnD handlers */
  const handleDragStart = ({ active }) => setActiveId(active.id);

  const applyMove = async (deal, targetStageId, value) => {
    setDeals(prev => prev.map(d => d._id === deal._id ? { ...d, stageId: targetStageId, value: value ?? d.value } : d));
    try {
      const body = { stageId: targetStageId };
      if (value !== undefined) body.value = value;
      await axios.put(`${API}/funnels/${funnelId}/deals/${deal._id}`, body);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
      load();
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const srcDeal = deals.find(d => d._id === active.id);
    if (!srcDeal) return;

    let targetStageId = over.id;
    const overDeal = deals.find(d => d._id === over.id);
    if (overDeal) targetStageId = overDeal.stageId;

    if (String(srcDeal.stageId) === String(targetStageId)) {
      // Same stage reorder
      const stageDeals = deals.filter(d => String(d.stageId) === String(targetStageId));
      const oldIdx = stageDeals.findIndex(d => d._id === srcDeal._id);
      const newIdx = stageDeals.findIndex(d => d._id === overDeal?._id);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(stageDeals, oldIdx, newIdx).map((d, i) => ({ ...d, order: i }));
      setDeals(prev => prev.map(d => reordered.find(r => r._id === d._id) || d));
      // Har bir deal uchun yangi tartibni serverga saqlaymiz
      reordered.forEach(d => {
        axios.put(`${API}/funnels/${funnelId}/deals/${d._id}`, { order: d.order }).catch(() => load());
      });
      return;
    }

    // Moving from first stage (lead) → any other stage: ask for value
    const firstStageId = funnel?.stages?.[0]?._id;
    if (firstStageId && String(srcDeal.stageId) === String(firstStageId)) {
      setMoveValue(srcDeal.value ? String(srcDeal.value) : '');
      setPendingMove({ deal: srcDeal, targetStageId });
      return;
    }

    // Normal cross-stage move
    applyMove(srcDeal, targetStageId);
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    applyMove(pendingMove.deal, pendingMove.targetStageId, Number(moveValue) || 0);
    setPendingMove(null);
    setMoveValue('');
  };

  const cancelMove = () => {
    setPendingMove(null);
    setMoveValue('');
  };

  const handleDeleteDeal = async (dealId) => {
    if (!window.confirm(t('funnel.deleteConfirm'))) return;
    setDeals(prev => prev.filter(d => d._id !== dealId));
    try {
      await axios.delete(`${API}/funnels/${funnelId}/deals/${dealId}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
      load();
    }
  };

  // "O'zimga olish" — pool'dagi (mas'ulsiz) lidni o'ziga biriktirib olish
  const handleClaimDeal = async (dealId) => {
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/${dealId}/claim`);
      setDeals(prev => prev.map(d => d._id === dealId ? res.data.deal : d));
      toast.success("O'zingizga oldingiz");
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
      load();
    }
  };

  // Boshqa varonkaga o'tkazish - ko'rinish cheklovisiz to'liq ro'yxatdan (allFunnelNames),
  // shunda ko'ra olmagan voronkaga ham lid yuborish mumkin bo'ladi.
  const moveTargetFunnels = allFunnelNames.filter(f => String(f._id) !== String(funnelId));
  const moveTargetFunnel  = moveTargetFunnels.find(f => String(f._id) === String(moveFunnelId));

  const openMoveModal = (deal) => {
    setMoveDeal(deal);
    setMoveFunnelId('');
    setMoveStageId('');
  };

  const handleMoveFunnel = async () => {
    if (!moveDeal || !moveFunnelId || !moveStageId) return;
    setMovingFunnel(true);
    try {
      await axios.post(`${API}/funnels/${funnelId}/deals/${moveDeal._id}/move`, {
        targetFunnelId: moveFunnelId, targetStageId: moveStageId,
      });
      setDeals(prev => prev.filter(d => d._id !== moveDeal._id));
      toast.success(t('deals.moveSuccess'));
      setMoveDeal(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setMovingFunnel(false);
    }
  };

  // Yopilgan sdelkani qayta faollashtirish — istalgan voronka (shu joriysi ham
  // bo'lishi mumkin) va bosqichga qaytariladi
  const reactivateTargetFunnel = allFunnelNames.find(f => String(f._id) === String(reactivateFunnelId));
  const openReactivateModal = (deal) => {
    setReactivateDeal(deal);
    setReactivateFunnelId(String(funnelId));
    setReactivateStageId('');
  };
  const handleReactivate = async () => {
    if (!reactivateDeal || !reactivateFunnelId || !reactivateStageId) return;
    setReactivating(true);
    try {
      if (String(reactivateFunnelId) === String(funnelId)) {
        const res = await axios.put(`${API}/funnels/${funnelId}/deals/${reactivateDeal._id}`, { stageId: reactivateStageId });
        setDeals(prev => prev.map(d => d._id === reactivateDeal._id ? res.data.deal : d));
      } else {
        await axios.post(`${API}/funnels/${funnelId}/deals/${reactivateDeal._id}/move`, {
          targetFunnelId: reactivateFunnelId, targetStageId: reactivateStageId,
        });
        setDeals(prev => prev.filter(d => d._id !== reactivateDeal._id));
      }
      toast.success('Qayta faollashtirildi');
      setReactivateDeal(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setReactivating(false);
    }
  };

  // Ommaviy: tanlangan lidlarni shu varonka ichida boshqa bosqichga o'tkazish
  const handleBulkStageMove = async (stageId) => {
    if (!stageId || selectedIds.size === 0) return;
    setBulkMovingStage(true);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/bulk-move`, {
        dealIds: [...selectedIds], targetStageId: stageId,
      });
      const moved = res.data.moved || [];
      setDeals(prev => prev.map(d => moved.find(m => m._id === d._id) || d));
      toast.success(`${moved.length} ta lid ko'chirildi${res.data.skipped ? `, ${res.data.skipped} tasi o'tkazib yuborildi` : ''}`);
      exitSelectMode();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setBulkMovingStage(false);
    }
  };

  // Ommaviy: tanlangan lidlarni boshqa varonkaga o'tkazish
  const bulkMoveTargetFunnel = moveTargetFunnels.find(f => String(f._id) === String(bulkMoveFunnelId));
  const openBulkMoveModal = () => {
    setBulkMoveFunnelId(''); setBulkMoveStageId(''); setBulkMoveOpen(true);
  };
  const handleBulkMoveFunnel = async () => {
    if (!bulkMoveFunnelId || !bulkMoveStageId || selectedIds.size === 0) return;
    setBulkMovingFunnel(true);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/bulk-move`, {
        dealIds: [...selectedIds], targetFunnelId: bulkMoveFunnelId, targetStageId: bulkMoveStageId,
      });
      const moved = res.data.moved || [];
      const movedIds = new Set(moved.map(d => d._id));
      setDeals(prev => prev.filter(d => !movedIds.has(d._id)));
      toast.success(`${moved.length} ta lid o'tkazildi${res.data.skipped ? `, ${res.data.skipped} tasi o'tkazib yuborildi` : ''}`);
      setBulkMoveOpen(false);
      exitSelectMode();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setBulkMovingFunnel(false);
    }
  };

  // Ommaviy: tanlangan lidlarni o'chirish
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const res = await axios.delete(`${API}/funnels/${funnelId}/deals`, { data: { dealIds: [...selectedIds] } });
      const deletedIds = selectedIds;
      setDeals(prev => prev.filter(d => !deletedIds.has(d._id)));
      toast.success(`${res.data.deleted} ta lid o'chirildi${res.data.skipped ? `, ${res.data.skipped} tasi o'tkazib yuborildi` : ''}`);
      exitSelectMode();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Arxivlash — bitta kartochkadan ("Tanlash" rejimisiz) yoki tanlangan bir nechtasidan,
  // ikkalasida ham sabab (izoh) so'raladi
  const openBulkArchiveModal = () => {
    if (selectedIds.size === 0) return;
    setBulkArchiveReason('');
    setArchiveTargetIds([...selectedIds]);
  };
  const openSingleArchiveModal = (deal) => {
    setBulkArchiveReason('');
    setArchiveTargetIds([deal._id]);
  };
  const handleBulkArchive = async () => {
    if (!archiveTargetIds?.length || !bulkArchiveReason.trim()) return;
    setBulkArchiving(true);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/bulk-archive`, {
        dealIds: archiveTargetIds, archived: true, reason: bulkArchiveReason.trim(),
      });
      const archivedIds = new Set(archiveTargetIds);
      setDeals(prev => prev.filter(d => !archivedIds.has(d._id)));
      toast.success(`${res.data.updated} ta lid arxivlandi${res.data.skipped ? `, ${res.data.skipped} tasi o'tkazib yuborildi` : ''}`);
      setArchiveTargetIds(null);
      exitSelectMode();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setBulkArchiving(false);
    }
  };

  // Ommaviy: tanlangan lidlarni kimgadir biriktirish
  const handleBulkAssign = async (userId) => {
    if (selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const res = await axios.post(`${API}/funnels/${funnelId}/deals/bulk-assign`, {
        dealIds: [...selectedIds], assignedTo: userId || null,
      });
      const assignee = users.find(u => u._id === userId);
      setDeals(prev => prev.map(d => selectedIds.has(d._id) ? { ...d, assignedTo: assignee || null } : d));
      toast.success(`${res.data.updated} ta lidga biriktirildi${res.data.skipped ? `, ${res.data.skipped} tasi o'tkazib yuborildi` : ''}`);
      exitSelectMode();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setBulkAssigning(false);
    }
  };

  // F-13: quick create deal from column header
  const handleQuickCreate = async ({ title, stageId, value, notes, assignedTo, contact }) => {
    const res = await axios.post(`${API}/funnels/${funnelId}/deals`, {
      title, stageId, value: Number(value) || 0, notes,
      assignedTo: assignedTo || null, contact: contact || null,
    });
    setDeals(prev => prev.some(d => d._id === res.data.deal._id) ? prev : [...prev, res.data.deal]);
    toast.success('Lid qo\'shildi');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" />
    </div>
  );

  if (!funnel) return (
    <div className="flex items-center justify-center h-full text-ink-tertiary text-sm">
      {t('funnel.noFunnel')}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-2 md:py-4 border-b border-surface-100 bg-white shrink-0 flex flex-col gap-2 md:gap-3">
        {/* Title + Action buttons — o'z qatorida, filtrlardan mustaqil, kerak bo'lsa o'zi ichida buklanadi */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <h1 className="text-lg font-bold text-ink">{funnel.name}</h1>
            <button
              onClick={() => setToolbarOpen(v => !v)}
              title={toolbarOpen ? "Filtrlarni yig'ish" : "Filtrlarni ochish"}
              className="p-1 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${toolbarOpen ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-xs font-medium text-ink-tertiary bg-surface-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              {filteredDeals.length !== totalDealsCount
                ? `${filteredDeals.length} / ${totalDealsCount} ta sdelka`
                : `${totalDealsCount} ta sdelka`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canEdit && (
              <button
                onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                title="Ommaviy tanlash"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  selectMode ? 'border-primary-300 bg-primary-50 text-primary-600' : 'border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink'
                }`}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">{selectMode ? 'Bekor qilish' : 'Tanlash'}</span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowArchive(true)}
                title="Arxiv"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Arxiv</span>
              </button>
            )}
            <button
              onClick={() => setShowStats(v => !v)}
              title="Statistika"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                showStats ? 'border-primary-300 bg-primary-50 text-primary-600' : 'border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Statistika</span>
            </button>
            <button
              onClick={() => navigate('/funnel/journey-analytics')}
              title={t('funnel.journeyAnalytics')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">{t('funnel.journeyAnalytics')}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              title={t('funnel.export')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{t('funnel.export')}</span>
            </button>
            {canCreate && (
              <button
                onClick={() => setShowImport(true)}
                title={t('funnel.import')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">{t('funnel.import')}</span>
              </button>
            )}
            {funnel.stages.length >= 1 && canCreate && (
              <button
                onClick={() => navigate(`/funnel/${funnelId}/deal/new`)}
                className="btn-primary btn-md flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('funnel.newLead')}</span>
              </button>
            )}
          </div>
        </div>

        {toolbarOpen && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary pointer-events-none" />
              <input
                className="input pl-9 text-sm h-8 md:h-9 w-full"
                placeholder={t('funnel.dealSearch')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Saralash */}
            <div className="relative shrink-0">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
              <select
                title={t('funnel.sortLabel')}
                className="pl-8 pr-8 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="">{t('funnel.sortManual')}</option>
                <option value="created_asc">{t('funnel.sortCreatedAsc')}</option>
                <option value="created_desc">{t('funnel.sortCreatedDesc')}</option>
                <option value="updated_asc">{t('funnel.sortUpdatedAsc')}</option>
                <option value="updated_desc">{t('funnel.sortUpdatedDesc')}</option>
                <option value="title_asc">{t('funnel.sortTitleAsc')}</option>
                <option value="title_desc">{t('funnel.sortTitleDesc')}</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
            </div>

            {/* Mas'ul bo'yicha filtr — istalgan xodimni tanlash */}
            <div className="relative shrink-0">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
              <select
                className="pl-8 pr-8 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none"
                value={filterAssignedTo}
                onChange={e => setFilterAssignedTo(e.target.value)}
              >
                <option value="">{t('tasks.allAssignees')}</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
            </div>

            {/* Manba bo'yicha filtr */}
            {(dealSources.length > 0 || extraSources.length > 0) && (
              <div className="relative shrink-0">
                <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
                <select
                  className="pl-8 pr-8 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none"
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                >
                  <option value="">Barcha manbalar</option>
                  {dealSources.map(s => <option key={String(s._id)} value={String(s._id)}>{s.name}</option>)}
                  {extraSources.map(v => <option key={v} value={v}>{v}</option>)}
                  <option value="__none__">— Manbasiz —</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
              </div>
            )}

            {/* Custom maydon (Teg / Biznes yo'nalishi ...) bo'yicha filtrlar */}
            {filterableFields.map(f => (
              <div key={f.id} className="relative shrink-0">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
                <select
                  className="pl-8 pr-8 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none"
                  value={filterCF[f.id] || ''}
                  onChange={e => setFilterCF(prev => ({ ...prev, [f.id]: e.target.value }))}
                >
                  <option value="">{f.key}: barchasi</option>
                  {f._values.map(o => <option key={o} value={o}>{o}</option>)}
                  <option value="__none__">— {f.key} yo'q —</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
              </div>
            ))}

            {/* Yaratilgan sana bo'yicha filtr */}
            <div className="flex items-center gap-1.5 shrink-0 bg-surface-50 border border-surface-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-ink-disabled shrink-0" />
              <input type="date" title="Yaratilgan sana — dan"
                className="bg-transparent text-sm text-ink outline-none border-0 focus:outline-none focus:ring-0 w-[128px]"
                value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              <span className="text-ink-disabled">—</span>
              <input type="date" title="Yaratilgan sana — gacha"
                className="bg-transparent text-sm text-ink outline-none border-0 focus:outline-none focus:ring-0 w-[128px]"
                value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              {(filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                  className="text-ink-tertiary hover:text-ink shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Yopilgan (g'olib/yo'qotilgan) sdelkalarni ko'rsatish — odatiy holatda yashiringan */}
            <label className="flex items-center gap-1.5 shrink-0 bg-surface-50 border border-surface-200 rounded-xl px-2.5 py-1.5 cursor-pointer select-none text-sm text-ink-secondary">
              <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-surface-300" />
              Yopilganlarni ko'rsatish
            </label>
          </div>
        )}
      </div>

      {/* Ommaviy amallar paneli */}
      {selectMode && (
        <div className="px-4 md:px-6 py-2 border-b border-primary-100 bg-primary-50 flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-primary-700">{selectedIds.size} ta tanlandi</span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative shrink-0">
              <select
                className="pl-3 pr-8 py-2 text-sm bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none disabled:opacity-60"
                value=""
                disabled={selectedIds.size === 0 || bulkMovingStage}
                onChange={e => { if (e.target.value) handleBulkStageMove(e.target.value); }}
              >
                <option value="">Bosqichga o'tkazish...</option>
                {funnel.stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
            </div>
            <button
              onClick={openBulkMoveModal}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors disabled:opacity-60"
            >
              <Layers className="w-4 h-4" /> Boshqa varonkaga
            </button>
            <div className="relative shrink-0">
              <select
                className="pl-8 pr-8 py-2 text-sm bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none disabled:opacity-60"
                value=""
                disabled={selectedIds.size === 0 || bulkAssigning}
                onChange={e => { if (e.target.value === '__unassign__') handleBulkAssign(null); else if (e.target.value) handleBulkAssign(e.target.value); }}
              >
                <option value="">Biriktirish...</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                <option value="__unassign__">— Biriktirmaslik —</option>
              </select>
              <UserCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled pointer-events-none" />
            </div>
            <button
              onClick={openBulkArchiveModal}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors disabled:opacity-60"
            >
              <Archive className="w-4 h-4" /> Arxivlash
            </button>
            {canDelete && (
              bulkDeleteConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-ink">Rostdan o'chirilsinmi?</span>
                  <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}
                    className="px-2.5 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:bg-surface-50 transition-colors">
                    Yo'q
                  </button>
                  <button onClick={handleBulkDelete} disabled={bulkDeleting}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                    {bulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />} Ha, o'chirish
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" /> O'chirish
                </button>
              )
            )}
            <button onClick={exitSelectMode} className="p-2 rounded-lg text-ink-tertiary hover:bg-surface-100" title="Yopish">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Statistika yoki Kanban board */}
      {showStats ? (
        <IntakeStatsPanel funnelId={funnelId} />
      ) : funnel.stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-ink-tertiary text-sm flex-col gap-2">
          <p>Bu varonkada bosqichlar yo'q</p>
          <p className="text-xs">Sozlamalar → Varonkalar dan bosqich qo'shing</p>
        </div>
      ) : showClosed ? (
        <div ref={boardRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full px-6 py-5 items-stretch justify-center">
            <ClosedColumn label="G'olib" color="#10b981" icon={Trophy} deals={closedWonDeals} currency={currency}
              onOpen={(deal) => navigate(`/funnel/${funnelId}/deal/${deal._id}`)}
              onReactivate={openReactivateModal} canEdit={canEdit} />
            <ClosedColumn label="Yo'qotilgan" color="#ef4444" icon={XCircle} deals={closedLostDeals} currency={currency}
              onOpen={(deal) => navigate(`/funnel/${funnelId}/deal/${deal._id}`)}
              onReactivate={openReactivateModal} canEdit={canEdit} />
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div ref={boardRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className={`flex gap-4 h-full px-6 py-5 items-stretch ${boardFits ? 'justify-center' : ''}`}>
              {funnel.stages.map((stage, idx) => (
                <StageColumn
                  key={stage._id}
                  stage={stage}
                  deals={dealsByStage[stage._id] || []}
                  currency={currency}
                  isFirst={idx === 0}
                  onOpen={(dealId) => navigate(`/funnel/${funnelId}/deal/${dealId}`)}
                  onDelete={handleDeleteDeal}
                  onMove={openMoveModal}
                  onArchive={openSingleArchiveModal}
                  onClaim={handleClaimDeal}
                  onQuickAdd={setQuickStageId}
                  canCreate={canCreate} canEdit={canEdit} canDelete={canDelete}
                  selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} onSelectAllStage={toggleSelectStage}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeDeal && (
              <DealCard
                deal={activeDeal}
                isLead={funnel.stages[0] && String(activeDeal.stageId) === String(funnel.stages[0]._id)}
                currency={currency}
                onEdit={() => {}} onDelete={() => {}} onMove={() => {}} overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Excel import modal */}
      {showImport && (
        <ImportLeadsModal
          funnelId={funnelId}
          funnelName={funnel.name}
          onClose={() => setShowImport(false)}
          onDone={load}
        />
      )}

      {/* F-13: Quick-add deal modal */}
      {quickStageId && funnel && (
        <DealModal
          stageId={quickStageId}
          stages={funnel.stages}
          contacts={contacts}
          users={users}
          deal={null}
          isLead={funnel.stages[0] && String(quickStageId) === String(funnel.stages[0]._id)}
          currency={currency}
          onContactCreated={(c) => { setContacts(cur => cur.some(x => x._id === c._id) ? cur : [c, ...cur]); dispatch(invalidateContacts()); }}
          onSave={handleQuickCreate}
          onClose={() => setQuickStageId(null)}
        />
      )}

      {/* Value modal — shown when dragging lead → sdelka */}
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={cancelMove} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-ink mb-1">{t('funnel.moveTitle')}</h3>
            <p className="text-sm text-ink-tertiary mb-5">
              <span className="font-medium text-ink">{pendingMove.deal.title}</span>
            </p>
            <div className="relative mb-5">
              <input
                autoFocus
                type="number"
                min="0"
                className="input w-full pr-14 text-lg font-semibold"
                placeholder="0"
                value={moveValue}
                onChange={e => setMoveValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmMove(); if (e.key === 'Escape') cancelMove(); }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-tertiary font-medium pointer-events-none">
                {currency}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={cancelMove} className="btn-secondary btn-md flex-1">{t('funnel.moveCancel')}</button>
              <button onClick={confirmMove} className="btn-primary btn-md flex-1">{t('funnel.moveSave')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Boshqa varonkaga o'tkazish modal */}
      {moveDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="text-base font-semibold text-ink mb-1">{t('deals.moveToFunnel')}</p>
            <p className="text-sm text-ink-tertiary mb-4">
              <span className="font-medium text-ink">{moveDeal.title}</span>
            </p>

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
              <button onClick={() => setMoveDeal(null)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button
                onClick={handleMoveFunnel}
                disabled={!moveFunnelId || !moveStageId || movingFunnel}
                className="btn-md btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {movingFunnel && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('deals.moveSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yopilgan sdelkani qayta faollashtirish modal */}
      {reactivateDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="text-base font-semibold text-ink mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary-600" /> Qayta faollashtirish
            </p>
            <p className="text-sm text-ink-tertiary mb-4">
              <span className="font-medium text-ink">{reactivateDeal.title}</span>
            </p>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.moveFunnelLabel')}</label>
            <select
              className="input w-full mb-3"
              value={reactivateFunnelId}
              onChange={e => { setReactivateFunnelId(e.target.value); setReactivateStageId(''); }}
            >
              {allFunnelNames.map(f => <option key={f._id} value={f._id}>{f.name}{String(f._id) === String(funnelId) ? ` (${funnel.name})` : ''}</option>)}
            </select>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.stage')}</label>
            <select
              className="input w-full mb-5"
              value={reactivateStageId}
              onChange={e => setReactivateStageId(e.target.value)}
              disabled={!reactivateTargetFunnel}
            >
              <option value="">{t('deals.moveStagePlaceholder')}</option>
              {(reactivateTargetFunnel?.stages || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>

            <div className="flex gap-2">
              <button onClick={() => setReactivateDeal(null)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button
                onClick={handleReactivate}
                disabled={!reactivateFunnelId || !reactivateStageId || reactivating}
                className="btn-md btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {reactivating && <Loader2 className="w-4 h-4 animate-spin" />}
                Qaytarish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ommaviy: boshqa varonkaga o'tkazish modal */}
      {bulkMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="text-base font-semibold text-ink mb-1">Boshqa varonkaga o'tkazish</p>
            <p className="text-sm text-ink-tertiary mb-4">
              <span className="font-medium text-ink">{selectedIds.size} ta lid</span> tanlandi
            </p>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.moveFunnelLabel')}</label>
            <select
              className="input w-full mb-3"
              value={bulkMoveFunnelId}
              onChange={e => { setBulkMoveFunnelId(e.target.value); setBulkMoveStageId(''); }}
            >
              <option value="">{t('deals.moveFunnelPlaceholder')}</option>
              {moveTargetFunnels.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>

            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('deals.stage')}</label>
            <select
              className="input w-full mb-5"
              value={bulkMoveStageId}
              onChange={e => setBulkMoveStageId(e.target.value)}
              disabled={!bulkMoveTargetFunnel}
            >
              <option value="">{t('deals.moveStagePlaceholder')}</option>
              {(bulkMoveTargetFunnel?.stages || []).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>

            <div className="flex gap-2">
              <button onClick={() => setBulkMoveOpen(false)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button
                onClick={handleBulkMoveFunnel}
                disabled={!bulkMoveFunnelId || !bulkMoveStageId || bulkMovingFunnel}
                className="btn-md btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {bulkMovingFunnel && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('deals.moveSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arxivlash sababi modal — bitta yoki bir nechta lid */}
      {archiveTargetIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <p className="text-base font-semibold text-ink mb-1 flex items-center gap-2">
              <Archive className="w-4 h-4" /> Arxivlash
            </p>
            <p className="text-sm text-ink-tertiary mb-4">
              <span className="font-medium text-ink">{archiveTargetIds.length} ta lid</span> arxivlanadi
            </p>

            <label className="block text-xs font-medium text-ink-secondary mb-1">Sabab (izoh) *</label>
            <textarea
              autoFocus
              className="input w-full mb-5 resize-none"
              rows={3}
              value={bulkArchiveReason}
              onChange={e => setBulkArchiveReason(e.target.value)}
              placeholder="Nima uchun arxivlanyapti?"
            />

            <div className="flex gap-2">
              <button onClick={() => setArchiveTargetIds(null)} className="btn-md btn-secondary flex-1">{t('deals.cancel')}</button>
              <button
                onClick={handleBulkArchive}
                disabled={!bulkArchiveReason.trim() || bulkArchiving}
                className="btn-md btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {bulkArchiving && <Loader2 className="w-4 h-4 animate-spin" />}
                Arxivlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arxivlangan lidlar */}
      {showArchive && (
        <DealArchiveModal
          funnelId={funnelId}
          stages={funnel.stages}
          onClose={() => setShowArchive(false)}
          onRestored={load}
          canEdit={canEdit} canDelete={canDelete}
        />
      )}

    </div>
  );
}
