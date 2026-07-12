import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useT } from '../utils/translate';
import axios from 'axios';
import toast from 'react-hot-toast';
import { invalidateContacts } from '../store/contactsSlice';
import { getSocket } from '../utils/socket';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Loader2, Check, User, Phone, DollarSign, Pencil, Trash2, Search, Clock, Calendar, Download, Upload, Layers } from 'lucide-react';

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
function DealCard({ deal, isLead, onEdit, onDelete, onMove, currency, overlay = false }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const days = daysSince(deal.createdAt);

  const actions = (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); onEdit(deal); }}
        className="p-1 rounded hover:bg-surface-100 text-ink-tertiary hover:text-ink transition-colors">
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); onMove(deal); }}
        title={t('deals.moveToFunnel')}
        className="p-1 rounded hover:bg-primary-50 text-ink-tertiary hover:text-primary-600 transition-colors">
        <Layers className="w-3 h-3" />
      </button>
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); onDelete(deal._id); }}
        className="p-1 rounded hover:bg-red-50 text-ink-tertiary hover:text-red-500 transition-colors">
        <Trash2 className="w-3 h-3" />
      </button>
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
    <div ref={setNodeRef} style={style} className="touch-pan-y">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing"
        onClick={e => {
          // Only navigate if it wasn't a real drag (distance constraint handles this, but
          // we additionally skip if the user clicked on action buttons)
          if (!isDragging && !e.defaultPrevented) onEdit(deal);
        }}>
        {card}
      </div>
    </div>
  );
}

/* ── Stage column (droppable) ── */
function StageColumn({ stage, deals, onOpen, onDelete, onMove, onQuickAdd, currency, isFirst }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage._id });
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      {/* Header — centered */}
      <div className="text-center mb-3 px-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
          <span className="font-bold text-sm text-ink truncate">{stage.name}</span>
          <button
            onClick={() => onQuickAdd(stage._id)}
            className="p-0.5 rounded hover:bg-surface-200 text-ink-disabled hover:text-primary-500 transition-colors"
            title="Tez qo'shish"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
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
            <DealCard key={deal._id} deal={deal} isLead={isFirst} currency={currency} onEdit={() => onOpen(deal._id)} onDelete={onDelete} onMove={onMove} />
          ))}
        </SortableContext>
      </div>

    </div>
  );
}

/* ── Deal form modal ── */
function DealModal({ stageId, stages, contacts, users, deal, isLead, currency, onSave, onClose, onContactCreated }) {
  const t = useT();
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
      const res = await axios.post(`${API}/contacts`, newContact);
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
              <button type="button" onClick={() => setShowNewContact(true)}
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
  const [result,    setResult]    = useState(null);
  const fileRef = useRef(null);

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

export default function FunnelPage({ funnelId }) {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const t = useT();
  const currency  = useSelector(s => s.auth.user?.organization?.currency || 'UZS');
  const allFunnels = useSelector(s => s.funnels.list);
  const [funnel,      setFunnel]      = useState(null);
  const [deals,       setDeals]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeId,    setActiveId]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [pendingMove, setPendingMove] = useState(null);
  const [moveValue,   setMoveValue]   = useState('');

  // Boshqa varonkaga o'tkazish (kartochkadagi tugma)
  const [moveDeal,          setMoveDeal]          = useState(null); // qaysi deal o'tkazilyapti
  const [moveFunnelId,      setMoveFunnelId]      = useState('');
  const [moveStageId,       setMoveStageId]       = useState('');
  const [movingFunnel,      setMovingFunnel]      = useState(false);

  // F-13: quick-add modal
  const [contacts,      setContacts]      = useState([]);
  const [users,         setUsers]         = useState([]);
  const [quickStageId,  setQuickStageId]  = useState(null); // null = closed
  const [showImport,    setShowImport]    = useState(false);
  const [exporting,     setExporting]     = useState(false);

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
      const [fRes, cRes, uRes] = await Promise.all([
        axios.get(`${API}/funnels/${funnelId}/deals`),
        axios.get(`${API}/contacts?limit=200`),
        axios.get(`${API}/organization/users`),
      ]);
      setFunnel(fRes.data.funnel);
      setDeals(fRes.data.deals);
      setContacts(cRes.data.contacts || []);
      setUsers(uRes.data.users || []);
    } catch {
      toast.error(t('funnel.loadError'));
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  useEffect(() => { load(); }, [load]);

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

  /* Search filter */
  const q = search.trim().toLowerCase();
  const filteredDeals = q
    ? deals.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.contact?.name?.toLowerCase().includes(q) ||
        d.contact?.phone?.includes(q)
      )
    : deals;

  /* Group deals by stage */
  const dealsByStage = (funnel?.stages || []).reduce((acc, s) => {
    acc[s._id] = filteredDeals.filter(d => String(d.stageId) === String(s._id)).sort((a, b) => a.order - b.order);
    return acc;
  }, {});

  const activeDeal = activeId ? deals.find(d => d._id === activeId) : null;

  /* DnD handlers */
  const handleDragStart = ({ active }) => setActiveId(active.id);

  const applyMove = async (deal, targetStageId, value) => {
    setDeals(prev => prev.map(d => d._id === deal._id ? { ...d, stageId: targetStageId, value: value ?? d.value } : d));
    try {
      const body = { stageId: targetStageId };
      if (value !== undefined) body.value = value;
      await axios.put(`${API}/funnels/${funnelId}/deals/${deal._id}`, body);
    } catch {
      toast.error('Xato');
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
    } catch {
      toast.error('Xato');
      load();
    }
  };

  // Boshqa varonkaga o'tkazish
  const moveTargetFunnels = allFunnels.filter(f => String(f._id) !== String(funnelId));
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

  // F-13: quick create deal from column header
  const handleQuickCreate = async ({ title, stageId, value, notes, assignedTo, contact }) => {
    const res = await axios.post(`${API}/funnels/${funnelId}/deals`, {
      title, stageId, value: Number(value) || 0, notes,
      assignedTo: assignedTo || null, contact: contact || null,
    });
    setDeals(prev => [...prev, res.data.deal]);
    toast.success(t('funnel.deleted'));
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

  const sumOf = (arr) => arr.reduce((s, d) => s + (d.value || 0), 0);
  const firstStageId = funnel.stages[0]?._id;
  const lastStageId  = funnel.stages[funnel.stages.length - 1]?._id;
  const leadSum     = sumOf(dealsByStage[firstStageId] || []);
  const dealSum     = sumOf(dealsByStage[lastStageId] || []);
  const progressSum = funnel.stages.length > 2
    ? funnel.stages.slice(1, -1).reduce((s, st) => s + sumOf(dealsByStage[st._id] || []), 0)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-surface-100 bg-white shrink-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:min-h-[68px]">
        {/* Title + Action (mobile: same row; desktop: split via order) */}
        <div className="flex items-center justify-between gap-3 md:contents">
          <h1 className="text-lg font-bold text-ink shrink-0 md:order-1">{funnel.name}</h1>
          <div className="flex items-center gap-2 shrink-0 md:order-4">
            <button
              onClick={handleExport}
              disabled={exporting}
              title={t('funnel.export')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{t('funnel.export')}</span>
            </button>
            <button
              onClick={() => setShowImport(true)}
              title={t('funnel.import')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-200 text-ink-secondary hover:border-surface-300 hover:text-ink transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t('funnel.import')}</span>
            </button>
            {funnel.stages.length >= 1 && (
              <button
                onClick={() => navigate(`/funnel/${funnelId}/deal/new`)}
                className="btn-primary btn-md flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('funnel.newLead')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-0 md:order-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary pointer-events-none" />
          <input
            className="input pl-9 text-sm h-9 w-full"
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

        {/* Stats */}
        {(leadSum > 0 || progressSum > 0 || dealSum > 0) && (
          <div className="flex items-center gap-3 shrink-0 text-xs font-semibold overflow-x-auto no-scrollbar md:order-3">
            <span className="flex items-center gap-1.5 text-amber-600 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Zayavka: {fmt(leadSum)} {currency}
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              Jarayonda: {fmt(progressSum)} {currency}
            </span>
            <span className="flex items-center gap-1.5 text-green-600 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              Deal: {fmt(dealSum)} {currency}
            </span>
          </div>
        )}
      </div>

      {/* Kanban board */}
      {funnel.stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-ink-tertiary text-sm flex-col gap-2">
          <p>Bu varonkada bosqichlar yo'q</p>
          <p className="text-xs">Sozlamalar → Varonkalar dan bosqich qo'shing</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full px-6 py-5 items-stretch">
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
                  onQuickAdd={setQuickStageId}
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

    </div>
  );
}
