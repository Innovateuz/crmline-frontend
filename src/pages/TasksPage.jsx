import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import {
  Plus, X, Loader2, Check, ChevronDown,
  Calendar, CheckSquare2, Pencil, Trash2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const PRIORITY_MAP = {
  low:    { label: "Past",   color: '#94a3b8', bg: '#f1f5f9' },
  normal: { label: "O'rta", color: '#3b82f6', bg: '#eff6ff' },
  high:   { label: 'Yuqori', color: '#ef4444', bg: '#fef2f2' },
};

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name[0].toUpperCase();
}

/* ─── Draggable Task Card ─────────────────────────────────── */
function TaskCard({ task, onEdit, onDelete, overlay = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task._id });

  const card = (
    <div
      className={`bg-white border border-surface-200 rounded-xl p-3 shadow-sm select-none transition-all ${
        overlay ? 'rotate-1 shadow-lg cursor-grabbing' : 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-surface-300'
      } ${isDragging && !overlay ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink leading-snug flex-1">{task.title}</p>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onEdit(task); }}
            className="p-1 rounded-md hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete(task._id); }}
            className="p-1 rounded-md hover:bg-red-50 text-ink-disabled hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* Due date */}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-ink-tertiary">
            <Calendar className="w-3 h-3" />
            {fmtDate(task.dueDate)}
          </span>
        )}

        {/* Assignee */}
        {task.assignedTo && (
          <span
            className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[9px] font-bold shrink-0 ml-auto"
            title={task.assignedTo.name}
          >
            {initials(task.assignedTo.name)}
          </span>
        )}
      </div>
    </div>
  );

  if (overlay) return card;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {card}
    </div>
  );
}

/* ─── Droppable Column ────────────────────────────────────── */
function Column({ stage, tasks, onAdd, onEdit, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id: String(stage._id || stage.name) });

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stage.color }} />
        <span className="text-sm font-semibold text-ink">{stage.name}</span>
        <span className="text-xs text-ink-disabled bg-surface-100 rounded-full px-1.5 py-0.5">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 overflow-y-auto transition-colors ${
          isOver ? 'bg-primary-50 ring-2 ring-primary-300' : 'bg-surface-100'
        }`}
      >
        {tasks.map(task => (
          <TaskCard key={task._id} task={task} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

/* ─── Task Modal ──────────────────────────────────────────── */
function TaskModal({ initial, stages, users, onSave, onClose, saving }) {
  const [title,      setTitle]      = useState(initial?.title      || '');
  const [stageId,    setStageId]    = useState(initial?.stageId    ? String(initial.stageId) : (stages[0] ? String(stages[0]._id || stages[0].name) : ''));
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo?._id || initial?.assignedTo || '');
  const [dueDate,    setDueDate]    = useState(initial?.dueDate    ? initial.dueDate.slice(0, 10) : '');
  const [priority,   setPriority]   = useState(initial?.priority   || 'normal');

  const handleSave = () => {
    if (!title.trim()) { toast.error('Sarlavha kiritilishi shart'); return; }
    onSave({ title, stageId, assignedTo: assignedTo || null, dueDate: dueDate || null, priority });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h2 className="font-semibold text-ink">{initial?._id ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Sarlavha</label>
            <input
              className="input"
              placeholder="Nima qilish kerak..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Ma'sul</label>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
              >
                <option value="">Tanlanmagan</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-disabled pointer-events-none" />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1">Muddat</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100">
          <button onClick={onClose} className="btn-secondary btn-md">Bekor</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {initial?._id ? 'Saqlash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function TasksPage() {
  const meId = useSelector(s => s.auth.user?._id);

  const [stages,   setStages]   = useState([]);
  const [tasks,    setTasks]    = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [modal,    setModal]    = useState(null); // null | { task } for edit, { stageId } for create
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/organization/task-stages`),
        axios.get(`${API_URL}/tasks`),
        axios.get(`${API_URL}/organization/users`),
      ]);
      setStages(stagesRes.data.stages || []);
      setTasks(tasksRes.data.tasks   || []);
      setUsers(usersRes.data.users   || []);
    } catch {
      toast.error('Yuklanishda xato');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stageKey = (s) => String(s._id || s.name);

  const tasksForStage = (stage) =>
    tasks.filter(t => String(t.stageId) === stageKey(stage));

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetStageId = over.id;
    const task = tasks.find(t => t._id === active.id);
    if (!task || String(task.stageId) === String(targetStageId)) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t._id === active.id ? { ...t, stageId: targetStageId } : t));
    try {
      await axios.put(`${API_URL}/tasks/${active.id}`, { stageId: targetStageId });
    } catch {
      toast.error('Xato');
      load();
    }
  };

  const openCreate = (stage) => setModal({ stageId: stageKey(stage) });
  const openEdit   = (task)    => setModal({ task });
  const closeModal = ()        => setModal(null);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (modal?.task?._id) {
        const res = await axios.put(`${API_URL}/tasks/${modal.task._id}`, data);
        setTasks(prev => prev.map(t => t._id === modal.task._id ? res.data.task : t));
        toast.success('Saqlandi');
      } else {
        const res = await axios.post(`${API_URL}/tasks`, {
          ...data,
          stageId: modal?.stageId || (stages[0] ? stageKey(stages[0]) : ''),
          assignedTo: data.assignedTo || meId || null,
        });
        setTasks(prev => [...prev, res.data.task]);
        toast.success('Yaratildi');
      }
      closeModal();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    setTasks(prev => prev.filter(t => t._id !== id));
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      toast.success("O'chirildi");
    } catch {
      toast.error('Xato');
      load();
    }
  };

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
        <h2 className="text-lg font-semibold text-ink">Vazifalar bo'limi</h2>
        <p className="text-sm text-ink-tertiary mt-2 max-w-xs">
          Hali bosqichlar sozlanmagan. Sozlamalar → Vazifalar bo'limida bosqichlar qo'shing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-surface-200 bg-white flex items-center justify-center relative">
        <div className="flex items-center gap-2">
          <CheckSquare2 className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-bold text-ink">Vazifalar</h1>
          <span className="text-sm text-ink-disabled bg-surface-100 rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <button
          onClick={() => openCreate(stages[0])}
          className="btn-primary btn-md flex items-center gap-2 absolute right-6"
        >
          <Plus className="w-4 h-4" /> Yangi vazifa
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full px-6 py-5 items-stretch">
            {stages.map(stage => (
              <Column
                key={stageKey(stage)}
                stage={stage}
                tasks={tasksForStage(stage)}
                onAdd={openCreate}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} overlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal */}
      {modal && (
        <TaskModal
          initial={modal.task || { stageId: modal.stageId }}
          stages={stages}
          users={users}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  );
}
