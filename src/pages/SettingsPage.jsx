import React, { useState, useEffect, useRef } from 'react';
import { formatDateTime } from '../utils/date';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import TopBar from '../components/TopBar';
import Pagination from '../components/Pagination';
import { setOrganization } from '../store/authSlice';
import { useT } from '../utils/translate';
import Dropdown from '../components/Dropdown';
import { applyTheme } from '../utils/theme';
import { NAV_ITEMS } from '../components/Sidebar';
import { DATA_FLAGS, OWN_SCOPES } from '../utils/dataFlags';
import {
  ArrowLeft, Users, DollarSign, Ruler, Plus, X,
  Phone, Lock, ChevronDown, Loader2, Search,
  Pencil, Trash2, KeyRound, ShieldCheck, SlidersHorizontal, History,
  Palette, Upload, Check, Building2, Building, RotateCcw, AlertTriangle, Eye, EyeOff,
  GripVertical, Archive, Kanban, Layers, Target, ChevronUp, GripHorizontal, MessageSquare, Mail, Bell, BellOff,
} from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush } from '../utils/swRegister';
import { addFunnel, updateFunnel as updateFunnelStore, removeFunnel, fetchFunnels } from '../store/funnelSlice';
import DateTimePicker from '../components/DateTimePicker';
import { mediaUrl } from '../utils/media';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const TABS = [
  { key: 'branding',    icon: Palette,          label: 'Brending'         },
  { key: 'funnels',     icon: Kanban,           label: 'Varonkalar'       },
  { key: 'tasks',       icon: SlidersHorizontal,label: 'Vazifalar'        },
  { key: 'deal-sources',icon: Layers,           label: 'Souda manbalari' },
  { key: 'goals',       icon: Target,           label: 'Maqsadlar'       },
  { key: 'integrations',icon: Archive,          label: 'Integratsiyalar'  },
  { key: 'inbox',       icon: MessageSquare,    label: 'Inbox'            },
  { key: 'atc',         icon: Phone,            label: 'Telefoniya (ATC)' },
  { key: 'users',       icon: Users,            label: 'Foydalanuvchilar' },
  { key: 'roles',       icon: ShieldCheck,      label: 'Rollar'           },
  { key: 'audit',       icon: History,          label: 'Audit jurnali'    },
];

// Biznes egasiga ko'rinmasin — faqat URL orqali (?tab=general / ?tab=branding) ochiladi.
const HIDDEN_TAB_KEYS = [];

// Trashed-document kind → Uzbek label + accent color for the badge.
const TRASH_KIND = {
  purchaseOrder:   { label: 'Xarid buyurtmasi', color: '#0ea5e9' },
  purchaseReceipt: { label: 'Kirim',            color: '#22c55e' },
  purchaseReturn:  { label: 'Xarid qaytarish',  color: '#f59e0b' },
  salesOrder:      { label: 'Sotuv buyurtmasi', color: '#6366f1' },
  salesInvoice:    { label: 'Sotuv fakturasi',  color: '#8b5cf6' },
  salesReturn:     { label: 'Sotuv qaytarish',  color: '#f43f5e' },
  payment:         { label: "To'lov",           color: '#14b8a6' },
  conversion:      { label: 'Konvertatsiya',    color: '#0891b2' },
  transfer:        { label: "Ombor ko'chirish", color: '#a855f7' },
  productionOrder: { label: 'Ishlab chiqarish', color: '#16a34a' },
  packagingOrder:  { label: 'Upakovka',         color: '#0d9488' },
  jobOrder:        { label: 'Zakaz',             color: '#9333ea' },
  procurementRequest: { label: 'Snabjeniya soʻrovi', color: '#65a30d' },
};

const BRAND_PRESETS = ['#059669', '#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#0891b2', '#0d9488', '#475569'];

const CURRENCIES = [
  { code: 'UZS', symbol: "so'm", label: "O'zbek so'mi" },
  { code: 'USD', symbol: '$',    label: 'AQSh dollari'  },
  { code: 'EUR', symbol: '€',    label: 'Yevropa yevro' },
  { code: 'RUB', symbol: '₽',    label: 'Rossiya rubli' },
  { code: 'KZT', symbol: '₸',    label: 'Qozog\'iston tengesi' },
  { code: 'GBP', symbol: '£',    label: 'Britaniya funt sterlingi' },
  { code: 'CNY', symbol: '¥',    label: 'Xitoy yuani' },
  { code: 'AED', symbol: 'AED',  label: 'BAA dirhami' },
  { code: 'TRY', symbol: '₺',    label: 'Turk lirasi' },
];

/* ─── Branding tab ───────────────────────────────────────── */
function BrandingTab() {
  const t = useT();
  const dispatch = useDispatch();
  const savedColor = useSelector((s) => s.auth.user?.organization?.brandColor) || null;
  const savedSolid = useSelector((s) => s.auth.user?.organization?.brandSolid) || false;
  const savedRef = useRef(savedColor);
  const savedSolidRef = useRef(savedSolid);
  useEffect(() => { savedRef.current = savedColor; }, [savedColor]);
  useEffect(() => { savedSolidRef.current = savedSolid; }, [savedSolid]);

  const [name,         setName]         = useState('');
  const [address,      setAddress]      = useState('');
  const [directorName, setDirectorName] = useState('');
  const [officePhone,  setOfficePhone]  = useState('');
  const [website,      setWebsite]      = useState('');
  const [instagram,    setInstagram]    = useState('');
  const [telegram,     setTelegram]     = useState('');
  const [currency, setCurrency] = useState('UZS');
  const [color, setColor] = useState('');   // '' = default green
  const [solid, setSolid] = useState(false); // sidebar/topbar asl rangda
  const [logo, setLogo]   = useState('');
  const [loaded, setLoaded]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragLogo, setDragLogo] = useState(false);
  const fileRef = useRef(null);
  const uploadLogoRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/organization`)
      .then(r => { const o = r.data.organization || {}; setName(o.name || ''); setAddress(o.address || ''); setDirectorName(o.directorName || ''); setOfficePhone(o.officePhone || ''); setWebsite(o.website || ''); setInstagram(o.instagram || ''); setTelegram(o.telegram || ''); setCurrency(o.currency || 'UZS'); setColor(o.brandColor || ''); setSolid(!!o.brandSolid); setLogo(o.logo || ''); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Live preview while editing; restore the saved color on unmount (if not saved).
  useEffect(() => { if (loaded) applyTheme(color || null, solid); }, [color, solid, loaded]);
  useEffect(() => () => { applyTheme(savedRef.current, savedSolidRef.current); }, []);

  const uploadLogo = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast.error(t('settings.branding.imageOnly'));
    const fd = new FormData(); fd.append('image', file);
    setUploading(true);
    try { const r = await axios.post(`${API_URL}/upload`, fd); setLogo(r.data.url); }
    catch (e) { toast.error(e.response?.data?.message || t('settings.branding.uploadError')); }
    finally { setUploading(false); }
  };
  uploadLogoRef.current = uploadLogo;

  // Clipboard paste (Ctrl+V) logo uchun
  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
      const items = Array.from(e.clipboardData?.items || []);
      const img = items.find(i => i.kind === 'file' && i.type.startsWith('image/'));
      if (!img) return;
      e.preventDefault();
      uploadLogoRef.current(img.getAsFile());
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const save = async () => {
    if (!name.trim()) return toast.error(t('settings.branding.nameRequired'));
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization`, {
        name: name.trim(),
        address: address.trim(),
        directorName: directorName.trim(),
        officePhone: officePhone.trim(),
        website: website.trim(),
        instagram: instagram.trim(),
        telegram: telegram.trim(),
        currency,
        brandColor: color || null,
        brandSolid: solid,
        logo: logo || null,
      });
      const o = res.data.organization || {};
      dispatch(setOrganization({ name: o.name, brandColor: o.brandColor, brandSolid: o.brandSolid, logo: o.logo }));
      savedRef.current = o.brandColor || null;
      savedSolidRef.current = !!o.brandSolid;
      applyTheme(o.brandColor || null, o.brandSolid);
      toast.success(t('settings.branding.saved'));
    } catch (e) { toast.error(e.response?.data?.message || t('settings.branding.error')); }
    finally { setSaving(false); }
  };

  if (!loaded) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-ink">{t('settings.branding.title')}</h3>
        <p className="text-ink-tertiary text-sm mt-0.5">{t('settings.branding.subtitle')}</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.branding.orgName')}</label>
        <input className="input max-w-sm" value={name} onChange={e => setName(e.target.value)} placeholder={t('settings.branding.orgNamePlaceholder')} />
      </div>

      {/* Contact info */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">Tashkilot ma'lumotlari</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Direktor ism familiyasi</label>
            <input className="input" value={directorName} onChange={e => setDirectorName(e.target.value)} placeholder="Masalan: Aliyev Jasur Ahmadovich" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Office raqami</label>
            <input className="input" value={officePhone} onChange={e => setOfficePhone(e.target.value)} placeholder="+998 71 200 00 00" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1">Manzil</label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Masalan: Toshkent sh., Chilonzor t., 12-uy" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Web sayt</label>
            <input className="input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Instagram</label>
            <input className="input" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username yoki to'liq link" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Telegram</label>
            <input className="input" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username yoki +998..." />
          </div>
        </div>
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Asosiy valyuta</label>
        <p className="text-xs text-ink-tertiary mb-3">Barcha sdelka va lidlar shu valyutada ko'rsatiladi.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-colors ${
                currency === c.code
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-surface-200 hover:border-surface-300 bg-white'
              }`}
            >
              <span className={`text-base font-bold w-8 shrink-0 text-center ${currency === c.code ? 'text-primary-600' : 'text-ink-tertiary'}`}>
                {c.symbol}
              </span>
              <div className="min-w-0">
                <div className={`text-xs font-semibold leading-none ${currency === c.code ? 'text-primary-700' : 'text-ink'}`}>{c.code}</div>
                <div className="text-xs text-ink-tertiary mt-0.5 truncate">{c.label}</div>
              </div>
              {currency === c.code && <Check className="w-3.5 h-3.5 text-primary-600 ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.branding.logo')}</label>
        <div className="flex items-center gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragLogo(true); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragLogo(true); }}
            onDragLeave={(e) => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setDragLogo(false); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragLogo(false); const f = e.dataTransfer.files?.[0]; if (f) uploadLogo(f); }}
            onClick={() => fileRef.current?.click()}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-all ${
              dragLogo ? 'ring-2 ring-primary-400 ring-offset-2 bg-primary-50' : 'bg-surface-100'
            }`}
          >
            {logo ? <img src={mediaUrl(logo)} alt="logo" className="w-full h-full object-cover" /> : <Building2 className={`w-7 h-7 ${dragLogo ? 'text-primary-500' : 'text-ink-disabled'}`} />}
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => uploadLogo(e.target.files?.[0])} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary btn-md flex items-center gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('settings.branding.upload')}
            </button>
            {logo && <button type="button" onClick={() => setLogo('')} className="btn-secondary btn-md text-red-600">{t('settings.branding.removeLogo')}</button>}
          </div>
        </div>
      </div>

      {/* Brand color */}
      <div>
        <label className="block text-sm font-medium text-ink mb-2">{t('settings.branding.brandColor')}</label>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button type="button" onClick={() => setColor('')} title={t('settings.branding.defaultGreen')}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${!color ? 'border-ink' : 'border-transparent'}`}
            style={{ backgroundColor: '#059669' }}>
            {!color && <Check className="w-4 h-4 text-white" />}
          </button>
          <div className="w-px h-6 bg-surface-200 mx-1" />
          {BRAND_PRESETS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${color.toLowerCase() === c ? 'border-ink' : 'border-transparent'}`}
              style={{ backgroundColor: c }}>
              {color.toLowerCase() === c && <Check className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={color || '#059669'} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer bg-white p-0.5" />
          <input className="input font-mono w-32" value={color} onChange={e => setColor(e.target.value)} placeholder="#059669" maxLength={7} />
          <span className="text-xs text-ink-tertiary">{color ? t('settings.branding.customColor') : t('settings.branding.defaultGreen')}</span>
        </div>
      </div>

      {/* Sidebar/topbar asl rang opsiyasi */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink text-sm">{t('settings.branding.solidTitle')}</p>
          <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{t('settings.branding.solidHint')}</p>
        </div>
        <button type="button" onClick={() => setSolid(s => !s)} disabled={saving}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${solid ? 'bg-primary-600' : 'bg-surface-200'} disabled:opacity-60`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${solid ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Preview */}
      <div className="card card-body">
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">{t('settings.branding.preview')}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-primary btn-md">{t('settings.branding.primaryBtn')}</button>
          <span className="badge" style={{ backgroundColor: 'rgb(var(--p-50))', color: 'rgb(var(--p-700))' }}>{t('settings.branding.badge')}</span>
          <span className="text-primary-600 font-semibold">{t('settings.branding.linkText')}</span>
          <div className="w-8 h-8 rounded-lg bg-primary-600" />
          <div className="w-8 h-8 rounded-lg bg-primary-800" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('settings.branding.save')}
        </button>
      </div>
    </div>
  );
}

/* ─── Funnels tab ───────────────────────────────────────────── */
const STAGE_COLORS = ['#94a3b8','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#0891b2','#f97316'];

function FunnelsTab() {
  const dispatch = useDispatch();
  const funnels  = useSelector(s => s.funnels.list);
  const [showCreate, setShowCreate] = useState(false);
  const [editId,     setEditId]     = useState(null);
  // form state
  const [fname,   setFname]   = useState('');
  const [stages,  setStages]  = useState([{ name: '', color: '#94a3b8' }]);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(null);

  const openCreate = () => {
    setEditId(null); setFname(''); setStages([{ name: '', color: '#94a3b8' }]); setShowCreate(true);
  };

  const openEdit = (f) => {
    setEditId(f._id);
    setFname(f.name);
    setStages(f.stages.length ? f.stages.map(s => ({ _id: s._id, name: s.name, color: s.color })) : [{ name: '', color: '#94a3b8' }]);
    setShowCreate(true);
  };

  const closeForm = () => { setShowCreate(false); setEditId(null); };

  const addStage = () => setStages(prev => [...prev, { name: '', color: STAGE_COLORS[prev.length % STAGE_COLORS.length] }]);
  const removeStage = (i) => setStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i, field, val) => setStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const moveStage = (i, dir) => {
    const next = [...stages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setStages(next);
  };

  const save = async () => {
    if (!fname.trim()) { toast.error('Varonka nomi kiritilishi shart'); return; }
    const validStages = stages.filter(s => s.name.trim());
    setSaving(true);
    try {
      if (editId) {
        const res = await axios.put(`${API_URL}/funnels/${editId}`, { name: fname.trim(), stages: validStages });
        dispatch(updateFunnelStore(res.data.funnel));
        toast.success('Saqlandi');
      } else {
        const res = await axios.post(`${API_URL}/funnels`, { name: fname.trim(), stages: validStages });
        dispatch(addFunnel(res.data.funnel));
        toast.success('Varonka yaratildi');
      }
      closeForm();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  const deleteFunnelFn = async (id) => {
    setDeleting(id);
    try {
      await axios.delete(`${API_URL}/funnels/${id}`);
      dispatch(removeFunnel(id));
      toast.success("O'chirildi");
    } catch {
      toast.error('Xato');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">Varonkalar</h3>
          <p className="text-sm text-ink-tertiary mt-0.5">Sdelka va lid bosqichlarini sozlang</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangi varonka
        </button>
      </div>

      {/* Funnel list */}
      {funnels.length === 0 ? (
        <div className="text-center py-14 text-ink-tertiary">
          <Kanban className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Hali varonka yo'q</p>
          <p className="text-xs mt-1">Yangi varonka yarating va ichiga bosqichlar qo'shing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {funnels.map(f => (
            <div key={f._id} className="bg-white border border-surface-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100">
                <Kanban className="w-4 h-4 text-ink-tertiary shrink-0" />
                <span className="font-semibold text-ink flex-1">{f.name}</span>
                <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary hover:text-ink transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteFunnelFn(f._id)} disabled={deleting === f._id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-ink-tertiary hover:text-red-600 transition-colors">
                  {deleting === f._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
                {f.stages.length === 0 ? (
                  <span className="text-xs text-ink-tertiary italic">Bosqichlar yo'q</span>
                ) : f.stages.map((s, i) => (
                  <div key={s._id || i} className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-ink-secondary whitespace-nowrap">{s.name}</span>
                    {i < f.stages.length - 1 && <span className="text-ink-disabled ml-1">›</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
              <h2 className="font-semibold text-ink">{editId ? 'Varonkani tahrirlash' : 'Yangi varonka'}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Varonka nomi</label>
                <input
                  className="input"
                  placeholder="Masalan: Asosiy savdo, B2B, Premium..."
                  value={fname}
                  onChange={e => setFname(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Stages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink">Bosqichlar (etaplar)</label>
                  <button type="button" onClick={addStage} className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700">
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                  </button>
                </div>
                <div className="space-y-2">
                  {stages.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {/* Color picker */}
                      <div className="relative shrink-0">
                        <input
                          type="color"
                          value={s.color}
                          onChange={e => updateStage(i, 'color', e.target.value)}
                          className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer bg-white p-0.5"
                          title="Rang"
                        />
                      </div>
                      <input
                        className="input flex-1 text-sm"
                        placeholder={`Bosqich ${i + 1}`}
                        value={s.name}
                        onChange={e => updateStage(i, 'name', e.target.value)}
                      />
                      <button type="button" onClick={() => moveStage(i, -1)} disabled={i === 0}
                        className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary disabled:opacity-30 transition-colors">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1}
                        className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary disabled:opacity-30 transition-colors">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => removeStage(i)} disabled={stages.length === 1}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-ink-disabled hover:text-red-500 disabled:opacity-30 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-100 shrink-0">
              <button onClick={closeForm} className="btn-secondary btn-md">Bekor</button>
              <button onClick={save} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editId ? 'Saqlash' : 'Yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TasksTab ───────────────────────────────────────────── */
function TasksTab() {
  const [stages,  setStages]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/organization/task-stages`)
      .then(r => setStages(r.data.stages || []))
      .catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, []);

  const genId = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

  const addStage    = () => setStages(prev => [...prev, { _id: genId(), name: '', color: STAGE_COLORS[prev.length % STAGE_COLORS.length] }]);
  const removeStage = (i) => setStages(prev => prev.filter((_, idx) => idx !== i));
  const updateStage = (i, field, val) => setStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const moveStage   = (i, dir) => {
    const next = [...stages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setStages(next);
  };

  const save = async () => {
    const valid = stages
      .filter(s => s.name.trim())
      .map(s => ({ ...s, _id: s._id || genId() }));
    setSaving(true);
    try {
      await axios.put(`${API_URL}/organization/task-stages`, { stages: valid });
      setStages(valid);
      toast.success('Saqlandi');
    } catch {
      toast.error('Xato');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" /></div>;

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">Vazifalar bosqichlari</h3>
          <p className="text-sm text-ink-tertiary mt-0.5">Kanban ustunlarini sozlang</p>
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={s.color}
              onChange={e => updateStage(i, 'color', e.target.value)}
              className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer bg-white p-0.5 shrink-0"
            />
            <input
              className="input flex-1 text-sm"
              placeholder={`Bosqich ${i + 1}`}
              value={s.name}
              onChange={e => updateStage(i, 'name', e.target.value)}
            />
            <button onClick={() => moveStage(i, -1)} disabled={i === 0}
              className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary disabled:opacity-30 transition-colors">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1}
              className="p-1.5 rounded-lg hover:bg-surface-100 text-ink-disabled hover:text-ink-tertiary disabled:opacity-30 transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => removeStage(i)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-ink-disabled hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <button onClick={addStage}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-surface-200 rounded-xl text-sm text-ink-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors">
          <Plus className="w-4 h-4" /> Bosqich qo'shish
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

/* ─── DealSourcesTab ─────────────────────────────────────── */
function DealSourcesTab() {
  const [sources,  setSources]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/organization/deal-sources`)
      .then(r => setSources(r.data.sources || []))
      .catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, []);

  const genId   = () => Math.random().toString(36).slice(2, 10);
  const addSrc  = () => setSources(prev => [...prev, { _id: genId(), name: '', color: STAGE_COLORS[prev.length % STAGE_COLORS.length] }]);
  const removeSrc = (i) => setSources(prev => prev.filter((_, idx) => idx !== i));
  const updateSrc = (i, field, val) => setSources(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const save = async () => {
    const valid = sources.filter(s => s.name.trim()).map(s => ({ ...s, _id: s._id || genId() }));
    setSaving(true);
    try {
      await axios.put(`${API_URL}/organization/deal-sources`, { sources: valid });
      setSources(valid);
      toast.success('Saqlandi');
    } catch {
      toast.error('Xato');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" /></div>;

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h3 className="font-semibold text-ink">Soudalar manbalari</h3>
        <p className="text-sm text-ink-tertiary mt-0.5">Souda qo'shishda tanlash mumkin bo'lgan manbalar</p>
      </div>

      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={s.color || '#94a3b8'}
              onChange={e => updateSrc(i, 'color', e.target.value)}
              className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer bg-white p-0.5 shrink-0"
            />
            <input
              className="input flex-1 text-sm"
              placeholder={`Manba ${i + 1}`}
              value={s.name}
              onChange={e => updateSrc(i, 'name', e.target.value)}
            />
            <button onClick={() => removeSrc(i)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-ink-disabled hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <button onClick={addSrc}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-surface-200 rounded-xl text-sm text-ink-tertiary hover:border-primary-300 hover:text-primary-600 transition-colors">
          <Plus className="w-4 h-4" /> Manba qo'shish
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

/* ─── GoalsTab ───────────────────────────────────────────── */
function GoalsTab() {
  const [totalSum,   setTotalSum]   = useState('');
  const [totalCount, setTotalCount] = useState('');
  const [users,      setUsers]      = useState([]);
  const [byUser,     setByUser]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/organization/goals`),
      axios.get(`${API_URL}/organization/users`),
    ]).then(([goalsRes, usersRes]) => {
      const g = goalsRes.data.goals || {};
      setTotalSum(g.totalSum   ? String(g.totalSum)   : '');
      setTotalCount(g.totalCount ? String(g.totalCount) : '');
      const allUsers = usersRes.data.users || [];
      setUsers(allUsers);
      const savedByUser = g.byUser || [];
      const savedMap = Object.fromEntries(savedByUser.map(u => [String(u.userId), u]));
      setByUser(allUsers.map(u => ({
        userId:      u._id,
        name:        u.name,
        targetSum:   savedMap[String(u._id)]?.targetSum   ? String(savedMap[String(u._id)].targetSum)   : '',
        targetCount: savedMap[String(u._id)]?.targetCount ? String(savedMap[String(u._id)].targetCount) : '',
      })));
    }).catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, []);

  const updateUser = (i, field, val) =>
    setByUser(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/organization/goals`, {
        totalSum:   Number(totalSum)   || 0,
        totalCount: Number(totalCount) || 0,
        byUser: byUser
          .filter(u => u.targetSum || u.targetCount)
          .map(u => ({
            userId:      u.userId,
            targetSum:   Number(u.targetSum)   || 0,
            targetCount: Number(u.targetCount) || 0,
          })),
      });
      toast.success('Saqlandi');
    } catch {
      toast.error('Xato');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="font-semibold text-ink">Maqsadlar (Цели)</h3>
        <p className="text-sm text-ink-tertiary mt-0.5">Jami va xodimlar bo'yicha souda maqsadlarini belgilang</p>
      </div>

      {/* Jami maqsad */}
      <div className="card card-body space-y-3">
        <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Jami maqsad</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Summa (UZS)</label>
            <input className="input" type="number" min="0" placeholder="0"
              value={totalSum} onChange={e => setTotalSum(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Soudalar soni</label>
            <input className="input" type="number" min="0" placeholder="0"
              value={totalCount} onChange={e => setTotalCount(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Xodimlar bo'yicha */}
      {byUser.length > 0 && (
        <div className="card card-body space-y-3">
          <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Xodimlar bo'yicha</p>
          <div className="space-y-3">
            {byUser.map((u, i) => (
              <div key={u.userId} className="space-y-1.5">
                <p className="text-sm font-medium text-ink">{u.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input text-sm" type="number" min="0" placeholder="Summa maqsadi"
                    value={u.targetSum} onChange={e => updateUser(i, 'targetSum', e.target.value)} />
                  <input className="input text-sm" type="number" min="0" placeholder="Soni maqsadi"
                    value={u.targetCount} onChange={e => updateUser(i, 'targetCount', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary btn-md flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Saqlash
        </button>
      </div>
    </div>
  );
}

/* ─── IntegrationsTab ─────────────────────────────────────── */
function IntegrationsTab() {
  const location = useLocation();
  const navigate = useNavigate();

  const [token,        setToken]        = useState('');
  const [botInfo,      setBotInfo]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [showToken,    setShowToken]    = useState(false);
  const [packInput,    setPackInput]    = useState('');
  const [packs,        setPacks]        = useState([]);
  const [savingPacks,  setSavingPacks]  = useState(false);
  const [igInfo,       setIgInfo]       = useState(null);
  const [igConnecting, setIgConnecting] = useState(false);
  const [igDisconnecting, setIgDisconnecting] = useState(false);
  const [fbInfo,       setFbInfo]       = useState(null);
  const [fbConnecting, setFbConnecting] = useState(false);
  const [fbDisconnecting, setFbDisconnecting] = useState(false);
  const [waInfo,       setWaInfo]       = useState(null);
  const [waForm,       setWaForm]       = useState({ phoneNumberId: '', wabaId: '', accessToken: '', displayPhoneNumber: '' });
  const [waSaving,     setWaSaving]     = useState(false);

  // Push notifications state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushStatus,    setPushStatus]    = useState('unknown'); // 'unknown' | 'subscribed' | 'denied' | 'default'
  const [pushBusy,      setPushBusy]      = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushStatus(Notification.permission === 'denied' ? 'denied' : Notification.permission === 'granted' ? 'subscribed' : 'default');
    }
  }, []);

  const handlePushSubscribe = async () => {
    setPushBusy(true);
    try {
      const token = localStorage.getItem('token');
      const ok = await subscribeToPush(token);
      if (ok) { setPushStatus('subscribed'); toast.success('Push bildirishnomalar yoqildi!'); }
      else { toast.error("Ruxsat berilmadi yoki brauzer qo'llab-quvvatlamaydi"); }
    } catch { toast.error('Xatolik yuz berdi'); }
    finally { setPushBusy(false); }
  };

  const handlePushUnsubscribe = async () => {
    setPushBusy(true);
    try {
      const token = localStorage.getItem('token');
      await unsubscribeFromPush(token);
      setPushStatus('default');
      toast.success("Push bildirishnomalar o'chirildi");
    } catch { toast.error('Xatolik yuz berdi'); }
    finally { setPushBusy(false); }
  };

  // Email integration state
  const [emailCfg,      setEmailCfg]      = useState({ enabled: false, imap: { host: '', port: 993, user: '', pass: '', tls: true }, smtp: { host: '', port: 587, user: '', pass: '', secure: false, from: '' } });
  const [emailSaving,   setEmailSaving]   = useState(false);
  const [emailTesting,  setEmailTesting]  = useState(false);
  const [emailTestRes,  setEmailTestRes]  = useState(null);
  const [showImapPass,  setShowImapPass]  = useState(false);
  const [showSmtpPass,  setShowSmtpPass]  = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/organization/telegram-bot`),
      axios.get(`${API_URL}/organization/sticker-packs`),
      axios.get(`${API_URL}/instagram/status`),
      axios.get(`${API_URL}/email/config`),
      axios.get(`${API_URL}/facebook/status`),
      axios.get(`${API_URL}/whatsapp/status`),
    ]).then(([tgRes, spRes, igRes, emailRes, fbRes, waRes]) => {
      setBotInfo(tgRes.data);
      setPacks(spRes.data.stickerPacks || []);
      setIgInfo(igRes.data);
      if (emailRes.data?.config) {
        const c = emailRes.data.config;
        setEmailCfg({
          enabled: c.enabled || false,
          imap: { host: c.imap?.host || '', port: c.imap?.port || 993, user: c.imap?.user || '', pass: '', tls: c.imap?.tls !== false },
          smtp: { host: c.smtp?.host || '', port: c.smtp?.port || 587, user: c.smtp?.user || '', pass: '', secure: c.smtp?.secure || false, from: c.smtp?.from || '' },
        });
      }
      setFbInfo(fbRes.data);
      setWaInfo(waRes.data);
    }).catch(() => toast.error('Yuklanishda xato'))
      .finally(() => setLoading(false));
  }, []);

  // Handle OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ig = params.get('ig');
    const fb = params.get('fb');
    if (!ig && !fb) return;
    if (ig === 'success') {
      toast.success('Instagram muvaffaqiyatli ulandi!');
      axios.get(`${API_URL}/instagram/status`).then(r => setIgInfo(r.data)).catch(() => {});
    } else if (ig === 'error') {
      toast.error(params.get('msg') || 'Ulanishda xato yuz berdi');
    } else if (fb === 'success') {
      toast.success('Facebook muvaffaqiyatli ulandi!');
      axios.get(`${API_URL}/facebook/status`).then(r => setFbInfo(r.data)).catch(() => {});
    } else if (fb === 'error') {
      toast.error(params.get('msg') || 'Facebook ulanishda xato');
    } else return;
    // Clean up URL params
    navigate('/settings?tab=integrations', { replace: true });
  }, [location.search, navigate]);

  const igConnect = async () => {
    setIgConnecting(true);
    try {
      const res = await axios.get(`${API_URL}/instagram/auth`);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.message || 'OAuth boshlanishda xato');
      setIgConnecting(false);
    }
  };

  const igDisconnect = async () => {
    if (!window.confirm("Instagram'ni uzib qo'yishni tasdiqlaysizmi?")) return;
    setIgDisconnecting(true);
    try {
      await axios.delete(`${API_URL}/instagram/disconnect`);
      setIgInfo({ connected: false, username: '', igUserId: '', pageId: '' });
      toast.success("Instagram uzildi");
    } catch {
      toast.error('Xato');
    } finally {
      setIgDisconnecting(false);
    }
  };

  // ── Facebook Messenger ──
  const fbConnect = async () => {
    setFbConnecting(true);
    try {
      const res = await axios.get(`${API_URL}/facebook/auth`);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.message || 'OAuth boshlanishda xato');
      setFbConnecting(false);
    }
  };

  const fbDisconnect = async () => {
    if (!window.confirm("Facebook'ni uzib qo'yishni tasdiqlaysizmi?")) return;
    setFbDisconnecting(true);
    try {
      await axios.delete(`${API_URL}/facebook/disconnect`);
      setFbInfo({ connected: false, pageName: '', pageId: '' });
      toast.success("Facebook uzildi");
    } catch {
      toast.error('Xato');
    } finally {
      setFbDisconnecting(false);
    }
  };

  // ── WhatsApp (Cloud API — qo'lda ulash) ──
  const waConnect = async () => {
    if (!waForm.phoneNumberId.trim() || !waForm.accessToken.trim()) {
      toast.error('Phone Number ID va Access Token kiriting');
      return;
    }
    setWaSaving(true);
    try {
      await axios.post(`${API_URL}/whatsapp/connect`, waForm);
      const r = await axios.get(`${API_URL}/whatsapp/status`);
      setWaInfo(r.data);
      toast.success('WhatsApp ulandi!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ulanishda xato');
    } finally {
      setWaSaving(false);
    }
  };

  const waDisconnect = async () => {
    if (!window.confirm("WhatsApp'ni uzib qo'yishni tasdiqlaysizmi?")) return;
    try {
      await axios.delete(`${API_URL}/whatsapp/disconnect`);
      setWaInfo({ connected: false, displayPhoneNumber: '', phoneNumberId: '' });
      setWaForm({ phoneNumberId: '', wabaId: '', accessToken: '', displayPhoneNumber: '' });
      toast.success("WhatsApp uzildi");
    } catch {
      toast.error('Xato');
    }
  };

  const addPack = () => {
    const raw = packInput.trim();
    if (!raw) return;
    // Extract pack name from link or plain name
    const match = raw.match(/addstickers\/([A-Za-z0-9_]+)/);
    const name = match ? match[1] : raw;
    if (packs.includes(name)) { toast.error('Bu pack allaqachon qo\'shilgan'); return; }
    setPacks(prev => [...prev, name]);
    setPackInput('');
  };

  const removePack = (name) => setPacks(prev => prev.filter(p => p !== name));

  const savePacks = async () => {
    setSavingPacks(true);
    try {
      await axios.put(`${API_URL}/organization/sticker-packs`, { stickerPacks: packs });
      toast.success('Sticker packlar saqlandi');
    } catch { toast.error('Xato'); }
    finally { setSavingPacks(false); }
  };

  const connect = async () => {
    if (!token.trim()) { toast.error('Bot token kiritilishi shart'); return; }
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/telegram-bot`, { botToken: token.trim() });
      setBotInfo(res.data);
      setToken('');
      toast.success(res.data.connected ? `@${res.data.botUsername} ulandi` : 'Ulanish bekor qilindi');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Botni uzib qo'yishni tasdiqlaysizmi?")) return;
    setSaving(true);
    try {
      await axios.delete(`${API_URL}/organization/telegram-bot`);
      setBotInfo({ connected: false });
      toast.success("Bot uzildi");
    } catch {
      toast.error('Xato');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailConfig = async () => {
    setEmailSaving(true);
    try {
      await axios.put(`${API_URL}/email/config`, emailCfg);
      toast.success('Email sozlamalari saqlandi');
      setEmailTestRes(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setEmailSaving(false);
    }
  };

  const testEmailConnection = async () => {
    setEmailTesting(true);
    setEmailTestRes(null);
    try {
      const res = await axios.post(`${API_URL}/email/test`, emailCfg);
      setEmailTestRes(res.data.results || {});
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test muvaffaqiyatsiz');
    } finally {
      setEmailTesting(false);
    }
  };

  const setImap = (field, val) => setEmailCfg(p => ({ ...p, imap: { ...p.imap, [field]: val } }));
  const setSmtp = (field, val) => setEmailCfg(p => ({ ...p, smtp: { ...p.smtp, [field]: val } }));

  if (loading) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="font-semibold text-ink">Integratsiyalar</h3>
        <p className="text-sm text-ink-tertiary mt-0.5">Tashqi kanallarni CRM ga ulang</p>
      </div>

      {/* Telegram */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl bg-[#e8f4fb] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#229ED9]">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.593l-2.969-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.897.966z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Telegram Bot</p>
            <p className="text-xs text-ink-tertiary">Superchat — barcha xabarlar Inbox'ga keladi</p>
          </div>
          {botInfo?.connected && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ulangan</span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {botInfo?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink">@{botInfo.botUsername}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">Webhook {botInfo.webhookSet ? 'faol' : 'sozlanmagan'}</p>
                </div>
              </div>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Bot webhook orqali ishlayapti. Foydalanuvchilar botga yozsa, xabarlar Inbox sahifasiga keladi.
              </p>
              <button onClick={disconnect} disabled={saving}
                className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Uzib qo'yish
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-tertiary mb-1.5">Bot Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connect()}
                  />
                  <button type="button" onClick={() => setShowToken(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink-tertiary">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-ink-tertiary mt-1.5">
                  <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">@BotFather</a> dan yangi bot yaratib, tokenini kiriting
                </p>
              </div>
              <button onClick={connect} disabled={saving || !token.trim()}
                className="btn-primary btn-md w-full flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Ulash
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sticker Packs */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center text-xl shrink-0">🎭</div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Sticker Packlar</p>
            <p className="text-xs text-ink-tertiary">Inbox chat uchun sticker to'plamlari</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="https://t.me/addstickers/PackName yoki PackName"
              value={packInput}
              onChange={e => setPackInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPack()}
            />
            <button onClick={addPack} className="btn-primary btn-md px-4 shrink-0">Qo'sh</button>
          </div>
          {packs.length > 0 && (
            <div className="space-y-1.5">
              {packs.map(p => (
                <div key={p} className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded-xl">
                  <span className="text-base">🎭</span>
                  <span className="flex-1 text-sm font-medium text-ink font-mono">{p}</span>
                  <a href={`https://t.me/addstickers/${p}`} target="_blank" rel="noreferrer"
                    className="text-xs text-primary-500 hover:underline shrink-0">ko'rish</a>
                  <button onClick={() => removePack(p)} className="text-ink-disabled hover:text-red-500 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {packs.length === 0 && (
            <p className="text-xs text-ink-tertiary">Hali sticker pack qo'shilmagan</p>
          )}
          <button onClick={savePacks} disabled={savingPacks}
            className="btn-primary btn-md w-full flex items-center justify-center gap-2">
            {savingPacks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Saqlash
          </button>
        </div>
      </div>

      {/* Instagram DM */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl bg-[#fce8ef] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="25%" stopColor="#e6683c"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="75%" stopColor="#cc2366"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
              <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Instagram DM</p>
            <p className="text-xs text-ink-tertiary">Direct xabarlarni Inbox'ga ulang</p>
          </div>
          {igInfo?.connected && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ulangan</span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {igInfo?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink">@{igInfo.username || igInfo.igUserId}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">Instagram Business akkaunt ulangan</p>
                </div>
              </div>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Instagram DM xabarlari avtomatik ravishda Inbox sahifasiga kelib tushadi.
              </p>
              <button onClick={igDisconnect} disabled={igDisconnecting}
                className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                {igDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Uzib qo'yish
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Instagram Business yoki Creator akkauntingizni ulang. Facebook sahifangiz orqali OAuth orqali avtorizatsiya qilinadi.
              </p>
              <button onClick={igConnect} disabled={igConnecting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
                {igConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Facebook orqali ulash
              </button>
              <p className="text-xs text-ink-disabled text-center">
                Meta Developer App ID va Secret .env da sozlangan bo'lishi kerak
              </p>
            </>
          )}
        </div>
      </div>

      {/* Email / IMAP+SMTP */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl bg-[#eef2ff] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-[#6366F1]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Email (IMAP/SMTP)</p>
            <p className="text-xs text-ink-tertiary">Inbox'ga email xabarlarini qabul qiling va javob bering</p>
          </div>
          <button
            onClick={() => setEmailCfg(p => ({ ...p, enabled: !p.enabled }))}
            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${emailCfg.enabled ? 'bg-primary-600' : 'bg-surface-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${emailCfg.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* IMAP */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">IMAP — kiruvchi xabarlar</p>
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-ink-tertiary mb-1">Host</label>
                  <input className="input text-sm" placeholder="imap.gmail.com" value={emailCfg.imap.host} onChange={e => setImap('host', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-ink-tertiary mb-1">Port</label>
                  <input className="input text-sm" type="number" placeholder="993" value={emailCfg.imap.port} onChange={e => setImap('port', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-tertiary mb-1">Email</label>
                <input className="input text-sm" type="email" placeholder="you@example.com" value={emailCfg.imap.user} onChange={e => setImap('user', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-ink-tertiary mb-1">Parol / App password</label>
                <div className="relative">
                  <input className="input text-sm pr-10" type={showImapPass ? 'text' : 'password'} placeholder="••••••••" value={emailCfg.imap.pass} onChange={e => setImap('pass', e.target.value)} />
                  <button type="button" onClick={() => setShowImapPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
                    {showImapPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={emailCfg.imap.tls} onChange={e => setImap('tls', e.target.checked)} />
                <span className="text-xs text-ink-tertiary">TLS/SSL ishlatish (port 993)</span>
              </label>
            </div>
          </div>

          {/* SMTP */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">SMTP — chiquvchi xabarlar</p>
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-ink-tertiary mb-1">Host</label>
                  <input className="input text-sm" placeholder="smtp.gmail.com" value={emailCfg.smtp.host} onChange={e => setSmtp('host', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-ink-tertiary mb-1">Port</label>
                  <input className="input text-sm" type="number" placeholder="587" value={emailCfg.smtp.port} onChange={e => setSmtp('port', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-tertiary mb-1">Email</label>
                <input className="input text-sm" type="email" placeholder="you@example.com" value={emailCfg.smtp.user} onChange={e => setSmtp('user', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-ink-tertiary mb-1">Parol / App password</label>
                <div className="relative">
                  <input className="input text-sm pr-10" type={showSmtpPass ? 'text' : 'password'} placeholder="••••••••" value={emailCfg.smtp.pass} onChange={e => setSmtp('pass', e.target.value)} />
                  <button type="button" onClick={() => setShowSmtpPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-tertiary mb-1">Jo'natuvchi ismi/email (From)</label>
                <input className="input text-sm" placeholder="Support <support@company.com>" value={emailCfg.smtp.from} onChange={e => setSmtp('from', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={emailCfg.smtp.secure} onChange={e => setSmtp('secure', e.target.checked)} />
                <span className="text-xs text-ink-tertiary">SSL ishlatish (port 465)</span>
              </label>
            </div>
          </div>

          {/* Test results */}
          {emailTestRes && (
            <div className="space-y-2">
              {emailTestRes.imap !== undefined && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${emailTestRes.imap.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {emailTestRes.imap.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  IMAP: {emailTestRes.imap.ok ? 'Muvaffaqiyatli' : emailTestRes.imap.error}
                </div>
              )}
              {emailTestRes.smtp !== undefined && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${emailTestRes.smtp.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {emailTestRes.smtp.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  SMTP: {emailTestRes.smtp.ok ? 'Muvaffaqiyatli' : emailTestRes.smtp.error}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={testEmailConnection} disabled={emailTesting}
              className="flex-1 py-2 rounded-lg border border-surface-300 text-sm font-medium text-ink-secondary hover:bg-surface-50 transition-colors flex items-center justify-center gap-2">
              {emailTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Test
            </button>
            <button onClick={saveEmailConfig} disabled={emailSaving}
              className="flex-1 btn-primary btn-md flex items-center justify-center gap-2">
              {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Saqlash
            </button>
          </div>
          <p className="text-xs text-ink-disabled leading-relaxed">
            Gmail uchun "App passwords" yoqing. IMAP ilovasi yangi xabarlarni avtomatik oladi va Inbox'ga qo'shadi.
          </p>
        </div>
      </div>

      {/* Push Notifications card */}
      <div className="bg-white border border-surface-200 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-50">
            <Bell className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm">Push Bildirishnomalar</p>
            <p className="text-xs text-ink-tertiary">Yangi xabar kelganda qurilmangizga bildirishnoma yuboriladi</p>
          </div>
        </div>
        {!pushSupported ? (
          <p className="text-xs text-ink-disabled bg-surface-50 rounded-lg px-3 py-2">Brauzeringiz push bildirishnomalarni qo'llab-quvvatlamaydi</p>
        ) : pushStatus === 'denied' ? (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            Brauzer ruxsati rad etilgan. Brauzer sozlamalaridan bildirishnomaga ruxsat bering.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className={`flex-1 text-xs rounded-lg px-3 py-2 ${pushStatus === 'subscribed' ? 'bg-green-50 text-green-700' : 'bg-surface-50 text-ink-tertiary'}`}>
              {pushStatus === 'subscribed' ? '✓ Bildirishnomalar yoqilgan' : 'Bildirishnomalar o\'chirilgan'}
            </div>
            {pushStatus === 'subscribed' ? (
              <button
                onClick={handlePushUnsubscribe}
                disabled={pushBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <BellOff className="w-3.5 h-3.5" />
                O'chirish
              </button>
            ) : (
              <button
                onClick={handlePushSubscribe}
                disabled={pushBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                Yoqish
              </button>
            )}
          </div>
        )}
      </div>

      {/* Facebook Messenger */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e7f0fd' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: '#1877F2' }}>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">Facebook Messenger</p>
            <p className="text-xs text-ink-tertiary">Page xabarlarni Inbox'ga ulang</p>
          </div>
          {fbInfo?.connected && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ulangan</span>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          {fbInfo?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink">{fbInfo.pageName || fbInfo.pageId}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">Facebook Page ulangan</p>
                </div>
              </div>
              <button onClick={fbDisconnect} disabled={fbDisconnecting}
                className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                {fbDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Uzib qo'yish
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Facebook biznes sahifangizni ulang. Sahifaga kelgan Messenger xabarlari Inbox'ga tushadi.
              </p>
              <button onClick={fbConnect} disabled={fbConnecting}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: '#1877F2' }}>
                {fbConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Facebook orqali ulash
              </button>
            </>
          )}
        </div>
      </div>

      {/* WhatsApp Business */}
      <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3 border-b border-surface-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8faf0' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" style={{ color: '#25D366' }}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.133 1.535 5.866L.057 23.857l6.156-1.617A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 01-5.031-1.386l-.36-.214-3.733.98.999-3.645-.235-.374A9.809 9.809 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-ink text-sm">WhatsApp Business</p>
            <p className="text-xs text-ink-tertiary">Cloud API orqali ulang</p>
          </div>
          {waInfo?.connected && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ulangan</span>
          )}
        </div>
        <div className="px-5 py-4 space-y-3">
          {waInfo?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-ink">{waInfo.displayPhoneNumber || waInfo.phoneNumberId}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">WhatsApp Cloud API ulangan</p>
                </div>
              </div>
              <button onClick={waDisconnect}
                className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Uzib qo'yish
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Meta Cloud API ma'lumotlarini kiriting (Meta dashboard → WhatsApp → API Setup).
              </p>
              <input value={waForm.phoneNumberId} onChange={e => setWaForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                placeholder="Phone Number ID" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
              <input value={waForm.wabaId} onChange={e => setWaForm(f => ({ ...f, wabaId: e.target.value }))}
                placeholder="WhatsApp Business Account ID (ixtiyoriy)" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
              <input value={waForm.displayPhoneNumber} onChange={e => setWaForm(f => ({ ...f, displayPhoneNumber: e.target.value }))}
                placeholder="Telefon raqami (mas. +998...)" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
              <input value={waForm.accessToken} onChange={e => setWaForm(f => ({ ...f, accessToken: e.target.value }))}
                placeholder="Access Token (permanent)" type="password" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
              <button onClick={waConnect} disabled={waSaving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}>
                {waSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Ulash
              </button>
              <p className="text-xs text-ink-disabled text-center">
                Webhook URL: {`{domen}`}/api/whatsapp/webhook · Verify token: crm-line-verify-2024
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const AUDIT_ACTION = {
  create:          { label: 'Yaratdi',          color: '#22c55e' },
  update:          { label: "O'zgartirdi",      color: '#0ea5e9' },
  delete:          { label: "O'chirdi",         color: '#ef4444' },
  login:           { label: 'Kirdi',            color: '#6366f1' },
  logout:          { label: 'Chiqdi',           color: '#94a3b8' },
  register:        { label: "Ro'yxatdan o'tdi", color: '#8b5cf6' },
  password_change: { label: "Parol o'zgartirdi", color: '#f59e0b' },
  profile_update:  { label: 'Profil yangiladi', color: '#0ea5e9' },
};

// Eski yozuvlardagi backend `entity` yorlig'i → modul kaliti (path yo'q bo'lsa)
const ENTITY_TO_BASE = {
  'Xarid': 'purchases', 'Sotuv': 'sales', "To'lov": 'payments', 'Konvertatsiya': 'conversions',
  "Ko'chirish": 'transfers', 'Kontragent': 'counterparty', 'Katalog': 'inventory', 'Ombor': 'warehouse',
  'Kassa': 'cashbox', "O'lchov birligi": 'uom', 'Tashkilot': 'organization', 'Fayl': 'upload',
};

/* ─── Audit log tab ──────────────────────────────────────── */
function AuditTab() {
  const t = useT();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [meta, setMeta]       = useState({ pages: 1, total: 0, limit: 30 });
  const [users, setUsers]     = useState([]);   // filtr dropdowni uchun
  const [user, setUser]       = useState('');   // tanlangan foydalanuvchi (id)
  const [from, setFrom]       = useState('');   // DD/MM/YYYY
  const [to, setTo]           = useState('');   // DD/MM/YYYY
  const [detail, setDetail]   = useState(null); // ko'rilayotgan yozuv

  // DD/MM/YYYY mask → YYYY-MM-DD (backend new Date() uchun)
  const maskToISO = (m) => { const x = (m || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return x ? `${x[3]}-${x[2]}-${x[1]}` : ''; };

  useEffect(() => {
    setLoading(true);
    const params = { page };
    if (user) params.user = user;
    const f = maskToISO(from); if (f) params.from = f;
    const tt = maskToISO(to);  if (tt) params.to = tt;
    axios.get(`${API_URL}/audit`, { params })
      .then(r => { setLogs(r.data.logs || []); setUsers(r.data.users || []); setMeta({ pages: r.data.pages || 1, total: r.data.total || 0, limit: r.data.limit || 30 }); })
      .catch(() => toast.error(t('settingsExtra.audit.loadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [page, user, from, to]);

  const fmtTime = formatDateTime;
  const actionLabel = (act) => AUDIT_ACTION[act] ? t('settingsExtra.audit.actions.' + act) : (act || '—');

  // Qaysi modulda o'zgarish bo'lganini path'dan aniqlash (eski yozuvlar uchun ham ishonchli)
  const baseOf = (p) => { const seg = (p || '').split('/').filter(Boolean); return seg[0] === 'api' ? seg[1] : seg[0]; };
  const moduleLabel = (log) => {
    let base = baseOf(log.path);
    if (!base || base === 'undefined') {
      // path yo'q (eski yozuv) — entity yorlig'ini modul kalitiga aylantiramiz
      const ent = (log.entity || '').split('/')[0];
      base = ENTITY_TO_BASE[ent] || ent;
    }
    if (!base || base === 'undefined') return '—';
    const key = 'settingsExtra.audit.modules.' + base;
    const tr = t(key);
    return tr !== key ? tr : '—';   // faqat tarjima qilinganini ko'rsatamiz, aks holda —
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-ink">{t('settingsExtra.audit.title')}</h3>
          <p className="text-ink-tertiary text-sm mt-0.5">{t('settingsExtra.audit.subtitle')} ({meta.total})</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dropdown value={user} placeholder={t('settingsExtra.audit.allUsers')} searchable className="w-48"
            options={[{ value: '', label: t('settingsExtra.audit.allUsers') }, ...users.map(u => ({ value: u.id, label: u.name }))]}
            onChange={(v) => { setUser(v); setPage(1); }} />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-tertiary">{t('settingsExtra.audit.dateFrom')}</span>
            <DateTimePicker dateOnly value={from} className="w-32" onChange={(v) => { setFrom(v); setPage(1); }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-tertiary">{t('settingsExtra.audit.dateTo')}</span>
            <DateTimePicker dateOnly value={to} className="w-32" onChange={(v) => { setTo(v); setPage(1); }} />
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-ink-tertiary text-sm">{t('settingsExtra.audit.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thTime')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thUser')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thAction')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thModule')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thObject')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.audit.thIp')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {logs.map(l => {
                  const a = AUDIT_ACTION[l.action] || { color: '#94a3b8' };
                  return (
                    <tr key={l._id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-ink-secondary whitespace-nowrap font-mono">{fmtTime(l.createdAt)}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-ink">{l.userName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: a.color + '20', color: a.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.color }} />{actionLabel(l.action)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-ink-secondary">{moduleLabel(l)}</td>
                      <td className="px-4 py-2.5 text-sm text-ink-secondary font-mono">{l.label ? `№${l.label}` : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-tertiary font-mono">{l.ip || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <button onClick={() => setDetail(l)} title={t('settingsExtra.audit.view')}
                            className="p-1.5 text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={meta.pages} total={meta.total} limit={meta.limit} onPage={setPage} />
      </div>

      {detail && (
        <Modal title={t('settingsExtra.audit.detailTitle')} onClose={() => setDetail(null)} wide>
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: (AUDIT_ACTION[detail.action]?.color || '#94a3b8') + '20', color: AUDIT_ACTION[detail.action]?.color || '#94a3b8' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: AUDIT_ACTION[detail.action]?.color || '#94a3b8' }} />
              {actionLabel(detail.action)}
            </span>
          </div>
          <dl className="divide-y divide-surface-100 text-sm">
            {[
              [t('settingsExtra.audit.thTime'),  fmtTime(detail.createdAt)],
              [t('settingsExtra.audit.thUser'),  detail.userName || '—'],
              [t('settingsExtra.audit.thModule'), moduleLabel(detail)],
              [t('settingsExtra.audit.thObject'), detail.label ? `№${detail.label}` : '—'],
              [t('settingsExtra.audit.fId'),     detail.entityId || '—'],
              [t('settingsExtra.audit.fMethod'), detail.method || '—'],
              [t('settingsExtra.audit.fPath'),   detail.path || '—'],
              [t('settingsExtra.audit.fStatus'), detail.status != null ? detail.status : '—'],
              [t('settingsExtra.audit.thIp'),    detail.ip || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2">
                <dt className="w-40 shrink-0 text-ink-tertiary">{k}</dt>
                <dd className="text-ink break-all font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}

/* ─── General settings tab ───────────────────────────────── */
const COSTING_OPTIONS = [
  { value: 'average', label: "O'rtacha-vaznli (AVCO)", hint: 'Kirimlardan o\'rtacha tannarx avtomatik hisoblanadi', soon: false },
  { value: 'manual',  label: 'Qo\'lda (mahsulot tannarxi)', hint: 'Mahsulotga qo\'lda kiritilgan tannarx ishlatiladi', soon: false },
  { value: 'fifo',    label: 'FIFO (birinchi kirgan — birinchi chiqadi)', hint: 'Qatlamli tannarx: eng eski partiya birinchi sotiladi', soon: false },
  { value: 'batch',   label: 'Partiya (lot) bo\'yicha', hint: 'Sotuvda partiya tanlanadi, muddat bilan', soon: false },
];


const PROCUREMENT_MODE_OPTIONS = [
  { value: 'orders',      label: 'Zayavkalar',  hint: "Ta'minotchiga to'g'ridan-to'g'ri buyurtma (PO) — sodda ishlash modeli." },
  { value: 'procurement', label: 'Snabjeniya',  hint: "Ichki ta'minot jarayoni: snabjenist so'rovi → ombor kirimi. Kompaniya kattaroq jamoa uchun." },
  { value: 'both',        label: 'Ikkalasi',     hint: 'Zayavkalar va Snabjeniya — ikkala pastki menyu ham ko\'rinadi.' },
  { value: 'none',        label: 'Faqat Kirimlar', hint: 'Zayavkalar ham, Snabjeniya ham yashiriladi — faqat Kirimlar (va Qaytarishlar).' },
];

function NavOrderSection({ navOrder, setNavOrder, saving, setSaving, syncSettings, t }) {
  const dragIdx = React.useRef(null);
  const [overIdx, setOverIdx] = React.useState(null);

  const saveOrder = async (next) => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { navOrder: next });
      syncSettings(res.data.organization);
    } catch { setNavOrder(navOrder); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    const def = NAV_ITEMS.map(i => i.key);
    setNavOrder(def);
    await saveOrder(def);
  };

  const onDragStart = (e, idx) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const onDrop = (e, idx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) { setOverIdx(null); return; }
    const next = [...navOrder];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = null;
    setOverIdx(null);
    setNavOrder(next);
    saveOrder(next);
  };

  const onDragEnd = () => { dragIdx.current = null; setOverIdx(null); };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.navOrderTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.navOrderSubtitle')}</p>
        </div>
        <button type="button" onClick={reset} disabled={saving}
          className="btn-ghost btn-sm flex items-center gap-1 text-ink-tertiary text-xs">
          <RotateCcw className="w-3 h-3" /> {t('settings.general.navOrderReset')}
        </button>
      </div>
      <div className="card divide-y divide-surface-100">
        {navOrder.map((key, idx) => {
          const item = NAV_ITEMS.find(i => i.key === key);
          if (!item) return null;
          const Icon = item.icon;
          const isOver = overIdx === idx && dragIdx.current !== null && dragIdx.current !== idx;
          return (
            <div
              key={key}
              draggable
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDrop={e => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors
                ${isOver ? 'bg-primary-50 border-l-2 border-primary-400' : 'hover:bg-surface-50'}`}
            >
              <GripVertical className="w-4 h-4 text-ink-disabled shrink-0" />
              <Icon className="w-4 h-4 text-ink-tertiary shrink-0" />
              <span className="flex-1 text-sm text-ink">{t('nav.' + key)}</span>
              <span className="text-[11px] font-mono text-ink-disabled tabular-nums">{idx + 1}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function GeneralTab() {
  const dispatch = useDispatch();
  const t = useT();
  const [allowNeg, setAllowNeg] = useState(false);
  const [servSell, setServSell] = useState(false);
  const [costing,  setCosting]  = useState('average');
  const [procMode, setProcMode] = useState('orders');
  const [jobFolders, setJobFolders] = useState(false);
  const [paymentStatuses, setPaymentStatuses] = useState(false);  // to'lovlarda holat maydoni
  const [purchaseReturns, setPurchaseReturns] = useState(true);   // xarid qaytarish moduli
  const [discountField,   setDiscountField]   = useState(false);  // chegirma ustuni (kirim + sotuv)
  const [purchaseDefaultWarehouse, setPurchaseDefaultWarehouse] = useState('');     // kirim standart ombor
  const [productionDefaultRawWh,      setProductionDefaultRawWh]      = useState(''); // ishlab chiqarish xomashyo ombori
  const [productionDefaultFinishedWh, setProductionDefaultFinishedWh] = useState(''); // ishlab chiqarish tayyor mahsulot ombori
  const [productionHideWarehouse,     setProductionHideWarehouse]     = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [salesOrders, setSalesOrders]     = useState(true);       // Buyurtmalar
  const [salesInvoices, setSalesInvoices] = useState(true);       // Sotuvlar (faktura)
  const [salesReturns, setSalesReturns]   = useState(true);       // Sotuv qaytarishlar
  const [jobProcLabor, setJobProcLabor] = useState(true);         // jarayon ish haqi maydoni
  const [jobProcAllocated, setJobProcAllocated] = useState(true); // jarayon ajratilgan summa maydoni
  const [sketchRequired, setSketchRequired] = useState(false);    // zakazda eskiz majburiymi
  const [sketchInList, setSketchInList] = useState(false);        // zakazlar ro'yxatida eskiz ustuni
  const [processWorkerReports, setProcessWorkerReports] = useState(false);
  const [processWorkerProcurement, setProcessWorkerProcurement] = useState(false);
  const [jobOrderStartDate, setJobOrderStartDate] = useState(false);
  const [jobOrderSmeta, setJobOrderSmeta] = useState(false);
  const [jobOrderTvMode,      setJobOrderTvMode]      = useState(false);
  const [jobOrderFreezeStatus, setJobOrderFreezeStatus] = useState(false);
  const [smetaVisibleToWorkers, setSmetaVisibleToWorkers] = useState(false);
  const [smetaWorkerShowPrices, setSmetaWorkerShowPrices] = useState(false);
  const [jobOrderDeadlineWarning, setJobOrderDeadlineWarning] = useState(false);
  const [deadlineColors, setDeadlineColors] = useState([]); // [{daysLeft,bgColor,textColor}]
  const [costWarnPct, setCostWarnPct] = useState(50);             // tannarx ogohlantirish foizi
  const [cpStatus, setCpStatus] = useState(true);                 // kontragent status maydoni
  const [allowNegCashbox, setAllowNegCashbox] = useState(false);  // kassa minusga ketishi
  const [cashboxList, setCashboxList] = useState([]);            // barcha kassalar
  const [cashierCashboxes, setCashierCashboxes] = useState([]);  // kassirga ko'rinadigan kassalar (id[])
  const [cashierCpFolders, setCashierCpFolders]       = useState([]);  // kassirga ko'rinadigan kontragent papkalari (id[])
  const [snabjenistCpFolders, setSnabjenistCpFolders] = useState([]);  // snabjenistga ko'rinadigan ta'minotchi papkalari (id[])
  const [payCategories, setPayCategories] = useState([]);        // to'lov kategoriyalari (kontragent papkasini biriktirish uchun)
  const [cpFolders, setCpFolders] = useState([]);          // kontragent papkalari
  const [supplierFolderIds, setSupplierFolderIds] = useState([]);           // xarid/snab filtri (ko'p papka)
  const [customerFolderIds, setCustomerFolderIds] = useState([]);           // sotuv/zakaz filtri (ko'p papka)
  const [jobOrderNewCustFolderIds, setJobOrderNewCustFolderIds] = useState([]); // yangi mijoz papkasi (ko'p)
  const [productCats, setProductCats] = useState([]);            // mahsulot kategoriyalari (ishlab chiqarish papka filtri)
  const [productionRawFolder, setProductionRawFolder] = useState('');       // xomashyo papkasi
  const [productionFinishedFolder, setProductionFinishedFolder] = useState(''); // tayyor mahsulot papkasi
  const [productionOutputBatch, setProductionOutputBatch] = useState(false); // tayyor mahsulot partiya/muddat
  const [salesProductFolder, setSalesProductFolder] = useState('');          // sotuv mahsulot papkasi
  const [hasNds,   setHasNds]   = useState(false);                           // QQS to'lovchi tashkilot
  const [salesInvoiceStatuses, setSalesInvoiceStatuses] = useState([]);       // sotuv fakturasi statuslari
  const [salesStockStatusId, setSalesStockStatusId] = useState('');           // qoldiq trigger status ID
  const [salesDebtStatusId,  setSalesDebtStatusId]  = useState('');           // qarz trigger status ID
  const [loaded,   setLoaded]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [navOrder, setNavOrder] = useState([]);
  const [section,   setSection]  = useState('asosiy');
  const [navHidden, setNavHidden] = useState([]);
  const [navHiddenSaved, setNavHiddenSaved] = useState([]); // server bilan sinxron holat

  useEffect(() => {
    axios.get(`${API_URL}/organization`).then(res => {
      const s = res.data.organization?.settings || {};
      setAllowNeg(!!s.allowNegativeStock);
      setServSell(!!s.allowServiceSelling);
      setCosting(s.costingMethod || 'average');
      setProcMode(s.procurementMode || 'orders');
      setJobFolders(!!s.jobOrderFolders);
      setPaymentStatuses(!!s.paymentStatuses);
      setPurchaseReturns(s.purchaseReturns !== false);
      setDiscountField(!!s.discountField);
      setPurchaseDefaultWarehouse(s.purchaseDefaultWarehouse?._id || s.purchaseDefaultWarehouse || '');
      setProductionDefaultRawWh(s.productionDefaultRawWarehouse?._id || s.productionDefaultRawWarehouse || '');
      setProductionDefaultFinishedWh(s.productionDefaultFinishedWarehouse?._id || s.productionDefaultFinishedWarehouse || '');
      setProductionHideWarehouse(!!s.productionHideWarehouse);
      setSalesOrders(s.salesOrders !== false);
      setSalesInvoices(s.salesInvoices !== false);
      setSalesReturns(s.salesReturns !== false);
      setJobProcLabor(s.jobProcessLabor !== false);
      setJobProcAllocated(s.jobProcessAllocated !== false);
      setSketchRequired(!!s.jobOrderSketchRequired);
      setSketchInList(!!s.jobOrderSketchInList);
      setProcessWorkerReports(!!s.processWorkerReports);
      setProcessWorkerProcurement(!!s.processWorkerProcurement);
      setJobOrderStartDate(!!s.jobOrderStartDate);
      setJobOrderSmeta(!!s.jobOrderSmeta);
      setSmetaVisibleToWorkers(!!s.smetaVisibleToWorkers);
      setSmetaWorkerShowPrices(!!s.smetaWorkerShowPrices);
      setJobOrderDeadlineWarning(!!s.jobOrderDeadlineWarning);
      setJobOrderTvMode(!!s.jobOrderTvMode);
      setJobOrderFreezeStatus(!!s.jobOrderFreezeStatus);
      setDeadlineColors((s.jobOrderDeadlineColors || []).map(r => ({ daysLeft: r.daysLeft, bgColor: r.bgColor || '#fef9c3', textColor: r.textColor || '#854d0e' })));
      setCostWarnPct(s.jobOrderCostWarnPercent != null ? s.jobOrderCostWarnPercent : 50);
      setCpStatus(s.counterpartyStatus !== false);
      setAllowNegCashbox(!!s.allowNegativeCashbox);
      setCashierCashboxes((s.cashierCashboxes || []).map(c => c?._id || c));
      setCashierCpFolders((s.cashierCpFolders || []).map(c => c?._id || c));
      setSnabjenistCpFolders((s.snabjenistCpFolders || []).map(c => c?._id || c));
      // Ko'p papka: yangi arrays → eski single ni migration qilib to'ldirish
      const toIds = (arr, single) => {
        if (arr && arr.length) return arr.map(f => (f && f._id) || f).filter(Boolean);
        const sv = (single && single._id) || single;
        return sv ? [sv] : [];
      };
      setSupplierFolderIds(toIds(s.supplierFolders, s.supplierFolder));
      setCustomerFolderIds(toIds(s.customerFolders, s.customerFolder));
      setJobOrderNewCustFolderIds(toIds(s.jobOrderNewCustomerFolders, s.jobOrderNewCustomerFolder));
      setProductionRawFolder(s.productionRawFolder?._id || s.productionRawFolder || '');
      setProductionFinishedFolder(s.productionFinishedFolder?._id || s.productionFinishedFolder || '');
      setSalesProductFolder(s.salesProductFolder?._id || s.salesProductFolder || '');
      setProductionOutputBatch(!!s.productionOutputBatch);
      setHasNds(!!s.hasNds);
      setSalesStockStatusId(s.salesStockStatus?._id || s.salesStockStatus || '');
      setSalesDebtStatusId(s.salesDebtStatus?._id   || s.salesDebtStatus  || '');
      setNavOrder(s.navOrder?.length ? s.navOrder : NAV_ITEMS.map(i => i.key));
      const hm = Array.isArray(s.hiddenModules) ? s.hiddenModules : [];
      setNavHidden(hm);
      setNavHiddenSaved(hm);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    axios.get(`${API_URL}/counterparty/folders`).then(res => setCpFolders(res.data.folders || [])).catch(() => {});
    axios.get(`${API_URL}/inventory/categories`).then(res => setProductCats(res.data.categories || [])).catch(() => {});
    axios.get(`${API_URL}/cashbox`).then(res => setCashboxList(res.data.cashboxes || [])).catch(() => {});
    axios.get(`${API_URL}/warehouse`).then(res => setWarehouses(res.data.warehouses || [])).catch(() => {});
    axios.get(`${API_URL}/payments/categories`).then(res => setPayCategories(res.data.categories || [])).catch(() => {});
    axios.get(`${API_URL}/sales/statuses?docType=sales-invoices`).then(res => setSalesInvoiceStatuses(res.data.statuses || [])).catch(() => {});
  }, []);

  // Kategoriyaga kontragent papkasini biriktirish: '' = barcha, 'none' = kontragentsiz, '<id>' = papka.
  const setCategoryCp = async (cat, value) => {
    const patch = value === 'none'
      ? { cpFolder: null, noCounterparty: true }
      : { cpFolder: value || null, noCounterparty: false };
    const prev = payCategories;
    setPayCategories(list => list.map(c => c._id === cat._id ? { ...c, ...patch } : c));
    setSaving(true);
    try {
      await axios.put(`${API_URL}/payments/categories/${cat._id}`, patch);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setPayCategories(prev);
    } finally { setSaving(false); }
  };

  const toggleCashierCashbox = async (cbId) => {
    const next = cashierCashboxes.includes(cbId)
      ? cashierCashboxes.filter(x => x !== cbId)
      : [...cashierCashboxes, cbId];
    const prev = cashierCashboxes;
    setCashierCashboxes(next);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { cashierCashboxes: next });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setCashierCashboxes(prev);
    } finally { setSaving(false); }
  };

  const toggleCashierCpFolder = async (fid) => {
    const next = cashierCpFolders.includes(fid)
      ? cashierCpFolders.filter(x => x !== fid)
      : [...cashierCpFolders, fid];
    const prev = cashierCpFolders;
    setCashierCpFolders(next);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { cashierCpFolders: next });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setCashierCpFolders(prev);
    } finally { setSaving(false); }
  };

  const toggleSnabjenistCpFolder = async (fid) => {
    const next = snabjenistCpFolders.includes(fid)
      ? snabjenistCpFolders.filter(x => x !== fid)
      : [...snabjenistCpFolders, fid];
    const prev = snabjenistCpFolders;
    setSnabjenistCpFolders(next);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { snabjenistCpFolders: next });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setSnabjenistCpFolders(prev);
    } finally { setSaving(false); }
  };

  // Ko'p papkali toggle: bir bosilganda qo'shadi, qayta bosilganda olib tashlaydi
  const toggleCpFolderMulti = async (field, folderId) => {
    const cfg = {
      supplierFolders:            [supplierFolderIds,        setSupplierFolderIds],
      customerFolders:            [customerFolderIds,        setCustomerFolderIds],
      jobOrderNewCustomerFolders: [jobOrderNewCustFolderIds, setJobOrderNewCustFolderIds],
    };
    const [ids, setIds] = cfg[field];
    const prev = [...ids];
    const next = ids.includes(folderId) ? ids.filter(x => x !== folderId) : [...ids, folderId];
    setIds(next);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { [field]: next });
      syncSettings(res.data.organization);
    } catch {
      toast.error(t('settings.general.error')); setIds(prev);
    } finally { setSaving(false); }
  };

  const changeCpFolder = async (field, val) => {
    const setters = { productionRawFolder: setProductionRawFolder, productionFinishedFolder: setProductionFinishedFolder, salesProductFolder: setSalesProductFolder };
    const prevs = { productionRawFolder, productionFinishedFolder, salesProductFolder };
    const setter = setters[field];
    const prev = prevs[field];
    setter(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { [field]: val || null });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setter(prev);
    } finally { setSaving(false); }
  };

  const changeSalesTrigger = async (field, val) => {
    const setters = { salesStockStatus: setSalesStockStatusId, salesDebtStatus: setSalesDebtStatusId };
    const prevs   = { salesStockStatus: salesStockStatusId,    salesDebtStatus: salesDebtStatusId };
    setters[field](val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { [field]: val || null });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setters[field](prevs[field]);
    } finally { setSaving(false); }
  };

  // Sync the updated settings into Redux so other UI (Sidebar) reacts immediately.
  const syncSettings = (org) => {
    if (org?.settings) dispatch(setOrganization({ settings: org.settings }));
  };

  // Tannarx ogohlantirish foizini saqlash (blur/Enter da).
  const saveCostWarn = async (val) => {
    const v = Math.max(0, Math.floor(Number(val) || 0));
    setCostWarnPct(v);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { jobOrderCostWarnPercent: v });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error'));
    } finally { setSaving(false); }
  };

  const toggle = async () => {
    const val = !allowNeg;
    setAllowNeg(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { allowNegativeStock: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setAllowNeg(!val);
    } finally { setSaving(false); }
  };

  const toggleServSell = async () => {
    const val = !servSell;
    setServSell(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { allowServiceSelling: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setServSell(!val);
    } finally { setSaving(false); }
  };

  const changeCosting = async (val) => {
    const prev = costing;
    setCosting(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { costingMethod: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setCosting(prev);
    } finally { setSaving(false); }
  };


  const toggleJobFolders = async () => {
    const val = !jobFolders;
    setJobFolders(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { jobOrderFolders: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setJobFolders(!val);
    } finally { setSaving(false); }
  };

  const togglePaymentStatuses = async () => {
    const val = !paymentStatuses;
    setPaymentStatuses(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { paymentStatuses: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setPaymentStatuses(!val);
    } finally { setSaving(false); }
  };

  const togglePurchaseReturns = async () => {
    const val = !purchaseReturns;
    setPurchaseReturns(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { purchaseReturns: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setPurchaseReturns(!val);
    } finally { setSaving(false); }
  };

  const toggleDiscountField = async () => {
    const val = !discountField;
    setDiscountField(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { discountField: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setDiscountField(!val);
    } finally { setSaving(false); }
  };

  // Jarayon ish haqi / ajratilgan summa maydonlarini yoqish/o'chirish.
  const saveDeadlineColors = async (colors) => {
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { jobOrderDeadlineColors: colors });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch { toast.error(t('settings.general.error')); }
    finally { setSaving(false); }
  };

  const toggleJobSetting = async (key, val, setter) => {
    setter(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { [key]: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setter(!val);
    } finally { setSaving(false); }
  };

  const toggleNegCashbox = async () => {
    const val = !allowNegCashbox;
    setAllowNegCashbox(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { allowNegativeCashbox: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setAllowNegCashbox(!val);
    } finally { setSaving(false); }
  };

  const toggleNds = async () => {
    const val = !hasNds;
    setHasNds(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { hasNds: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setHasNds(!val);
    } finally { setSaving(false); }
  };

  const toggleNavHidden = (key, item) => {
    setNavHidden(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      const next = [...prev, key];
      if (item?.children) item.children.forEach(c => { if (!next.includes(c.key)) next.push(c.key); });
      return next;
    });
  };

  const [savingModules, setSavingModules] = useState(false);
  const saveNavHidden = async () => {
    setSavingModules(true);
    const prev = navHiddenSaved;
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { hiddenModules: navHidden });
      syncSettings(res.data.organization);
      setNavHiddenSaved(navHidden);
      toast.success(t('settings.general.saved'));
    } catch { setNavHidden(prev); setNavHiddenSaved(prev); toast.error(t('settings.general.error')); }
    finally { setSavingModules(false); }
  };

  const changeProcMode = async (val) => {
    const prev = procMode;
    setProcMode(val);
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/organization/settings`, { procurementMode: val });
      syncSettings(res.data.organization);
      toast.success(t('settings.general.saved'));
    } catch {
      toast.error(t('settings.general.error')); setProcMode(prev);
    } finally { setSaving(false); }
  };

  if (!loaded) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }

  const procurementModes = PROCUREMENT_MODE_OPTIONS.map((o) => ({
    ...o,
    label: t('settings.general.procurement.' + o.value + '.label'),
    hint:  t('settings.general.procurement.' + o.value + '.hint'),
  }));
  const costingOptions = COSTING_OPTIONS.map((o) => ({
    ...o,
    label: t('settings.general.costing.' + o.value + '.label'),
    hint:  t('settings.general.costing.' + o.value + '.hint'),
  }));

  // Mahsulot kategoriyalarini daraxt tartibida tekislab, ichki papkalarni chekinish bilan ko'rsatamiz.
  const flatProductCats = (() => {
    const byParent = {};
    productCats.forEach(c => { const p = c.parent ? String(c.parent) : ''; (byParent[p] = byParent[p] || []).push(c); });
    const out = [];
    const walk = (pid, depth) => (byParent[pid] || []).forEach(c => {
      out.push({ _id: c._id, label: `${'  '.repeat(depth)}${c.name}` });
      walk(String(c._id), depth + 1);
    });
    walk('', 0);
    return out;
  })();

  const SECTIONS = [
    { key: 'asosiy',   label: 'Asosiy'        },
    { key: 'zakazlar', label: 'Zakazlar'       },
    { key: 'savdo',    label: 'Savdo & Xarid'  },
    { key: 'kassir',   label: 'Kassir'         },
    { key: 'boshqa',   label: 'Boshqa'         },
  ];

  /* Reusable toggle row */
  const ToggleRow = ({ title, hint, checked, onToggle }) => (
    <div className="card card-body flex items-start justify-between gap-4">
      <div>
        <p className="font-medium text-ink text-sm">{title}</p>
        {hint && <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{hint}</p>}
      </div>
      <button onClick={onToggle} disabled={saving}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-surface-200'} disabled:opacity-60`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-5 max-w-xl">

      {/* ── Inner sub-tabs ── */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.key} type="button" onClick={() => setSection(s.key)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${section === s.key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ══ ASOSIY ══ */}
      {section === 'asosiy' && <>
        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.costingTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.costingSubtitle')}</p>
        </div>
        <div className="card card-body space-y-2">
          {costingOptions.map(opt => (
            <label key={opt.value}
              className={`flex items-start gap-3 p-2 rounded-lg ${opt.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-50'}`}>
              <input type="radio" name="costing" className="mt-1" disabled={opt.soon || saving}
                checked={costing === opt.value} onChange={() => !opt.soon && changeCosting(opt.value)} />
              <div>
                <p className="text-sm font-medium text-ink">{opt.label} {opt.soon && <span className="text-[11px] text-amber-600 font-normal">{t('settings.general.soonBadge')}</span>}</p>
                <p className="text-xs text-ink-tertiary mt-0.5">{opt.hint}</p>
              </div>
            </label>
          ))}
          <p className="text-[11px] text-ink-tertiary pt-1">{t('settings.general.costingNote')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.skladTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.skladSubtitle')}</p>
        </div>
        <ToggleRow title={t('settings.general.negStockTitle')}   hint={t('settings.general.negStockHint')}   checked={allowNeg}        onToggle={toggle} />
        <ToggleRow title={t('settings.general.servSellTitle')}   hint={t('settings.general.servSellHint')}   checked={servSell}        onToggle={toggleServSell} />

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.ndsTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.ndsSubtitle')}</p>
        </div>
        <ToggleRow title={t('settings.general.hasNdsTitle')}     hint={t('settings.general.hasNdsHint')}     checked={hasNds}          onToggle={toggleNds} />
        <ToggleRow title={t('settings.general.negCashboxTitle')} hint={t('settings.general.negCashboxHint')} checked={allowNegCashbox} onToggle={toggleNegCashbox} />
      </>}

      {/* ══ ZAKAZLAR ══ */}
      {section === 'zakazlar' && <>
          <div>
            <h3 className="font-semibold text-ink text-sm">{t('settings.general.jobFoldersSectionTitle')}</h3>
          </div>
          <ToggleRow title={t('settings.general.jobFoldersTitle')}      hint={t('settings.general.jobFoldersHint')}      checked={jobFolders}      onToggle={toggleJobFolders} />
          <ToggleRow title={t('settings.general.jobProcLaborTitle')}    hint={t('settings.general.jobProcLaborHint')}    checked={jobProcLabor}    onToggle={() => toggleJobSetting('jobProcessLabor', !jobProcLabor, setJobProcLabor)} />
          <ToggleRow title={t('settings.general.jobProcAllocatedTitle')} hint={t('settings.general.jobProcAllocatedHint')} checked={jobProcAllocated} onToggle={() => toggleJobSetting('jobProcessAllocated', !jobProcAllocated, setJobProcAllocated)} />
          <ToggleRow title={t('settings.general.sketchRequiredTitle')}  hint={t('settings.general.sketchRequiredHint')}  checked={sketchRequired}  onToggle={() => toggleJobSetting('jobOrderSketchRequired', !sketchRequired, setSketchRequired)} />
          <ToggleRow title={t('settings.general.sketchInListTitle')}    hint={t('settings.general.sketchInListHint')}    checked={sketchInList}    onToggle={() => toggleJobSetting('jobOrderSketchInList', !sketchInList, setSketchInList)} />
          <ToggleRow title="Xodim hisoboti (rasm/video/lokatsiya)" hint="Yoqilsa, xodim jarayon harakatlarida (boshlash/tugatish/muammo) rasm yoki video yuklashi va lokatsiyasi qayd etilishi mumkin." checked={processWorkerReports} onToggle={() => toggleJobSetting('processWorkerReports', !processWorkerReports, setProcessWorkerReports)} />
          <ToggleRow title="Xodim snabjeniyaga zapros yaratsin" hint="Yoqilsa, ish jarayoni xodimi o'zining sahifasidan snabjeniyaga mahsulot so'rovi (zapros) yarata oladi." checked={processWorkerProcurement} onToggle={() => toggleJobSetting('processWorkerProcurement', !processWorkerProcurement, setProcessWorkerProcurement)} />
          <ToggleRow title="Boshlanish sanasini kiritish" hint="Yoqilsa, job order formasida 'Boshlanish sanasi' maydoni paydo bo'ladi — zakaz qachon boshlanishi kerakligini belgilash uchun." checked={jobOrderStartDate} onToggle={() => toggleJobSetting('jobOrderStartDate', !jobOrderStartDate, setJobOrderStartDate)} />
          <ToggleRow title="Job orderlarda smeta yaratish" hint="Yoqilsa, har bir job order ichida smeta (tijorat taklifi jadvali) yaratish bo'limi paydo bo'ladi." checked={jobOrderSmeta} onToggle={() => toggleJobSetting('jobOrderSmeta', !jobOrderSmeta, setJobOrderSmeta)} />
          {jobOrderSmeta && (
            <div className="ml-6 pl-4 border-l-2 border-surface-200 space-y-0.5">
              <ToggleRow
                title="Xodimlarga smeta ko'rinsin"
                hint="Yoqilsa, ish jarayoni xodimlari job order ichida smeta bo'limini ko'ra oladi. O'chirilsa — faqat admin/owner ko'radi."
                checked={smetaVisibleToWorkers}
                onToggle={() => toggleJobSetting('smetaVisibleToWorkers', !smetaVisibleToWorkers, setSmetaVisibleToWorkers)}
              />
              {smetaVisibleToWorkers && (
                <ToggleRow
                  title="Xodimlarga narxlar ko'rinsin"
                  hint="Yoqilsa, xodim smetadagi narx va jami summa ustunlarini ko'radi. O'chirilsa — faqat miqdor va nomenklatura ko'rinadi."
                  checked={smetaWorkerShowPrices}
                  onToggle={() => toggleJobSetting('smetaWorkerShowPrices', !smetaWorkerShowPrices, setSmetaWorkerShowPrices)}
                />
              )}
            </div>
          )}

          {/* ── Muddat rang ogohlantirishi ── */}
          <ToggleRow
            title="Muddat yaqinlashganda rang ogohlantirishi"
            hint="Yoqilsa, job order muddatiga qolgan kunlarga qarab qator rangi o'zgaradi."
            checked={jobOrderDeadlineWarning}
            onToggle={() => toggleJobSetting('jobOrderDeadlineWarning', !jobOrderDeadlineWarning, setJobOrderDeadlineWarning)}
          />
          {jobOrderDeadlineWarning && (
            <div className="card card-body space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Rang qoidalari</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">Muddat bugun uchib o'tsa — har doim qizil. Quyida esa: X kun qolganda qanday rang.</p>
                </div>
                <button type="button" disabled={saving}
                  onClick={() => {
                    const next = [...deadlineColors, { daysLeft: 3, bgColor: '#fef9c3', textColor: '#854d0e' }];
                    setDeadlineColors(next);
                    saveDeadlineColors(next);
                  }}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors border border-primary-200">
                  + Qoida qo'shish
                </button>
              </div>

              {deadlineColors.length === 0 && (
                <p className="text-xs text-ink-tertiary text-center py-3">Hozircha qoida yo'q. "+ Qoida qo'shish" ni bosing.</p>
              )}

              {[...deadlineColors].sort((a, b) => a.daysLeft - b.daysLeft).map((rule, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 bg-surface-50">
                  {/* Preview */}
                  <div className="w-28 shrink-0 rounded-lg px-3 py-1.5 text-center text-xs font-semibold select-none"
                    style={{ background: rule.bgColor, color: rule.textColor }}>
                    {rule.daysLeft} kun qoldi
                  </div>
                  {/* Kun */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <label className="text-xs text-ink-tertiary shrink-0">Kun:</label>
                    <input type="number" min="0" max="365" value={rule.daysLeft}
                      className="input w-16 text-center py-1 text-sm"
                      onChange={e => {
                        const next = deadlineColors.map((r, i) => i === idx ? { ...r, daysLeft: Math.max(0, Number(e.target.value) || 0) } : r);
                        setDeadlineColors(next);
                      }}
                      onBlur={() => saveDeadlineColors(deadlineColors)}
                      onKeyDown={e => { if (e.key === 'Enter') saveDeadlineColors(deadlineColors); }}
                    />
                  </div>
                  {/* Fon rangi */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-ink-tertiary shrink-0">Fon:</label>
                    <input type="color" value={rule.bgColor}
                      className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5"
                      onChange={e => {
                        const next = deadlineColors.map((r, i) => i === idx ? { ...r, bgColor: e.target.value } : r);
                        setDeadlineColors(next);
                      }}
                      onBlur={() => saveDeadlineColors(deadlineColors)}
                    />
                  </div>
                  {/* Matn rangi */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-ink-tertiary shrink-0">Matn:</label>
                    <input type="color" value={rule.textColor}
                      className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5"
                      onChange={e => {
                        const next = deadlineColors.map((r, i) => i === idx ? { ...r, textColor: e.target.value } : r);
                        setDeadlineColors(next);
                      }}
                      onBlur={() => saveDeadlineColors(deadlineColors)}
                    />
                  </div>
                  {/* O'chirish */}
                  <button type="button"
                    onClick={() => {
                      const next = deadlineColors.filter((_, i) => i !== idx);
                      setDeadlineColors(next);
                      saveDeadlineColors(next);
                    }}
                    className="ml-auto p-1.5 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}

              {/* Muddati o'tgan — har doim qizil (info) */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/50">
                <div className="w-28 shrink-0 rounded-lg px-3 py-1.5 text-center text-xs font-semibold bg-red-100 text-red-700">
                  Muddati o'tdi
                </div>
                <p className="text-xs text-ink-tertiary">Har doim qizil — o'zgartirish mumkin emas</p>
              </div>
            </div>
          )}

          <div className="card card-body flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink text-sm">{t('settings.general.costWarnTitle')}</p>
              <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{t('settings.general.costWarnHint')}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <input type="number" min="0" value={costWarnPct} disabled={saving}
                onChange={e => setCostWarnPct(e.target.value)}
                onBlur={e => saveCostWarn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCostWarn(e.target.value); }}
                className="input w-20 text-right" />
              <span className="text-sm text-ink-tertiary">%</span>
            </div>
          </div>
          <ToggleRow
            title="TV rejimi tugmasi"
            hint="Yoqilsa, Zakazlar sahifasida 'TV' tugmasi ko'rinadi — ishlab chiqarish sexi Smart TV ekraniga mo'ljallangan."
            checked={jobOrderTvMode}
            onToggle={() => toggleJobSetting('jobOrderTvMode', !jobOrderTvMode, setJobOrderTvMode)}
          />
          <ToggleRow
            title="Muzlatish (pauza) imkoniyati"
            hint="Yoqilsa, tasdiqlangan yoki jarayondagi zakaz ichida 'Muzlatish' tugmasi paydo bo'ladi. Muzlatilganda davom ettirilish sanasi so'ralib, muddat shunga qarab uzaytiriladi."
            checked={jobOrderFreezeStatus}
            onToggle={() => toggleJobSetting('jobOrderFreezeStatus', !jobOrderFreezeStatus, setJobOrderFreezeStatus)}
          />
      </>}

      {/* ══ SAVDO & XARID ══ */}
      {section === 'savdo' && <>
        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.salesTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.salesSubtitle')}</p>
        </div>
        <div className="card card-body space-y-4">
          {[
            { key: 'salesOrders',   on: salesOrders,   setter: setSalesOrders,   label: t('settings.general.salesOrders') },
            { key: 'salesInvoices', on: salesInvoices, setter: setSalesInvoices, label: t('settings.general.salesInvoices') },
            { key: 'salesReturns',  on: salesReturns,  setter: setSalesReturns,  label: t('settings.general.salesReturns') },
          ].map(o => (
            <div key={o.key} className="flex items-center justify-between gap-4">
              <p className="font-medium text-ink text-sm">{o.label}</p>
              <button onClick={() => toggleJobSetting(o.key, !o.on, o.setter)} disabled={saving}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${o.on ? 'bg-primary-600' : 'bg-surface-200'} disabled:opacity-60`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${o.on ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-ink-tertiary">{t('settings.general.salesSectionsHint')}</p>
          <div className="pt-3 border-t border-surface-100">
            <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.general.salesProductFolder')}</label>
            <div className="relative">
              <select className="input appearance-none pr-8" value={salesProductFolder} disabled={saving}
                onChange={e => changeCpFolder('salesProductFolder', e.target.value)}>
                <option value="">{t('settings.general.cpFolderAll')}</option>
                {flatProductCats.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
            </div>
            <p className="text-[11px] text-ink-tertiary mt-1">{t('settings.general.salesProductFolderHint')}</p>
          </div>

          {/* Hisobga olish triggerlari */}
          <div className="pt-3 border-t border-surface-100 space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-3">Hisobga olish triggerlari</p>
              <p className="text-[11px] text-ink-tertiary mb-4">
                Quyida tanlangan statusga o'tilganda tegishli amal avtomatik bajariladi. Bo'sh qoldirilsa — eski «Tasdiqlangan» tugma orqali boshqariladi.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Qoldiq triggeri
                    <span className="ml-1.5 text-xs font-normal text-ink-tertiary">— qaysi statusda tovar qoldig'idan ayirilsin</span>
                  </label>
                  <div className="relative">
                    <select className="input appearance-none pr-8" value={salesStockStatusId} disabled={saving}
                      onChange={e => changeSalesTrigger('salesStockStatus', e.target.value)}>
                      <option value="">— Belgilanmagan (eski usul) —</option>
                      {salesInvoiceStatuses.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Qarz triggeri
                    <span className="ml-1.5 text-xs font-normal text-ink-tertiary">— qaysi statusda kontragent qarzdorligi shakllansin</span>
                  </label>
                  <div className="relative">
                    <select className="input appearance-none pr-8" value={salesDebtStatusId} disabled={saving}
                      onChange={e => changeSalesTrigger('salesDebtStatus', e.target.value)}>
                      <option value="">— Belgilanmagan (eski usul) —</option>
                      {salesInvoiceStatuses.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.purchasesTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.purchasesSubtitle')}</p>
        </div>
        <ToggleRow title={t('settings.general.purchaseReturnsTitle')} hint={t('settings.general.purchaseReturnsHint')} checked={purchaseReturns} onToggle={togglePurchaseReturns} />
        <ToggleRow title={t('settings.general.discountFieldTitle')} hint={t('settings.general.discountFieldHint')} checked={discountField} onToggle={toggleDiscountField} />

        <div className="card card-body space-y-3">
          <div>
            <p className="text-sm font-medium text-ink">{t('settings.general.purchaseDefaultWarehouse')}</p>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.purchaseDefaultWarehouseHint')}</p>
          </div>
          <div className="relative">
            <select
              className="input pr-8"
              value={purchaseDefaultWarehouse}
              disabled={saving}
              onChange={async (e) => {
                const val = e.target.value;
                setPurchaseDefaultWarehouse(val);
                setSaving(true);
                try {
                  const res = await axios.put(`${API_URL}/organization/settings`, { purchaseDefaultWarehouse: val || null });
                  syncSettings(res.data.organization);
                } catch { toast.error(t('common.saveError')); setPurchaseDefaultWarehouse(purchaseDefaultWarehouse); }
                finally { setSaving(false); }
              }}
            >
              <option value="">—</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.purchasesTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.purchasesSubtitle')}</p>
        </div>
        <div className="card card-body space-y-2">
          {procurementModes.map(opt => (
            <label key={opt.value} className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-surface-50">
              <input type="radio" name="proc-mode" className="mt-1" disabled={saving}
                checked={procMode === opt.value} onChange={() => changeProcMode(opt.value)} />
              <div>
                <p className="text-sm font-medium text-ink">{opt.label}</p>
                <p className="text-xs text-ink-tertiary mt-0.5">{opt.hint}</p>
              </div>
            </label>
          ))}
          <p className="text-[11px] text-ink-tertiary pt-1">{t('settings.general.purchasesNote')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.paymentsTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.paymentsSubtitle')}</p>
        </div>
        <ToggleRow title={t('settings.general.paymentStatusesTitle')} hint={t('settings.general.paymentStatusesHint')} checked={paymentStatuses} onToggle={togglePaymentStatuses} />
      </>}

      {/* ══ KASSIR ══ */}
      {section === 'kassir' && <>
        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.cashierTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.cashierSubtitle')}</p>
        </div>
        <div className="card card-body">
          {cashboxList.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('settings.general.cashierNoCashboxes')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cashboxList.map(cb => {
                const checked = cashierCashboxes.includes(cb._id);
                return (
                  <label key={cb._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                    <input type="checkbox" className="accent-primary-600 w-4 h-4" checked={checked}
                      disabled={saving} onChange={() => toggleCashierCashbox(cb._id)} />
                    <span className="text-sm"><span className="font-medium text-ink">{cb.name}</span> <span className="text-ink-tertiary">({cb.currency})</span></span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-ink-tertiary mt-2">{t('settings.general.cashierHint')}</p>
        </div>

        <div className="card card-body">
          <p className="font-medium text-ink text-sm mb-1">{t('settings.general.cashierCpTitle')}</p>
          <p className="text-xs text-ink-tertiary mb-3">{t('settings.general.cashierCpSubtitle')}</p>
          {cpFolders.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('settings.general.cashierNoFolders')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cpFolders.map(f => {
                const checked = cashierCpFolders.includes(f._id);
                return (
                  <label key={f._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                    <input type="checkbox" className="accent-primary-600 w-4 h-4" checked={checked}
                      disabled={saving} onChange={() => toggleCashierCpFolder(f._id)} />
                    <span className="text-sm font-medium text-ink">{f.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-ink-tertiary mt-2">{t('settings.general.cashierCpHint')}</p>
        </div>

        <div className="card card-body">
          <p className="font-medium text-ink text-sm mb-1">{t('settings.general.snabjenistCpTitle')}</p>
          <p className="text-xs text-ink-tertiary mb-3">{t('settings.general.snabjenistCpSubtitle')}</p>
          {cpFolders.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('settings.general.cashierNoFolders')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cpFolders.map(f => {
                const checked = snabjenistCpFolders.includes(f._id);
                return (
                  <label key={f._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                    <input type="checkbox" className="accent-primary-600 w-4 h-4" checked={checked}
                      disabled={saving} onChange={() => toggleSnabjenistCpFolder(f._id)} />
                    <span className="text-sm font-medium text-ink">{f.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-[11px] text-ink-tertiary mt-2">{t('settings.general.snabjenistCpHint')}</p>
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.catCpTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.catCpSubtitle')}</p>
        </div>
        <div className="card card-body">
          {payCategories.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('settings.general.catCpEmpty')}</p>
          ) : (
            <div className="divide-y divide-surface-100 -my-1">
              {payCategories.map(cat => (
                <div key={cat._id} className="flex items-center gap-3 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-ink">{cat.name}</span>
                    <span className="text-[10px] text-ink-tertiary ml-1.5">{cat.type === 'incoming' ? t('settings.general.catCpIncoming') : t('settings.general.catCpOutgoing')}</span>
                  </div>
                  <select className="input input-sm w-44 shrink-0"
                    value={cat.noCounterparty ? 'none' : (cat.cpFolder || '')}
                    disabled={saving}
                    onChange={e => setCategoryCp(cat, e.target.value)}>
                    <option value="">{t('settings.general.catCpAll')}</option>
                    <option value="none">{t('settings.general.catCpNone')}</option>
                    {cpFolders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-ink-tertiary mt-2">{t('settings.general.catCpHint')}</p>
        </div>
      </>}

      {/* ══ BOSHQA ══ */}
      {section === 'boshqa' && <>
        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.cpSectionTitle')}</h3>
        </div>
        <ToggleRow title={t('settings.general.cpStatusTitle')} hint={t('settings.general.cpStatusHint')} checked={cpStatus} onToggle={() => toggleJobSetting('counterpartyStatus', !cpStatus, setCpStatus)} />

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.cpFolderTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.cpFolderSubtitle')}</p>
        </div>
        <div className="card card-body space-y-5">
          {[
            { field: 'supplierFolders',            ids: supplierFolderIds,        label: t('settings.general.cpSupplierFolder'),            hint: t('settings.general.cpSupplierFolderHint') },
            { field: 'customerFolders',            ids: customerFolderIds,        label: t('settings.general.cpCustomerFolder'),            hint: t('settings.general.cpCustomerFolderHint') },
            { field: 'jobOrderNewCustomerFolders', ids: jobOrderNewCustFolderIds, label: t('settings.general.cpJobOrderNewCustomerFolder'), hint: t('settings.general.cpJobOrderNewCustomerFolderHint') },
          ].map(({ field, ids, label, hint }) => (
            <div key={field}>
              <p className="text-sm font-medium text-ink mb-1">{label}</p>
              <p className="text-[11px] text-ink-tertiary mb-2">{hint}</p>
              {cpFolders.length === 0 ? (
                <p className="text-sm text-ink-tertiary italic">— Papkalar yo'q —</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {cpFolders.map(f => {
                    const checked = ids.includes(f._id);
                    return (
                      <label key={f._id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'} ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
                        <input type="checkbox" className="accent-primary-600 w-4 h-4 shrink-0"
                          checked={checked} onChange={() => toggleCpFolderMulti(field, f._id)} disabled={saving} />
                        <span className="text-sm font-medium text-ink truncate">{f.name}</span>
                        {f.color && <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ backgroundColor: f.color }} />}
                      </label>
                    );
                  })}
                </div>
              )}
              {ids.length === 0 && (
                <p className="text-[11px] text-ink-tertiary mt-1.5">Hech biri tanlanmagan — barcha papkalar ko'rinadi</p>
              )}
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-semibold text-ink text-sm">{t('settings.general.prodFolderTitle')}</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.prodFolderSubtitle')}</p>
        </div>
        <div className="card card-body space-y-4">
          {[
            { field: 'productionRawFolder',      val: productionRawFolder,      label: t('settings.general.prodRawFolder'),      hint: t('settings.general.prodRawFolderHint') },
            { field: 'productionFinishedFolder', val: productionFinishedFolder, label: t('settings.general.prodFinishedFolder'), hint: t('settings.general.prodFinishedFolderHint') },
          ].map(({ field, val, label, hint }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
              <div className="relative">
                <select className="input appearance-none pr-8" value={val} disabled={saving}
                  onChange={e => changeCpFolder(field, e.target.value)}>
                  <option value="">{t('settings.general.cpFolderAll')}</option>
                  {flatProductCats.map(c => <option key={c._id} value={c._id}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
              </div>
              <p className="text-[11px] text-ink-tertiary mt-1">{hint}</p>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 pt-1 border-t border-surface-100">
            <div>
              <p className="font-medium text-ink text-sm">{t('settings.general.prodOutputBatchTitle')}</p>
              <p className="text-xs text-ink-tertiary mt-1 leading-relaxed">{t('settings.general.prodOutputBatchHint')}</p>
            </div>
            <button onClick={() => toggleJobSetting('productionOutputBatch', !productionOutputBatch, setProductionOutputBatch)} disabled={saving}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${productionOutputBatch ? 'bg-primary-600' : 'bg-surface-200'} disabled:opacity-60`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${productionOutputBatch ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        <div className="card card-body space-y-3">
          <div>
            <p className="text-sm font-medium text-ink">{t('settings.general.productionDefaultWarehouses')}</p>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.general.productionDefaultWarehousesHint')}</p>
          </div>
          {[
            { label: t('settings.general.productionDefaultRawWarehouse'),      val: productionDefaultRawWh,      setter: setProductionDefaultRawWh,      key: 'productionDefaultRawWarehouse' },
            { label: t('settings.general.productionDefaultFinishedWarehouse'), val: productionDefaultFinishedWh, setter: setProductionDefaultFinishedWh, key: 'productionDefaultFinishedWarehouse' },
          ].map(({ label, val, setter, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-ink-secondary mb-1">{label}</label>
              <div className="relative">
                <select className="input pr-8" value={val} disabled={saving}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setter(v);
                    setSaving(true);
                    try {
                      const res = await axios.put(`${API_URL}/organization/settings`, { [key]: v || null });
                      syncSettings(res.data.organization);
                    } catch { toast.error(t('common.saveError')); setter(val); }
                    finally { setSaving(false); }
                  }}
                >
                  <option value="">—</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-tertiary pointer-events-none" />
              </div>
            </div>
          ))}
          {productionDefaultRawWh && productionDefaultFinishedWh && (
            <div className="pt-1 border-t border-surface-100">
              <ToggleRow
                title="Formada ombor tanlovini yashirish"
                hint="Yoqilsa, ishlab chiqarish formasida ombor dropdownlari ko'rinmaydi — yuqorida belgilangan standart omborlar avtomatik ishlatiladi."
                checked={productionHideWarehouse}
                onToggle={() => toggleJobSetting('productionHideWarehouse', !productionHideWarehouse, setProductionHideWarehouse)}
              />
            </div>
          )}
        </div>

        {/* Modullar ko'rinishi */}
        <div>
          <h3 className="font-semibold text-ink text-sm">Modullar ko'rinishi</h3>
          <p className="text-xs text-ink-tertiary mt-0.5">Sidebardan qaysi modullar va sub-modullar ko'rinsin yoki ko'rinmasin</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
          {NAV_ITEMS.filter(item => item.key !== 'integrations').map((item, itemIdx, arr) => {
            const isHidden  = navHidden.includes(item.key);
            const isLast    = itemIdx === arr.length - 1;
            return (
              <div key={item.key} className={!isLast ? 'border-b border-surface-100' : ''}>
                {/* Parent row */}
                <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isHidden ? 'bg-surface-50' : 'bg-white'}`}>
                  <item.icon className={`w-4 h-4 shrink-0 ${isHidden ? 'text-ink-disabled' : 'text-ink-secondary'}`} />
                  <span className={`flex-1 text-sm font-medium ${isHidden ? 'text-ink-disabled line-through' : 'text-ink'}`}>
                    {t('nav.' + item.key)}
                  </span>
                  <button type="button" disabled={saving}
                    onClick={() => toggleNavHidden(item.key, item)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isHidden
                      ? 'bg-surface-100 text-ink-tertiary hover:bg-surface-200'
                      : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>
                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isHidden ? 'Yashirin' : 'Ko\'rinadi'}
                  </button>
                </div>
                {/* Children — faqat parent yashirilmagan bo'lsa ko'rsatamiz */}
                {!isHidden && item.children?.map((child, cIdx, cArr) => {
                  const childHid = navHidden.includes(child.key);
                  const isLastChild = cIdx === cArr.length - 1;
                  return (
                    <div key={child.key}
                      className={`flex items-center gap-3 pl-10 pr-4 py-2.5 transition-colors ${childHid ? 'bg-surface-50' : 'bg-white'} ${!isLastChild ? 'border-b border-surface-50' : ''}`}>
                      <child.icon className={`w-3.5 h-3.5 shrink-0 ${childHid ? 'text-ink-disabled' : 'text-ink-tertiary'}`} />
                      <span className={`flex-1 text-sm ${childHid ? 'text-ink-disabled line-through' : 'text-ink-secondary'}`}>
                        {t('nav.' + child.key)}
                      </span>
                      <button type="button" disabled={saving}
                        onClick={() => toggleNavHidden(child.key, null)}
                        className={`w-7 h-4 rounded-full transition-colors relative ${childHid ? 'bg-surface-300' : 'bg-primary-500'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${childHid ? 'left-0.5' : 'left-3.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {JSON.stringify(navHidden.slice().sort()) !== JSON.stringify(navHiddenSaved.slice().sort()) && (
          <div className="flex justify-end">
            <button onClick={saveNavHidden} disabled={savingModules}
              className="btn-primary btn-md flex items-center gap-2">
              {savingModules ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Saqlash
            </button>
          </div>
        )}

        <NavOrderSection navOrder={navOrder} setNavOrder={setNavOrder} saving={saving} setSaving={setSaving} syncSettings={syncSettings} t={t} />
      </>}

    </div>
  );
}

const ROLE_LABEL = {
  owner:   'Account owner',
  admin:   'Administrator',
  user:    'User',
  cashier: 'Cashier',
};

// Rol (role) + xodim turi (userType) ni bitta "Lavozim" qiymatiga keltirish
function lavozimOf(f) {
  if (f.role === 'owner') return 'owner';
  if (f.role === 'admin') return 'admin';
  if (f.isSnabjenist) return 'snab';
  if (f.isProcessWorker) return 'process';
  if (f.isProjectManager) return 'pm';
  if (f.isCashier || f.role === 'cashier') return 'cashier';
  return 'user';
}

// Maxsus rol (RBAC) qaysi lavozimlarda tanlanadi: foydalanuvchi, loyiha menejeri, kassir
function lavozimHasRbac(v) {
  return v === 'user' || v === 'pm' || v === 'cashier';
}

// Tanlangan "Lavozim" qiymatini role + flaglarga yoyish
function lavozimPatch(v) {
  const p = {
    role: v === 'admin' ? 'admin' : 'user',
    isSnabjenist: v === 'snab',
    isProcessWorker: v === 'process',
    isProjectManager: v === 'pm',
    isCashier: v === 'cashier',
  };
  if (!lavozimHasRbac(v)) p.customRole = '';   // admin/snab/jarayon xodimida maxsus rol yo'q
  if (v !== 'snab') { p.cashboxes = []; p.counterpartyFolders = []; }  // kassa+papka faqat snabjenistda
  if (v !== 'process') p.departments = [];      // ko'p bo'lim faqat jarayon xodimida
  return p;
}

const ROLE_COLOR = {
  owner:   'bg-primary-50 text-primary-700',
  admin:   'bg-blue-50 text-blue-700',
  user:    'bg-violet-50 text-violet-700',
  cashier: 'bg-amber-50 text-amber-700',
};

const PERMISSION_MODULES = [
  { key: 'contacts', label: 'Kontaktlar' },
];


const ALL_CURRENCIES = [
  { code: 'UZS', name: "O'zbek so'mi",              symbol: "so'm" },
  { code: 'USD', name: 'AQSh dollari',               symbol: '$'    },
  { code: 'EUR', name: 'Yevro',                      symbol: '€'    },
  { code: 'RUB', name: 'Rossiya rubli',              symbol: '₽'    },
  { code: 'KZT', name: "Qozog'iston tengesi",        symbol: '₸'    },
  { code: 'GBP', name: 'Britaniya funt sterlingi',   symbol: '£'    },
  { code: 'JPY', name: 'Yaponiya iyenasi',            symbol: '¥'    },
  { code: 'CNY', name: 'Xitoy yuani',                symbol: '¥'    },
  { code: 'TRY', name: 'Turk lirasi',                symbol: '₺'    },
  { code: 'AED', name: 'BAA dirhami',                symbol: 'AED'  },
  { code: 'KGS', name: "Qirg'iziston somi",          symbol: 'с'    },
  { code: 'TJS', name: 'Tojikiston somoniysi',        symbol: 'SM'   },
  { code: 'TMT', name: 'Turkmaniston manati',         symbol: 'T'    },
  { code: 'AZN', name: 'Ozarbayjon manati',           symbol: '₼'    },
  { code: 'GEL', name: 'Gruziya larisi',              symbol: '₾'    },
  { code: 'UAH', name: 'Ukraina grivnasi',            symbol: '₴'    },
  { code: 'BYN', name: 'Belarus rubli',               symbol: 'Br'   },
  { code: 'SAR', name: 'Saudiya Arabistoni riyoli',   symbol: 'SAR'  },
  { code: 'CAD', name: 'Kanada dollari',              symbol: 'CA$'  },
  { code: 'AUD', name: 'Avstraliya dollari',          symbol: 'A$'   },
  { code: 'CHF', name: 'Shveytsariya franki',         symbol: 'Fr'   },
  { code: 'INR', name: 'Hindiston rupiyasi',          symbol: '₹'    },
  { code: 'KRW', name: 'Janubiy Koreya voni',        symbol: '₩'    },
  { code: 'SEK', name: 'Shvetsiya kronasi',           symbol: 'kr'   },
  { code: 'NOK', name: 'Norvegiya kronasi',           symbol: 'kr'   },
  { code: 'DKK', name: 'Daniya kronasi',              symbol: 'kr'   },
  { code: 'PLN', name: 'Polsha zlotiyi',              symbol: 'zł'   },
  { code: 'CZK', name: 'Chexiya kronasi',             symbol: 'Kč'   },
  { code: 'HUF', name: 'Vengriya forinti',            symbol: 'Ft'   },
  { code: 'RON', name: 'Ruminiya leyi',               symbol: 'lei'  },
];

/* ─── Modal wrapper ──────────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-modal w-full ${wide ? 'max-w-2xl' : 'max-w-md'} mx-4 max-h-[90dvh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-surface-100">
          <h3 className="font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Users tab ─────────────────────────────────────────── */
function UsersTab({ currentUser }) {
  const t = useT();
  const navigate = useNavigate();
  const roleLabel = (r) => t('settings.users.roles.' + r);
  const permLabel = (k) => t('settings.users.perms.' + k);
  const [users, setUsers]         = useState([]);
  const [userSearch, setUserSearch] = useState('');   // ism/telefon bo'yicha qidiruv
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'user' });

  const [modal, setModal] = useState(null); // { type: 'edit'|'password'|'delete', user }
  const [modalSaving, setModalSaving] = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        axios.get(`${API_URL}/organization/users`),
        axios.get(`${API_URL}/organization/roles`).catch(() => ({ data: {} })),
      ]);
      setUsers(uRes.data.users);
      setRoles(rRes.data.roles || []);
    } catch {
      toast.error(t('settings.users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (u) => {
    setEditForm({ name: u.name, phone: u.phone, email: u.email || '', role: u.role });
    setModal({ type: 'edit', user: u });
  };

  const openPassword = (u) => { setNewPassword(''); setModal({ type: 'password', user: u }); };
  const openDelete   = (u) => { setModal({ type: 'delete', user: u }); };
  const closeModal   = () => { setModal(null); setModalSaving(false); };

  const handleEdit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    try {
      await axios.put(`${API_URL}/organization/users/${modal.user._id}`, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        role: editForm.role,
      });
      toast.success(t('settings.users.updated'));
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.users.genericError'));
    } finally { setModalSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 4) { toast.error(t('settings.users.passwordTooShort')); return; }
    setModalSaving(true);
    try {
      await axios.put(`${API_URL}/organization/users/${modal.user._id}/password`, { newPassword });
      toast.success(t('settings.users.passwordChanged'));
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.users.genericError'));
    } finally { setModalSaving(false); }
  };

  const handleDelete = async () => {
    setModalSaving(true);
    try {
      await axios.delete(`${API_URL}/organization/users/${modal.user._id}`);
      toast.success(t('settings.users.deleted'));
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.users.genericError'));
    } finally { setModalSaving(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    try {
      await axios.post(`${API_URL}/organization/users`, {
        name: form.name,
        phone: '+998' + form.phone,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      toast.success(t('settings.users.added'));
      setForm({ name: '', phone: '', email: '', password: '', role: 'user' });
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settings.users.genericError'));
    } finally {
      setModalSaving(false);
    }
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    setForm(p => ({ ...p, phone: digits }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-tertiary">
          {t('settings.users.countPrefix')} <span className="font-semibold text-ink">{users.length}</span> {t('settings.users.countSuffix')}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
            <input className="input input-with-icon w-56" placeholder={t('settings.users.searchPlaceholder')}
              value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          <button
            onClick={() => {
              setForm({ name: '', phone: '', email: '', password: '', role: 'user' });
              setModal({ type: 'add' });
            }}
            className="btn-primary btn-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('settings.users.add')}
          </button>
        </div>
      </div>

      {/* Users table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('settings.users.thUser')}</th>
              <th>{t('settings.users.thPhone')}</th>
              <th>{t('settings.users.thRole')}</th>
              <th>{t('settings.users.thDept')}</th>
              <th>{t('settings.users.thStatus')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Ism / telefon bo'yicha qidiruv (raqamda bo'shliq/belgilarni e'tiborsiz).
              const q = userSearch.trim().toLowerCase();
              const qDigits = q.replace(/\D/g, '');
              const filteredUsers = !q ? users : users.filter(u => {
                const nameHit = (u.name || '').toLowerCase().includes(q);
                const phoneHit = qDigits && (u.phone || '').replace(/\D/g, '').includes(qDigits);
                return nameHit || phoneHit;
              });
              // Foydalanuvchilarni bo'lim bo'yicha guruhlash (bo'limsizlar oxirida).
              const byDept = {}, order = [];
              filteredUsers.forEach(u => {
                const key = u.department?._id || '__none__';
                if (!byDept[key]) { byDept[key] = { name: u.department?.name || t('settings.users.noDept'), list: [], none: !u.department }; order.push(key); }
                byDept[key].list.push(u);
              });
              order.sort((a, b) => (byDept[a].none ? 1 : 0) - (byDept[b].none ? 1 : 0) || byDept[a].name.localeCompare(byDept[b].name));
              if (!filteredUsers.length) {
                return (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-tertiary">{t('settings.users.noResults')}</td></tr>
                );
              }
              let n = 0;
              return order.map(gk => (
                <React.Fragment key={gk}>
                  <tr className="bg-surface-50/80 border-y border-surface-100">
                    <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-ink-secondary uppercase tracking-wide">
                      {byDept[gk].name} <span className="text-ink-tertiary font-normal">· {byDept[gk].list.length}</span>
                    </td>
                  </tr>
                  {byDept[gk].list.map((u) => {
                    const i = n++;
                    const isMe = u._id === currentUser?.id;
                    return (
                <tr key={u._id} className={`cursor-pointer hover:bg-surface-50 transition-colors ${isMe ? 'bg-primary-50/30' : ''}`}
                  onClick={e => { if (e.target.closest('button,a')) return; navigate(`/settings/users/${u._id}`); }}>
                  <td className="text-ink-tertiary w-10">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-primary-700 font-semibold text-xs">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{u.name}</span>
                          {isMe && (
                            <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-semibold">
                              {t('settings.users.you')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-secondary">{u.phone}</td>
                  <td>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role]}`}>
                        {roleLabel(u.role)}
                      </span>
                      {u.customRole?.name && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                          {u.customRole.name}
                        </span>
                      )}
                      {u.isSnabjenist && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold" title={t('settings.users.snabjenist')}>
                          {t('settings.users.snabjenist')}
                        </span>
                      )}
                      {u.isProcessWorker && (
                        <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-semibold" title={t('settings.users.processWorker')}>
                          {t('settings.users.processWorker')}
                        </span>
                      )}
                      {u.isProjectManager && (
                        <span className="text-[10px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-semibold" title={t('settings.users.projectManager')}>
                          {t('settings.users.projectManager')}
                        </span>
                      )}
                      {u.isCashier && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold" title={t('settings.users.cashier')}>
                          {t('settings.users.cashier')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-ink-secondary text-sm">
                    {u.isProcessWorker && (u.departments || []).length
                      ? (u.departments || []).map(d => d?.name || d).filter(Boolean).join(', ')
                      : (u.department?.name || <span className="text-ink-disabled">—</span>)}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-primary-400' : 'bg-surface-300'}`} />
                      <span className="text-xs text-ink-tertiary">{u.isActive ? t('settings.users.active') : t('settings.users.inactive')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/settings/users/${u._id}`)}
                        className="p-1.5 text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title={t('settings.users.editTitle')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openPassword(u)}
                        className="p-1.5 text-ink-tertiary hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title={t('settings.users.changePasswordTitle')}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {!isMe && u.role !== 'owner' && (
                        <button
                          onClick={() => openDelete(u)}
                          className="p-1.5 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('settings.users.deleteTitle')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Add user modal */}
      {modal?.type === 'add' && (
        <Modal title={t('settings.users.newUser')} onClose={closeModal} wide>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.name')}</label>
              <input
                type="text" value={form.name} required minLength={2}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="input" placeholder={t('settings.users.namePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.phone')}</label>
              <div className="flex">
                <div className="flex items-center gap-1 px-3 bg-surface-100 border border-r-0 border-surface-200 rounded-l-lg text-sm text-ink-secondary shrink-0">
                  <Phone className="w-3.5 h-3.5 text-ink-tertiary" />
                  +998
                </div>
                <input
                  type="tel" value={form.phone} onChange={handlePhoneChange}
                  className="input rounded-l-none flex-1" placeholder={t('settings.users.phonePlaceholder')}
                  inputMode="numeric" maxLength={9} required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  type="password" value={form.password} required minLength={4}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input input-with-icon" placeholder={t('settings.users.passwordPlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.email')} <span className="text-ink-tertiary font-normal">{t('settings.users.emailHint')}</span></label>
              <input
                type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="input" placeholder={t('settings.users.emailPlaceholder')}
              />
            </div>

            {/* Inputlar va rollar orasidagi ajratuvchi chiziq */}
            <div className="md:col-span-2 border-t border-surface-200 my-1" />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.position')}</label>
              <Dropdown value={form.role} onChange={(v) => setForm(p => ({ ...p, role: v }))}
                options={[
                  { value: 'admin', label: roleLabel('admin') },
                  { value: 'user',  label: roleLabel('user')  },
                ]} />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeModal} className="btn-secondary btn-md">{t('settings.users.cancel')}</button>
              <button type="submit" disabled={modalSaving} className="btn-primary btn-md">
                {modalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.users.saving')}</> : t('settings.users.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {modal?.type === 'edit' && (
        <Modal title={t('settings.users.editUser')} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.name')}</label>
              <input
                type="text" value={editForm.name} required minLength={2}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.email')}</label>
              <input
                type="email" value={editForm.email || ''}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                className="input" placeholder="example@mail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.position')}</label>
              <Dropdown value={editForm.role || 'user'} disabled={modal.user.role === 'owner'}
                options={modal.user.role === 'owner'
                  ? [{ value: 'owner', label: t('settings.users.accountOwner') }]
                  : [
                      { value: 'admin', label: roleLabel('admin') },
                      { value: 'user',  label: roleLabel('user')  },
                    ]}
                onChange={(v) => setEditForm(p => ({ ...p, role: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeModal} className="btn-secondary btn-md">{t('settings.users.cancel')}</button>
              <button type="submit" disabled={modalSaving} className="btn-primary btn-md">
                {modalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.users.saving')}</> : t('settings.users.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change password modal */}
      {modal?.type === 'password' && (
        <Modal title={`${t('settings.users.passwordModalTitle')} ${modal.user.name}`} onClose={closeModal}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settings.users.newPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  type="password" value={newPassword} required minLength={6}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input input-with-icon" placeholder={t('settings.users.passwordPlaceholder')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={closeModal} className="btn-secondary btn-md">{t('settings.users.cancel')}</button>
              <button type="submit" disabled={modalSaving} className="btn-primary btn-md">
                {modalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.users.saving')}</> : t('settings.users.change')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {modal?.type === 'delete' && (
        <Modal title={t('settings.users.deleteUser')} onClose={closeModal}>
          <p className="text-sm text-ink-secondary mb-5">
            {t('settings.users.deleteConfirmPrefix')}<span className="font-semibold text-ink">{modal.user.name}</span>{t('settings.users.deleteConfirmSuffix')}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={closeModal} className="btn-secondary btn-md">{t('settings.users.cancel')}</button>
            <button onClick={handleDelete} disabled={modalSaving}
              className="btn-md bg-red-600 text-white hover:bg-red-700 transition-colors rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {modalSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.users.deleting')}</> : t('settings.users.deleteBtn')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const UOM_NAMES = {
  pcs:    { uz: 'Dona',           ru: 'Штука',              en: 'Piece'        },
  kg:     { uz: 'Kilogram',       ru: 'Килограмм',          en: 'Kilogram'     },
  g:      { uz: 'Gram',           ru: 'Грамм',              en: 'Gram'         },
  t:      { uz: 'Tonna',          ru: 'Тонна',              en: 'Ton'          },
  l:      { uz: 'Litr',           ru: 'Литр',               en: 'Liter'        },
  ml:     { uz: 'Millilitr',      ru: 'Миллилитр',          en: 'Milliliter'   },
  m:      { uz: 'Metr',           ru: 'Метр',               en: 'Meter'        },
  cm:     { uz: 'Santimetr',      ru: 'Сантиметр',          en: 'Centimeter'   },
  mm:     { uz: 'Millimetr',      ru: 'Миллиметр',          en: 'Millimeter'   },
  'm²':   { uz: 'Kvadrat metr',   ru: 'Квадратный метр',    en: 'Square meter' },
  'm³':   { uz: 'Kub metr',       ru: 'Кубический метр',    en: 'Cubic meter'  },
  km:     { uz: 'Kilometr',       ru: 'Километр',           en: 'Kilometer'    },
  pair:   { uz: 'Juft',           ru: 'Пара',               en: 'Pair'         },
  roll:   { uz: "O'ram",          ru: 'Рулон',              en: 'Roll'         },
  box:    { uz: 'Quti',           ru: 'Коробка',            en: 'Box'          },
  pack:   { uz: 'Paket',          ru: 'Пакет',              en: 'Package'      },
  bag:    { uz: 'Qop',            ru: 'Мешок',              en: 'Bag'          },
  set:    { uz: 'Komplekt',       ru: 'Комплект',           en: 'Set'          },
  bottle: { uz: 'Shisha',         ru: 'Бутылка',            en: 'Bottle'       },
  can:    { uz: 'Banka',          ru: 'Банка',              en: 'Can'          },
  cyl:    { uz: 'Ballon',         ru: 'Баллон',             en: 'Cylinder'     },
  coil:   { uz: 'Buxta',          ru: 'Бухта',              en: 'Coil'         },
  spool:  { uz: 'Katushka',       ru: 'Катушка',            en: 'Spool'        },
  sheet:  { uz: 'List',           ru: 'Лист',               en: 'Sheet'        },
  bunch:  { uz: 'Pachka',         ru: 'Пачка',              en: 'Bunch'        },
  hr:      { uz: 'Soat',           ru: 'Час',                en: 'Hour'         },
  min:     { uz: 'Daqiqa',        ru: 'Минута',             en: 'Minute'       },
  day:     { uz: 'Kun',           ru: 'День',               en: 'Day'          },
  week:    { uz: 'Hafta',         ru: 'Неделя',             en: 'Week'         },
  month:   { uz: 'Oy',            ru: 'Месяц',              en: 'Month'        },
  year:    { uz: 'Yil',           ru: 'Год',                en: 'Year'         },
  visit:   { uz: 'Tashrif',       ru: 'Визит',              en: 'Visit'        },
  session: { uz: 'Seans',         ru: 'Сеанс',              en: 'Session'      },
  project: { uz: 'Loyiha',        ru: 'Проект',             en: 'Project'      },
  page:    { uz: 'Sahifa',        ru: 'Страница',           en: 'Page'         },
  word:    { uz: "So'z",          ru: 'Слово',              en: 'Word'         },
  trip:    { uz: 'Reys',          ru: 'Рейс',               en: 'Trip'         },
};

// Visual grouping for system UOMs (frontend-only). Order = display order.
// Any system UOM not listed below falls into the "Boshqa" group.
const UOM_GROUPS = [
  { key: 'count',     label: 'Soni',                members: ['pcs', 'pair', 'set', 'bunch'] },
  { key: 'weight',    label: "Og'irlik",            members: ['g', 'kg', 't'] },
  { key: 'length',    label: 'Uzunlik',             members: ['mm', 'cm', 'm', 'km'] },
  { key: 'areaVol',   label: 'Yuza va hajm',        members: ['m²', 'm³'] },
  { key: 'liquid',    label: 'Suyuqlik',            members: ['ml', 'l'] },
  { key: 'packaging', label: 'Qadoq va idish',      members: ['box', 'pack', 'bag', 'bottle', 'can', 'roll', 'sheet', 'cyl', 'coil', 'spool'] },
  { key: 'time',      label: 'Vaqt',                members: ['min', 'hr', 'day', 'week', 'month', 'year'] },
  { key: 'service',   label: 'Xizmat',              members: ['visit', 'session', 'project', 'trip', 'page', 'word'] },
];

/* ─── UOM tab ───────────────────────────────────────────── */
function UOMTab() {
  const t = useT();
  // UI language drives the unit full-names. UOM_NAMES has uz/ru/en; for the
  // Cyrillic UI we reuse the Latin Uzbek names (no separate Cyrillic data set).
  const uiLang = useSelector(s => s.lang?.current) || 'uz';
  const nameLang = uiLang === 'uz-cyrl' ? 'uz' : uiLang;

  const getFullName = (uom) => {
    if (uom.isSystem && UOM_NAMES[uom.shortName]) {
      return UOM_NAMES[uom.shortName][nameLang] || uom.fullName;
    }
    return uom.fullName;
  };

  const [uoms, setUoms]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ shortName: '', fullName: '' });
  const [saving, setSaving]   = useState(false);

  const fetchUOMs = async () => {
    try {
      const res = await axios.get(`${API_URL}/uom`, { params: { all: 1 } });
      setUoms(res.data.uoms);
    } catch {
      toast.error(t('settingsExtra.uom.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Birlikni tizimda ko'rsatish/yashirish (checkbox). Default — hammasi yoqilgan.
  const toggleVisibility = async (u) => {
    const enabled = !u.enabled;
    setUoms(prev => prev.map(x => x._id === u._id ? { ...x, enabled } : x));
    try {
      await axios.put(`${API_URL}/uom/${u._id}/visibility`, { enabled });
    } catch (err) {
      setUoms(prev => prev.map(x => x._id === u._id ? { ...x, enabled: !enabled } : x));
      toast.error(err.response?.data?.message || t('settingsExtra.uom.error'));
    }
  };

  useEffect(() => { fetchUOMs(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_URL}/uom`, form);
      toast.success(t('settingsExtra.uom.added'));
      setForm({ shortName: '', fullName: '' });
      setModal(false);
      fetchUOMs();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settingsExtra.uom.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/uom/${id}`);
      toast.success(t('settingsExtra.uom.deleted'));
      fetchUOMs();
    } catch (err) {
      toast.error(err.response?.data?.message || t('settingsExtra.uom.error'));
    }
  };

  const systemUOMs = uoms.filter(u => u.isSystem);
  const customUOMs  = uoms.filter(u => !u.isSystem);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* "Mening o'lchov birliklarim" (custom) bo'limi yashirilgan — faqat tizim birliklari ishlatiladi. */}

      {/* System UOMs — grouped */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div>
            <h3 className="font-semibold text-ink text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              {t('settingsExtra.uom.systemTitle')}
            </h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settingsExtra.uom.systemSubtitle')}</p>
          </div>
        </div>

        {(() => {
          const byShort = Object.fromEntries(systemUOMs.map(u => [u.shortName, u]));
          const assigned = new Set();
          const groups = UOM_GROUPS.map(g => {
            const items = g.members.map(s => byShort[s]).filter(Boolean);
            items.forEach(u => assigned.add(u.shortName));
            return { ...g, items };
          });
          const other = systemUOMs.filter(u => !assigned.has(u.shortName));
          if (other.length) groups.push({ key: 'other', items: other });

          return (
            <div className="space-y-4">
              {groups.filter(g => g.items.length > 0).map(g => (
                <div key={g.key}>
                  <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wide mb-1.5 px-1">{t('settingsExtra.uom.groups.' + g.key)}</p>
                  <div className="card overflow-hidden">
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="w-32">{t('settingsExtra.uom.thShort')}</th>
                          <th>{t('settingsExtra.uom.thFull')}</th>
                          <th className="w-28 text-center">{t('settingsExtra.uom.thVisible')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items.map(u => (
                          <tr key={u._id}>
                            <td><span className="font-mono font-semibold text-ink">{u.shortName}</span></td>
                            <td className="text-ink-secondary">{getFullName(u)}</td>
                            <td className="text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer" title={t('settingsExtra.uom.visibleHint')}>
                                <input type="checkbox" className="w-4 h-4 rounded accent-primary-600"
                                  checked={u.enabled !== false}
                                  onChange={() => toggleVisibility(u)} />
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Add modal */}
      {modal && (
        <Modal title={t('settingsExtra.uom.newUnit')} onClose={() => setModal(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.uom.shortName')}</label>
              <input
                type="text"
                value={form.shortName}
                onChange={e => setForm(p => ({ ...p, shortName: e.target.value }))}
                className="input font-mono"
                placeholder={t('settingsExtra.uom.shortNamePlaceholder')}
                required
                autoFocus
              />
              <p className="text-xs text-ink-tertiary mt-1">{t('settingsExtra.uom.shortNameHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.uom.fullName')}</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="input"
                placeholder={t('settingsExtra.uom.fullNamePlaceholder')}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary btn-md">{t('settingsExtra.uom.cancel')}</button>
              <button type="submit" disabled={saving} className="btn-primary btn-md">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settingsExtra.uom.saving')}</> : t('settingsExtra.uom.addBtn')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ─── Currencies tab ─────────────────────────────────────── */
function CurrenciesTab() {
  const t = useT();
  const dispatch = useDispatch();
  const curName = (code) => t('settings.currencies.names.' + code);
  const [baseCurrency, setBaseCurrency]   = useState(null); // code string
  const [additional, setAdditional]       = useState([]);   // [{code,name,symbol,rate}]
  const [loaded, setLoaded]               = useState(false);
  const [saving, setSaving]               = useState(false);
  const [isDirty, setIsDirty]             = useState(false);
  const [modal, setModal]                 = useState(null);
  const [pickSearch, setPickSearch]       = useState('');
  const [pickSelected, setPickSelected]   = useState(null);
  const [rateInput, setRateInput]         = useState('');
  const [bankRates, setBankRates]         = useState({});   // CBU: { USD: 12650.5, ... } (so'mda)
  const [bankDate, setBankDate]           = useState('');
  const [bankErr, setBankErr]             = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/organization`).then(res => {
      const org = res.data.organization;
      setBaseCurrency(org.currency || null);
      setAdditional(org.additionalCurrencies || []);
      setLoaded(true);
    });
    axios.get(`${API_URL}/organization/cbu-rates`)
      .then(res => { setBankRates(res.data.rates || {}); setBankDate(res.data.date || ''); })
      .catch(() => setBankErr(true));
  }, []);

  // CBU kursi so'mda. Baza valyutaga nisbatan: 1 CODE = (cbu[code] / cbu[base]) base.
  const cbuOf = (code) => code === 'UZS' ? 1 : Number(bankRates[code] || 0);
  const bankRateInBase = (code) => {
    const c = cbuOf(code), b = cbuOf(baseCurrency);
    if (!c || !b) return null;
    return c / b;
  };
  const fmtRate = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

  // "Bank kursi" checkbox — yoqilsa kursni CBU'dan oladi (saqlashda yangilanadi).
  const toggleBankRate = (code) => {
    setAdditional(prev => prev.map(c => {
      if (c.code !== code) return c;
      const on = !c.useBankRate;
      const br = bankRateInBase(code);
      return { ...c, useBankRate: on, rate: (on && br) ? br : c.rate };
    }));
    setIsDirty(true);
  };

  const baseCurrencyInfo = baseCurrency ? ALL_CURRENCIES.find(c => c.code === baseCurrency) : null;

  const usedCodes = new Set([
    ...(baseCurrency ? [baseCurrency] : []),
    ...additional.map(c => c.code),
  ]);

  const filteredList = ALL_CURRENCIES.filter(c => {
    if (usedCodes.has(c.code)) return false;
    if (!pickSearch) return true;
    const q = pickSearch.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || curName(c.code).toLowerCase().includes(q);
  });

  const openPickBase = () => { setPickSearch(''); setModal({ type: 'pick', mode: 'base' }); };
  const openAddCurrency = () => { setPickSearch(''); setPickSelected(null); setRateInput(''); setModal({ type: 'pick', mode: 'add' }); };
  const closeModal = () => setModal(null);

  const handlePickCurrency = (c) => {
    if (modal.mode === 'base') {
      setBaseCurrency(c.code);
      setIsDirty(true);
      closeModal();
    } else {
      setPickSelected(c);
      setRateInput('');
      setModal({ type: 'rate', currency: c });
    }
  };

  const handleAddWithRate = () => {
    const r = Number(rateInput);
    if (!rateInput || isNaN(r) || r <= 0) { toast.error(t('settings.currencies.rateInvalid')); return; }
    setAdditional(prev => [...prev, { ...pickSelected, rate: r }]);
    setIsDirty(true);
    closeModal();
  };

  const handleEditRate = (c) => { setRateInput(String(c.rate)); setModal({ type: 'edit-rate', currency: c }); };

  const handleSaveRate = () => {
    const r = Number(rateInput);
    if (!rateInput || isNaN(r) || r <= 0) { toast.error(t('settings.currencies.rateInvalid')); return; }
    setAdditional(prev => prev.map(c => c.code === modal.currency.code ? { ...c, rate: r } : c));
    setIsDirty(true);
    closeModal();
  };

  const handleRemove = (code) => { setAdditional(prev => prev.filter(c => c.code !== code)); setIsDirty(true); };

  const handleSave = async () => {
    if (!baseCurrency) { toast.error(t('settings.currencies.baseFirst')); return; }
    setSaving(true);
    try {
      await axios.put(`${API_URL}/organization/currencies`, { currency: baseCurrency, additionalCurrencies: additional });
      toast.success(t('settings.currencies.saved'));
      setIsDirty(false);
      dispatch(setOrganization({ currency: baseCurrency, additionalCurrencies: additional.map(c => ({ code: c.code, rate: c.rate })) }));
    } catch {
      toast.error(t('settings.currencies.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Base currency */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-ink text-sm">{t('settings.currencies.baseTitle')}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.currencies.baseSubtitle')}</p>
          </div>
          {baseCurrencyInfo && (
            <button onClick={openPickBase} className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
              {t('settings.currencies.change')}
            </button>
          )}
        </div>

        {baseCurrencyInfo ? (
          <div className="card card-body flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {baseCurrencyInfo.symbol}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-ink">{baseCurrencyInfo.code}</p>
              <p className="text-xs text-ink-tertiary">{curName(baseCurrencyInfo.code)}</p>
            </div>
            <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">{t('settings.currencies.baseTag')}</span>
          </div>
        ) : (
          <button
            onClick={openPickBase}
            className="w-full card card-body flex items-center gap-3 text-left hover:bg-surface-50 transition-colors border-2 border-dashed border-surface-200"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-ink-tertiary" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{t('settings.currencies.basePickTitle')}</p>
              <p className="text-xs text-ink-tertiary">{t('settings.currencies.basePickHint')}</p>
            </div>
          </button>
        )}
      </div>

      {/* Additional currencies */}
      {baseCurrencyInfo && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-ink text-sm">{t('settings.currencies.addTitle')}</h3>
              <p className="text-xs text-ink-tertiary mt-0.5">{t('settings.currencies.addSubtitle')}</p>
              {bankDate && <p className="text-[11px] text-ink-tertiary mt-0.5">{t('settings.currencies.bankSource')} <span className="font-medium">{bankDate}</span></p>}
              {bankErr && <p className="text-[11px] text-amber-600 mt-0.5">{t('settings.currencies.bankError')}</p>}
            </div>
            <button
              onClick={openAddCurrency}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('settings.currencies.add')}
            </button>
          </div>

          {additional.length === 0 ? (
            <div className="card card-body text-center py-8">
              <p className="text-sm text-ink-tertiary">{t('settings.currencies.empty')}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {additional.map((c, i) => {
                const br = bankRateInBase(c.code);
                return (
                <div key={c.code} className={`flex items-center gap-3 px-5 py-3.5 ${i < additional.length - 1 ? 'border-b border-surface-100' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center text-sm font-bold text-ink-secondary shrink-0">
                    {c.symbol}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm">{c.code}</p>
                    <p className="text-xs text-ink-tertiary truncate">{curName(c.code)}</p>
                    {br != null && (
                      <p className="text-[11px] text-ink-tertiary mt-0.5">
                        {t('settings.currencies.bankRate')} <span className="font-mono text-ink-secondary">1 {c.code} = {fmtRate(br)} {baseCurrency}</span>
                      </p>
                    )}
                  </div>
                  {br != null && (
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary cursor-pointer shrink-0 select-none"
                      title={t('settings.currencies.bankRateHint')}>
                      <input type="checkbox" className="accent-primary-600 w-3.5 h-3.5"
                        checked={!!c.useBankRate} onChange={() => toggleBankRate(c.code)} />
                      {t('settings.currencies.useBankRate')}
                    </label>
                  )}
                  <button
                    onClick={() => !c.useBankRate && handleEditRate(c)}
                    disabled={!!c.useBankRate}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-mono whitespace-nowrap ${c.useBankRate ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'text-ink-secondary hover:text-ink bg-surface-50 hover:bg-surface-100'}`}
                    title={c.useBankRate ? t('settings.currencies.bankRateOn') : t('settings.currencies.editRateTooltip')}
                  >
                    1 {c.code} = {fmtRate(c.rate)} {baseCurrency}
                  </button>
                  <button
                    onClick={() => handleRemove(c.code)}
                    className="p-1.5 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {baseCurrencyInfo && isDirty && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.currencies.saving')}</> : t('settings.currencies.save')}
          </button>
        </div>
      )}

      {/* Currency picker modal */}
      {modal?.type === 'pick' && (
        <Modal
          title={modal.mode === 'base' ? t('settings.currencies.pickBaseModal') : t('settings.currencies.pickAddModal')}
          onClose={closeModal}
        >
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
              <input
                type="text"
                value={pickSearch}
                onChange={e => setPickSearch(e.target.value)}
                className="input input-with-icon"
                placeholder={t('settings.currencies.searchPlaceholder')}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto -mx-6 px-3 space-y-0.5">
              {filteredList.length === 0 ? (
                <p className="text-sm text-ink-tertiary text-center py-6">{t('settings.currencies.notFound')}</p>
              ) : filteredList.map(c => (
                <button
                  key={c.code}
                  onClick={() => handlePickCurrency(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-xs font-bold text-ink-secondary shrink-0">
                    {c.symbol}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">{c.code}</p>
                    <p className="text-xs text-ink-tertiary truncate">{curName(c.code)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Rate input modal (adding new currency) */}
      {modal?.type === 'rate' && (
        <Modal title={`${t('settings.currencies.rateModalTitle')} ${modal.currency.code}`} onClose={closeModal}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center text-sm font-bold text-ink-secondary shrink-0">
                {modal.currency.symbol}
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">{modal.currency.code}</p>
                <p className="text-xs text-ink-tertiary">{curName(modal.currency.code)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                1 {modal.currency.code} = ? {baseCurrency}
              </label>
              <input
                type="number" value={rateInput} onChange={e => setRateInput(e.target.value)}
                className="input" placeholder={t('settings.currencies.ratePlaceholder')}
                min="0" step="any" autoFocus
              />
              <p className="text-xs text-ink-tertiary mt-1.5">
                {t('settings.currencies.rateHint', { code: modal.currency.code, base: baseCurrency })}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary btn-md">{t('settings.currencies.cancel')}</button>
              <button onClick={handleAddWithRate} className="btn-primary btn-md">{t('settings.currencies.addBtn')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit rate modal */}
      {modal?.type === 'edit-rate' && (
        <Modal title={`${t('settings.currencies.editRateModalTitle')} ${modal.currency.code}`} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                1 {modal.currency.code} = ? {baseCurrency}
              </label>
              <input
                type="number" value={rateInput} onChange={e => setRateInput(e.target.value)}
                className="input" min="0" step="any" autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary btn-md">{t('settings.currencies.cancel')}</button>
              <button onClick={handleSaveRate} className="btn-primary btn-md">{t('settings.currencies.save')}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Korxona tab (Filiallar + Bo'limlar sub-modullari) ──── */
const COMPANY_SUBTABS = [
  { key: 'branches',    icon: Building,  label: 'Filiallar' },
  { key: 'departments', icon: Building2, label: "Bo'limlar" },
];

function CompanyTab() {
  const t = useT();
  const subLabel = (k) => t(k === 'branches' ? 'settingsExtra.company.subBranches' : 'settingsExtra.company.subDepartments');
  const [sub, setSub] = useState('branches');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg w-fit">
        {COMPANY_SUBTABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              sub === key
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Icon className="w-4 h-4" />
            {subLabel(key)}
          </button>
        ))}
      </div>
      {sub === 'branches'    && <BranchesTab />}
      {sub === 'departments' && <DepartmentsTab />}
    </div>
  );
}

/* ─── Branches (Filiallar) sub-tab ───────────────────────── */
function BranchesTab() {
  const t = useT();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // null | { branch: null|obj }
  const [form, setForm]         = useState({ name: '' });
  const [saving, setSaving]     = useState(false);
  const [delModal, setDelModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_URL}/branches`);
      setItems(r.data.branches || []);
    } catch { toast.error(t('settingsExtra.company.branches.loadError')); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew  = () => { setForm({ name: '' }); setModal({ branch: null }); };
  const openEdit = (b) => { setForm({ name: b.name }); setModal({ branch: b }); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error(t('settingsExtra.company.branches.nameRequired'));
    setSaving(true);
    try {
      if (modal.branch) {
        await axios.put(`${API_URL}/branches/${modal.branch._id}`, form);
        toast.success(t('settingsExtra.company.branches.updated'));
      } else {
        await axios.post(`${API_URL}/branches`, form);
        toast.success(t('settingsExtra.company.branches.added'));
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsExtra.company.branches.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/branches/${delModal._id}`);
      toast.success(t('settingsExtra.company.branches.deleted'));
      setDelModal(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || t('settingsExtra.company.branches.error')); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">{t('settingsExtra.company.branches.title')}</h3>
          <p className="text-ink-tertiary text-sm mt-0.5">{t('settingsExtra.company.branches.subtitle')}</p>
        </div>
        <button onClick={openNew} className="btn-primary btn-md flex items-center gap-2"><Plus className="w-4 h-4" /> {t('settingsExtra.company.branches.add')}</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-ink-tertiary text-sm">{t('settingsExtra.company.branches.empty')}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3 w-10">#</th>
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.branches.thName')}</th>
                <th className="text-right text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.branches.thActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((b, i) => (
                <tr key={b._id} className="hover:bg-surface-50">
                  <td className="px-4 py-2.5 text-xs text-ink-disabled">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-ink">{b.name}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDelModal(b)} className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.branch ? t('settingsExtra.company.branches.editBranch') : t('settingsExtra.company.branches.newBranch')} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.company.branches.name')}</label>
              <input className="input" autoFocus required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('settingsExtra.company.branches.namePlaceholder')} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary btn-md">{t('settingsExtra.company.branches.cancel')}</button>
              <button type="submit" disabled={saving} className="btn-primary btn-md flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('settingsExtra.company.branches.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {delModal && (
        <Modal title={t('settingsExtra.company.branches.deleteTitle')} onClose={() => setDelModal(null)}>
          <p className="text-sm text-ink-secondary mb-5">
            <span className="font-semibold text-ink">"{delModal.name}"</span> {t('settingsExtra.company.branches.deleteSuffix')}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDelModal(null)} className="btn-secondary btn-md">{t('settingsExtra.company.branches.cancel')}</button>
            <button onClick={handleDelete} className="btn-md bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-medium">{t('settingsExtra.company.branches.deleteBtn')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Departments tab ────────────────────────────────────── */
function DepartmentsTab() {
  const t = useT();
  const [items, setItems]       = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);   // null | { dept: null|obj }
  const [form, setForm]         = useState({ name: '', branch: '', type: 'process' });
  const [saving, setSaving]     = useState(false);
  const [delModal, setDelModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, b] = await Promise.all([
        axios.get(`${API_URL}/departments`),
        axios.get(`${API_URL}/branches`),
      ]);
      setItems(d.data.departments || []);
      setBranches(b.data.branches || []);
    } catch { toast.error(t('settingsExtra.company.departments.loadError')); }
    finally  { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew  = () => { setForm({ name: '', branch: '', type: 'process' }); setModal({ dept: null }); };
  const openEdit = (d) => { setForm({ name: d.name, branch: d.branch?._id || d.branch || '', type: d.type || 'process' }); setModal({ dept: d }); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error(t('settingsExtra.company.departments.nameRequired') || 'Nom kiritilishi shart');
    const payload = { name: form.name, branch: form.branch || null, type: form.type || 'process' };
    setSaving(true);
    try {
      if (modal.dept) {
        await axios.put(`${API_URL}/departments/${modal.dept._id}`, payload);
        toast.success(t('settingsExtra.company.departments.updated'));
      } else {
        await axios.post(`${API_URL}/departments`, payload);
        toast.success(t('settingsExtra.company.departments.added'));
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsExtra.company.departments.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/departments/${delModal._id}`);
      toast.success(t('settingsExtra.company.departments.deleted'));
      setDelModal(null);
      load();
    } catch (e) { toast.error(e.response?.data?.message || t('settingsExtra.company.departments.error')); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-ink">{t('settingsExtra.company.departments.title')}</h3>
          <p className="text-ink-tertiary text-sm mt-0.5">{t('settingsExtra.company.departments.subtitle')}</p>
        </div>
        <button onClick={openNew} className="btn-primary btn-md flex items-center gap-2"><Plus className="w-4 h-4" /> {t('settingsExtra.company.departments.add')}</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-ink-tertiary text-sm">{t('settingsExtra.company.departments.empty')}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3 w-10">#</th>
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.departments.thName')}</th>
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.departments.thType')}</th>
                <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.departments.thBranch')}</th>
                <th className="text-right text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.company.departments.thActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {items.map((d, i) => (
                <tr key={d._id} className="hover:bg-surface-50">
                  <td className="px-4 py-2.5 text-xs text-ink-disabled">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-ink">{d.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${(d.type || 'process') === 'management' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {t('settingsExtra.company.departments.' + ((d.type || 'process') === 'management' ? 'typeManagement' : 'typeProcess'))}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-ink-secondary">{d.branch?.name || <span className="text-ink-disabled">—</span>}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-100"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDelModal(d)} className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal.dept ? t('settingsExtra.company.departments.editDept') : t('settingsExtra.company.departments.newDept')} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.company.departments.name')}</label>
              <input className="input" autoFocus required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('settingsExtra.company.departments.namePlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.company.departments.branch')}</label>
              <select className="input" value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}>
                <option value="">{t('settingsExtra.company.departments.branchNone')}</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('settingsExtra.company.departments.type')}</label>
              <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="process">{t('settingsExtra.company.departments.typeProcess')}</option>
                <option value="management">{t('settingsExtra.company.departments.typeManagement')}</option>
              </select>
              <p className="text-[11px] text-ink-tertiary mt-1">{t('settingsExtra.company.departments.typeHint')}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary btn-md">{t('settingsExtra.company.departments.cancel')}</button>
              <button type="submit" disabled={saving} className="btn-primary btn-md flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('settingsExtra.company.departments.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {delModal && (
        <Modal title={t('settingsExtra.company.departments.deleteTitle')} onClose={() => setDelModal(null)}>
          <p className="text-sm text-ink-secondary mb-5">
            <span className="font-semibold text-ink">"{delModal.name}"</span> {t('settingsExtra.company.departments.deleteSuffix')}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDelModal(null)} className="btn-secondary btn-md">{t('settingsExtra.company.departments.cancel')}</button>
            <button onClick={handleDelete} className="btn-md bg-red-600 text-white hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-medium">{t('settingsExtra.company.departments.deleteBtn')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Assets settings tab ───────────────────────────────── */
function AssetsSettingsTab() {
  const t = useT();
  const [cats,        setCats]        = useState([]);
  const [statuses,    setStatuses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [catForm,     setCatForm]     = useState(null);   // null | { _id?, name, color }
  const [statusForm,  setStatusForm]  = useState(null);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/assets/categories`),
      axios.get(`${API_URL}/assets/statuses`),
    ]).then(([cr, sr]) => {
      setCats(cr.data.categories || []);
      setStatuses(sr.data.statuses || []);
    }).finally(() => setLoading(false));
  }, []);

  /* ── Categories ── */
  const openNewCat    = () => setCatForm({ name: '', color: '#6366f1' });
  const openEditCat   = (c) => setCatForm({ _id: c._id, name: c.name, color: c.color });
  const cancelCatForm = () => setCatForm(null);

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error(t('settingsAssets.namePlaceholder')); return; }
    setSaving(true);
    try {
      if (catForm._id) {
        const r = await axios.put(`${API_URL}/assets/categories/${catForm._id}`, { name: catForm.name.trim(), color: catForm.color });
        setCats(p => p.map(c => c._id === catForm._id ? r.data.category : c));
        toast.success(t('settingsAssets.saved'));
      } else {
        const r = await axios.post(`${API_URL}/assets/categories`, { name: catForm.name.trim(), color: catForm.color });
        setCats(p => [...p, r.data.category]);
        toast.success(t('settingsAssets.created'));
      }
      setCatForm(null);
    } catch (e) {
      toast.error(e.response?.data?.message === 'Bu nom allaqachon mavjud' ? t('settingsAssets.dupError') : 'Xatolik');
    } finally { setSaving(false); }
  };

  const deleteCat = async (id) => {
    if (!window.confirm('O\'chirishni tasdiqlaysizmi?')) return;
    try {
      await axios.delete(`${API_URL}/assets/categories/${id}`);
      setCats(p => p.filter(c => c._id !== id));
      toast.success(t('settingsAssets.deleted'));
    } catch { toast.error('Xatolik'); }
  };

  /* ── Statuses ── */
  const openNewStatus    = () => setStatusForm({ name: '', color: '#22c55e' });
  const openEditStatus   = (s) => setStatusForm({ _id: s._id, name: s.name, color: s.color });
  const cancelStatusForm = () => setStatusForm(null);

  const saveStatus = async () => {
    if (!statusForm.name.trim()) { toast.error(t('settingsAssets.namePlaceholder')); return; }
    setSaving(true);
    try {
      if (statusForm._id) {
        const r = await axios.put(`${API_URL}/assets/statuses/${statusForm._id}`, { name: statusForm.name.trim(), color: statusForm.color });
        setStatuses(p => p.map(s => s._id === statusForm._id ? r.data.status : s));
        toast.success(t('settingsAssets.saved'));
      } else {
        const r = await axios.post(`${API_URL}/assets/statuses`, { name: statusForm.name.trim(), color: statusForm.color });
        setStatuses(p => [...p, r.data.status]);
        toast.success(t('settingsAssets.created'));
      }
      setStatusForm(null);
    } catch (e) {
      toast.error(e.response?.data?.message === 'Bu nom allaqachon mavjud' ? t('settingsAssets.dupError') : 'Xatolik');
    } finally { setSaving(false); }
  };

  const deleteStatus = async (id) => {
    if (!window.confirm('O\'chirishni tasdiqlaysizmi?')) return;
    try {
      await axios.delete(`${API_URL}/assets/statuses/${id}`);
      setStatuses(p => p.filter(s => s._id !== id));
      toast.success(t('settingsAssets.deleted'));
    } catch { toast.error('Xatolik'); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-8 max-w-xl">
      {/* Categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('settingsAssets.catTitle')}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settingsAssets.catSubtitle')}</p>
          </div>
          {!catForm && (
            <button onClick={openNewCat} className="btn-primary btn-md flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> {t('settingsAssets.addCatBtn')}
            </button>
          )}
        </div>

        {/* Inline add/edit form */}
        {catForm && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-ink-secondary">{t('settingsAssets.colorLabel')}</label>
              <input type="color" value={catForm.color}
                onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
                className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5 bg-white" />
            </div>
            <div className="flex-1 min-w-40">
              <input className="input" placeholder={t('settingsAssets.namePlaceholder')}
                value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveCat()}
                autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={cancelCatForm} disabled={saving} className="btn-secondary btn-md">{t('settingsAssets.cancelBtn')}</button>
              <button onClick={saveCat} disabled={saving}
                className="btn-primary btn-md flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('settingsAssets.saveBtn')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
          {cats.length === 0 ? (
            <p className="text-sm text-ink-tertiary text-center py-8">{t('settingsAssets.noCats')}</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {cats.map(c => (
                <div key={c._id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="flex-1 text-sm font-medium text-ink">{c.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditCat(c)}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100 hover:text-primary-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteCat(c._id)}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Statuses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">{t('settingsAssets.statusTitle')}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t('settingsAssets.statusSubtitle')}</p>
          </div>
          {!statusForm && (
            <button onClick={openNewStatus} className="btn-primary btn-md flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> {t('settingsAssets.addStatusBtn')}
            </button>
          )}
        </div>

        {/* Inline add/edit form */}
        {statusForm && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-ink-secondary">{t('settingsAssets.colorLabel')}</label>
              <input type="color" value={statusForm.color}
                onChange={e => setStatusForm(p => ({ ...p, color: e.target.value }))}
                className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5 bg-white" />
            </div>
            <div className="flex-1 min-w-40">
              <input className="input" placeholder={t('settingsAssets.namePlaceholder')}
                value={statusForm.name} onChange={e => setStatusForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveStatus()}
                autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={cancelStatusForm} disabled={saving} className="btn-secondary btn-md">{t('settingsAssets.cancelBtn')}</button>
              <button onClick={saveStatus} disabled={saving}
                className="btn-primary btn-md flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t('settingsAssets.saveBtn')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
          {statuses.length === 0 ? (
            <p className="text-sm text-ink-tertiary text-center py-8">{t('settingsAssets.noStatuses')}</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {statuses.map(s => (
                <div key={s._id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditStatus(s)}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100 hover:text-primary-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteStatus(s._id)}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Trash (Korzina) tab ────────────────────────────────── */
function TrashTab() {
  const t = useT();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [meta, setMeta]       = useState({ pages: 1, total: 0, limit: 20 });
  const [retention, setRetention] = useState(30);
  const [savingRet, setSavingRet] = useState(false);
  const [search, setSearch]   = useState('');
  const [kind, setKind]       = useState('');     // tur (model) bo'yicha filtr
  const [deletedBy, setDeletedBy] = useState(''); // kim o'chirgani bo'yicha filtr
  const [deleters, setDeleters]   = useState([]); // filtr dropdowni uchun userlar
  const [busyId, setBusyId]   = useState(null);   // id being restored/deleted
  const [modal, setModal]     = useState(null);   // { item } pending permanent delete

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search.trim()) params.search = search.trim();
      if (kind) params.kind = kind;
      if (deletedBy) params.deletedBy = deletedBy;
      const r = await axios.get(`${API_URL}/trash`, { params });
      setItems(r.data.items || []);
      setRetention(r.data.retentionDays || 30);
      setDeleters(r.data.deleters || []);
      setMeta({ pages: r.data.pages || 1, total: r.data.total || 0, limit: r.data.limit || 20 });
    } catch {
      toast.error(t('settingsExtra.trash.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrash(); /* eslint-disable-next-line */ }, [page, kind, deletedBy]);

  const onSearch = (e) => { e.preventDefault(); if (page !== 1) setPage(1); else fetchTrash(); };

  const restore = async (item) => {
    setBusyId(item._id);
    try {
      await axios.post(`${API_URL}/trash/${item._id}/restore`);
      toast.success(t('settingsExtra.trash.restored'));
      // if last row on a page > 1, step back so we don't land on an empty page
      if (items.length === 1 && page > 1) setPage(p => p - 1); else fetchTrash();
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsExtra.trash.restoreError'));
    } finally { setBusyId(null); }
  };

  const permanentDelete = async () => {
    const item = modal.item;
    setBusyId(item._id);
    try {
      await axios.delete(`${API_URL}/trash/${item._id}`);
      toast.success(t('settingsExtra.trash.permDeleted'));
      setModal(null);
      if (items.length === 1 && page > 1) setPage(p => p - 1); else fetchTrash();
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsExtra.trash.deleteError'));
    } finally { setBusyId(null); }
  };

  const saveRetention = async (val) => {
    const prev = retention;
    setRetention(val);            // optimistik
    setSavingRet(true);
    try {
      await axios.put(`${API_URL}/organization/settings`, { trashRetentionDays: val });
      toast.success(t('settingsExtra.trash.retentionSaved'));
    } catch (e) {
      setRetention(prev);
      toast.error(e.response?.data?.message || t('settingsExtra.trash.loadError'));
    } finally { setSavingRet(false); }
  };

  // Hujjat turi yorlig'i — i18n dan (TRASH_KIND faqat rang uchun)
  const kindLabel = (k) => TRASH_KIND[k] ? t('settingsExtra.trash.kinds.' + k) : (k || '');

  const fmtDate = formatDateTime;
  const RETENTION_OPTS = [30, 60, 90, 180, 365];
  const daysLeft = (deletedAt) => {
    if (!retention || retention <= 0) return null;   // hech qachon o'chmaydi
    const gone = new Date(deletedAt).getTime() + retention * 86400000;
    return Math.max(0, Math.ceil((gone - Date.now()) / 86400000));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-ink">{t('settingsExtra.trash.title')}</h3>
          <p className="text-ink-tertiary text-sm mt-0.5">
            {t('settingsExtra.trash.subtitlePrefix')} ({meta.total}).{' '}
            {(!retention || retention <= 0)
              ? t('settingsExtra.trash.subtitleNever')
              : <>{retention} {t('settingsExtra.trash.subtitleSuffix')}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-ink-tertiary">{t('settingsExtra.trash.retentionLabel')}:</label>
          <Dropdown value={retention} disabled={savingRet} className="w-36"
            options={[
              ...RETENTION_OPTS.map(d => ({ value: d, label: `${d} ${t('settingsExtra.trash.daysSuffix')}` })),
              ...((!RETENTION_OPTS.includes(retention) && retention > 0) ? [{ value: retention, label: `${retention} ${t('settingsExtra.trash.daysSuffix')}` }] : []),
              { value: 0, label: t('settingsExtra.trash.never') },
            ]}
            onChange={(v) => saveRetention(Number(v))} />
          <Dropdown value={kind} placeholder={t('settingsExtra.trash.allTypes')}
            className="w-44"
            options={[{ value: '', label: t('settingsExtra.trash.allTypes') }, ...Object.entries(TRASH_KIND).map(([k, v]) => ({ value: k, label: kindLabel(k), color: v.color }))]}
            onChange={(v) => { setKind(v); setPage(1); }} />
          <Dropdown value={deletedBy} placeholder={t('settingsExtra.trash.allUsers')} searchable
            className="w-44"
            options={[{ value: '', label: t('settingsExtra.trash.allUsers') }, ...deleters.map(d => ({ value: d.id, label: d.name }))]}
            onChange={(v) => { setDeletedBy(v); setPage(1); }} />
          <form onSubmit={onSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
            <input className="input input-with-icon w-56" placeholder={t('settingsExtra.trash.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
          </form>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-ink-tertiary text-sm">{t('settingsExtra.trash.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thType')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thNumber')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thName')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thDeletedBy')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thDate')}</th>
                  <th className="text-left text-xs font-medium text-ink-tertiary px-4 py-3">{t('settingsExtra.trash.thLeft')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.map(it => {
                  const k = { label: kindLabel(it.kind) || it.model, color: TRASH_KIND[it.kind]?.color || '#94a3b8' };
                  const left = daysLeft(it.deletedAt);
                  const busy = busyId === it._id;
                  return (
                    <tr key={it._id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: k.color + '20', color: k.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: k.color }} />{k.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-ink-secondary">{it.number ? `№${it.number}` : '—'}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-ink">{it.label || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-ink-secondary">{it.deletedByName || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-ink-secondary whitespace-nowrap font-mono">{fmtDate(it.deletedAt)}</td>
                      <td className="px-4 py-2.5">
                        {left === null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <Lock className="w-3 h-3" />{t('settingsExtra.trash.neverMark')}
                          </span>
                        ) : (
                          <span className={`text-xs font-medium ${left <= 3 ? 'text-red-600' : 'text-ink-tertiary'}`}>{left} {t('settingsExtra.trash.daysSuffix')}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => restore(it)} disabled={busy}
                            className="p-1.5 text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                            title={t('settingsExtra.trash.restoreTitle')}>
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setModal({ item: it })} disabled={busy}
                            className="p-1.5 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title={t('settingsExtra.trash.permDeleteTitle')}>
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
        )}
        <Pagination page={page} pages={meta.pages} total={meta.total} limit={meta.limit} onPage={setPage} />
      </div>

      {modal && (
        <Modal title={t('settingsExtra.trash.modalTitle')} onClose={() => setModal(null)}>
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <p className="text-sm text-ink-secondary">
              <span className="font-semibold text-ink">{kindLabel(modal.item.kind) || modal.item.model}{modal.item.number ? ` №${modal.item.number}` : ''}</span>{' '}
              {t('settingsExtra.trash.confirmSuffix')}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="btn-secondary btn-md">{t('settingsExtra.trash.cancel')}</button>
            <button onClick={permanentDelete} disabled={busyId === modal.item._id}
              className="btn-md bg-red-600 text-white hover:bg-red-700 transition-colors rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {busyId === modal.item._id ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('settingsExtra.trash.deleting')}</> : t('settingsExtra.trash.permDeleteBtn')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Roles tab (RBAC) ───────────────────────────────────── */
const ROLE_ACTIONS = ['view', 'create', 'edit', 'delete'];
// Leaf nav keys (childless top-level items + every child) — actions apply here.
const NAV_LEAVES = NAV_ITEMS.flatMap(i => (i.children ? i.children.map(c => c.key) : [i.key]));

function RoleModal({ initial, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(initial?._id);
  const [name, setName] = useState(initial?.name || '');
  const [modules, setModules] = useState(() => new Set(initial?.modules || ['dashboard']));
  const [actions, setActions] = useState(() => ({ ...(initial?.actions || {}) }));
  const [hiddenData, setHiddenData] = useState(() => new Set(initial?.hiddenData || []));
  const [ownOnly, setOwnOnly] = useState(() => new Set(initial?.ownOnly || []));
  const [saving, setSaving] = useState(false);

  const hasModule = (key) => modules.has(key);
  const toggleModule = (key, on) => setModules(prev => {
    const next = new Set(prev);
    on ? next.add(key) : next.delete(key);
    return next;
  });
  // Leaf checkbox: toggle the key; turning a child on also enables its parent group.
  const toggleLeaf = (key, parentKey) => {
    const on = !modules.has(key);
    setModules(prev => {
      const next = new Set(prev);
      if (on) { next.add(key); if (parentKey) next.add(parentKey); }
      else next.delete(key);
      return next;
    });
  };
  // Parent "select all": toggles the parent + all its children together.
  const parentAllOn = (item) => item.children.every(c => modules.has(c.key));
  const toggleParent = (item) => {
    const on = !parentAllOn(item);
    setModules(prev => {
      const next = new Set(prev);
      if (on) { next.add(item.key); item.children.forEach(c => next.add(c.key)); }
      else { next.delete(item.key); item.children.forEach(c => next.delete(c.key)); }
      return next;
    });
  };

  // Effective action value: explicit if set, else 'view' is allowed by default.
  const actionOn = (key, act) => {
    const a = actions[key];
    if (!a) return act === 'view';
    return !!a[act];
  };
  const toggleAction = (key, act) => setActions(prev => {
    const cur = prev[key] || { view: true, create: false, edit: false, delete: false };
    return { ...prev, [key]: { ...cur, [act]: !cur[act] } };
  });

  const toggleFlag = (flag) => setHiddenData(prev => {
    const next = new Set(prev);
    next.has(flag) ? next.delete(flag) : next.add(flag);
    return next;
  });

  const toggleOwn = (scope) => setOwnOnly(prev => {
    const next = new Set(prev);
    next.has(scope) ? next.delete(scope) : next.add(scope);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('roles.nameRequired'));
    setSaving(true);
    const mods = new Set(modules); mods.add('dashboard');   // dashboard always visible
    // Keep only action entries for selected leaf modules.
    const cleanActions = {};
    Object.keys(actions).forEach(k => { if (mods.has(k)) cleanActions[k] = actions[k]; });
    const payload = { name: name.trim(), modules: [...mods], actions: cleanActions, hiddenData: [...hiddenData], ownOnly: [...ownOnly] };
    try {
      if (isEdit) await axios.put(`${API_URL}/organization/roles/${initial._id}`, payload);
      else await axios.post(`${API_URL}/organization/roles`, payload);
      toast.success(isEdit ? t('roles.updated') : t('roles.added'));
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || t('roles.genericError'));
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <h3 className="font-semibold text-ink">{isEdit ? t('roles.editRole') : t('roles.addRole')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">{t('roles.name')}</label>
            <input className="input max-w-sm" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('roles.namePlaceholder')} autoFocus />
          </div>

          {/* Module matrix + actions */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">{t('roles.modulesSection')}</p>
            <div className="border border-surface-200 rounded-xl divide-y divide-surface-100">
              {/* header */}
              <div className="hidden sm:flex items-center px-3 py-1.5 bg-surface-50 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide">
                <span className="flex-1">{t('roles.module')}</span>
                {ROLE_ACTIONS.map(a => <span key={a} className="w-12 text-center">{t('roles.action' + a[0].toUpperCase() + a.slice(1))}</span>)}
              </div>
              {NAV_ITEMS.map(item => {
                const locked = item.key === 'dashboard';
                if (!item.children) {
                  const checked = hasModule(item.key) || locked;
                  return (
                    <div key={item.key} className="flex items-center px-3 py-2 gap-2">
                      <label className="flex-1 flex items-center gap-2 cursor-pointer min-w-0">
                        <input type="checkbox" className="accent-primary-600 w-4 h-4 rounded" checked={checked} disabled={locked}
                          onChange={() => toggleModule(item.key, !checked)} />
                        <span className="text-sm font-medium text-ink truncate">{t('nav.' + item.key)}</span>
                      </label>
                      {ROLE_ACTIONS.map(a => (
                        <span key={a} className="w-12 flex justify-center">
                          <input type="checkbox" className="accent-primary-600 w-3.5 h-3.5 rounded" disabled={!checked}
                            checked={checked && actionOn(item.key, a)} onChange={() => toggleAction(item.key, a)} />
                        </span>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={item.key}>
                    <label className="flex items-center px-3 py-2 gap-2 bg-surface-50/60 cursor-pointer">
                      <input type="checkbox" className="accent-primary-600 w-4 h-4 rounded"
                        checked={parentAllOn(item)} onChange={() => toggleParent(item)} />
                      <span className="text-sm font-semibold text-ink">{t('nav.' + item.key)}</span>
                    </label>
                    {item.children.map(child => {
                      const checked = hasModule(child.key);
                      return (
                        <React.Fragment key={child.key}>
                          <div className="flex items-center pl-7 pr-3 py-1.5 gap-2">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer min-w-0">
                              <input type="checkbox" className="accent-primary-600 w-4 h-4 rounded" checked={checked}
                                onChange={() => toggleLeaf(child.key, item.key)} />
                              <span className="text-sm text-ink-secondary truncate">{t('nav.' + child.key)}</span>
                            </label>
                            {ROLE_ACTIONS.map(a => (
                              <span key={a} className="w-12 flex justify-center">
                                <input type="checkbox" className="accent-primary-600 w-3.5 h-3.5 rounded" disabled={!checked}
                                  checked={checked && actionOn(child.key, a)} onChange={() => toggleAction(child.key, a)} />
                              </span>
                            ))}
                          </div>
                          {child.key === 'production-orders' && checked && (
                            <div className="pl-10 pr-3 py-2 flex flex-wrap gap-x-5 gap-y-2 bg-amber-50/50 border-t border-amber-100">
                              <span className="w-full text-[11px] font-medium text-amber-700">{t('roles.prodSubActionsLabel')}</span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" className="accent-primary-600 w-3.5 h-3.5 rounded"
                                  checked={actionOn('production-orders', 'editOutputs')}
                                  onChange={() => toggleAction('production-orders', 'editOutputs')} />
                                <span className="text-xs text-ink-secondary">{t('roles.prodEditOutputs')}</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" className="accent-primary-600 w-3.5 h-3.5 rounded"
                                  checked={actionOn('production-orders', 'editComponents')}
                                  onChange={() => toggleAction('production-orders', 'editComponents')} />
                                <span className="text-xs text-ink-secondary">{t('roles.prodEditComponents')}</span>
                              </label>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data-flags (hide sensitive data) */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-1">{t('roles.dataFlagsSection')}</p>
            <p className="text-[11px] text-ink-tertiary mb-2">{t('roles.dataFlagsHint')}</p>
            <div className="space-y-3">
              {DATA_FLAGS.map(group => (
                <div key={group.module}>
                  <p className="text-[11px] font-semibold text-ink-tertiary mb-1.5">{t('nav.' + group.module)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.keys.map(flag => {
                      const checked = hiddenData.has(flag);
                      return (
                        <label key={flag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-red-300 bg-red-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                          <input type="checkbox" checked={checked} className="accent-red-600 w-3.5 h-3.5 rounded" onChange={() => toggleFlag(flag)} />
                          <span className={`text-xs font-medium ${checked ? 'text-red-700' : 'text-ink-secondary'}`}>{t('roles.flags.' + flag.replace(/\./g, '_'))}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Own-records-only scopes */}
          <div>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-1">{t('roles.ownSection')}</p>
            <p className="text-[11px] text-ink-tertiary mb-2">{t('roles.ownHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OWN_SCOPES.map(s => {
                const checked = ownOnly.has(s.key);
                return (
                  <label key={s.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-amber-300 bg-amber-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                    <input type="checkbox" checked={checked} className="accent-amber-600 w-3.5 h-3.5 rounded" onChange={() => toggleOwn(s.key)} />
                    <span className={`text-xs font-medium ${checked ? 'text-amber-700' : 'text-ink-secondary'}`}>{t('nav.' + s.navKey)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary btn-md">{t('roles.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary btn-md flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t('roles.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RolesTab() {
  const t = useT();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);    // { initial } | null
  const [delModal, setDelModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/organization/roles`);
      setRoles(res.data.roles || []);
    } catch { toast.error(t('roles.loadError')); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchRoles(); }, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/organization/roles/${delModal._id}`);
      toast.success(t('roles.deleted'));
      setDelModal(null);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || t('roles.genericError'));
    } finally { setDeleting(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-ink">{t('roles.title')}</h3>
          <p className="text-ink-tertiary text-sm mt-0.5">{t('roles.subtitle')}</p>
        </div>
        <button onClick={() => setModal({ initial: null })} className="btn-primary btn-md flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('roles.addRole')}
        </button>
      </div>

      <div className="card overflow-hidden">
        {roles.length === 0 ? (
          <div className="py-16 text-center text-ink-tertiary text-sm">{t('roles.empty')}</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {roles.map(r => (
              <div key={r._id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{r.name}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    {(r.modules || []).filter(m => m !== 'dashboard').length} {t('roles.modulesCount')}
                    {(r.hiddenData || []).length > 0 && <> · {r.hiddenData.length} {t('roles.hiddenCount')}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal({ initial: r })} className="p-1.5 rounded-lg text-ink-tertiary hover:text-primary-600 hover:bg-primary-50"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDelModal(r)} className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <RoleModal initial={modal.initial} onClose={() => setModal(null)} onSaved={() => { setModal(null); fetchRoles(); }} />
      )}

      {delModal && (
        <Modal title={t('roles.deleteTitle')} onClose={() => setDelModal(null)}>
          <p className="text-sm text-ink-tertiary mb-6">
            <span className="font-medium text-ink">"{delModal.name}"</span> {t('roles.deleteText')}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDelModal(null)} className="btn-secondary btn-md">{t('roles.cancel')}</button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger btn-md flex items-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {t('roles.delete')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── ATC (Telefoniya) tab ───────────────────────────────── */
function AtcTab() {
  const [form,    setForm]    = useState({ crmToken: '', apiToken: '', sipDomain: 'ibrat.sip.uz' });
  const [loaded,  setLoaded]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/atc/settings`)
      .then(r => {
        const a = r.data.atc || {};
        setForm({ crmToken: a.crmToken || '', apiToken: a.apiToken || '', sipDomain: a.sipDomain || 'ibrat.sip.uz' });
        setConnected(!!a.connected);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.put(`${API_URL}/atc/settings`, form);
      setConnected(!!r.data.atc?.connected);
      toast.success('Saqlandi');
    } catch (e) { toast.error(e.response?.data?.message || 'Xato'); }
    finally { setSaving(false); }
  };

  if (!loaded) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>;

  const webhookUrl = `${(process.env.REACT_APP_API_URL || 'http://localhost:5002/api').replace('/api', '')}/api/atc/webhook/${form.crmToken || '<CRM_TOKEN>'}`;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-ink mb-1">ATC / IP-ATS integratsiyasi</h2>
        <p className="text-sm text-ink-tertiary">ibrat.sip.uz yoki boshqa SIP platforma webhook sozlamalari</p>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${connected ? 'bg-emerald-50 border-emerald-200' : 'bg-surface-50 border-surface-200'}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-surface-300'}`} />
        <span className={`text-sm font-medium ${connected ? 'text-emerald-700' : 'text-ink-tertiary'}`}>
          {connected ? 'Ulangan' : 'Ulanmagan'}
        </span>
      </div>

      {/* CRM Token */}
      <div>
        <label className="block text-xs font-semibold text-ink-secondary mb-1.5">CRM Token <span className="text-red-500">*</span></label>
        <input
          className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
          placeholder="Maxfiy token kiriting..."
          value={form.crmToken}
          onChange={e => setForm(f => ({ ...f, crmToken: e.target.value }))}
        />
        <p className="mt-1 text-xs text-ink-tertiary">ATC webhook URL-ga qo'shiladi. Istalgan qiymat bo'lishi mumkin.</p>
      </div>

      {/* Webhook URL info */}
      {form.crmToken && (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink-secondary mb-2">ATC-ga qo'yiladigan Webhook URL:</p>
          <code className="text-xs text-ink break-all font-mono select-all">{webhookUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Nusxalandi!'); }}
            className="mt-2 text-xs text-primary-600 hover:underline"
          >
            Nusxalash
          </button>
        </div>
      )}

      {/* API Token */}
      <div>
        <label className="block text-xs font-semibold text-ink-secondary mb-1.5">API Token (Click-to-call uchun)</label>
        <input
          type="password"
          className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
          placeholder="Bearer token..."
          value={form.apiToken}
          onChange={e => setForm(f => ({ ...f, apiToken: e.target.value }))}
        />
        <p className="mt-1 text-xs text-ink-tertiary">ibrat.sip.uz management API tokeni (originate qo'ng'iroq uchun)</p>
      </div>

      {/* SIP Domain */}
      <div>
        <label className="block text-xs font-semibold text-ink-secondary mb-1.5">SIP Domain</label>
        <input
          className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
          placeholder="ibrat.sip.uz"
          value={form.sipDomain}
          onChange={e => setForm(f => ({ ...f, sipDomain: e.target.value }))}
        />
        <p className="mt-1 text-xs text-ink-tertiary">
          Faqat domen nomi. Click-to-call uchun: <code className="font-mono bg-surface-100 px-1 rounded">https://{"<domain>"}/crmapi/v1/originate</code>
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving || !form.crmToken}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Saqlash
      </button>
    </div>
  );
}

/* ─── Inbox / Quick Replies tab ──────────────────────────── */
function QuickReplyTab() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState({ title: '', text: '', shortcut: '' });
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await axios.get(`${API_URL}/inbox/quick-replies`); setReplies(r.data.replies || []); }
    catch { toast.error('Yuklanmadi'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ title: '', text: '', shortcut: '' }); setEditId(null); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.text.trim()) { toast.error('Sarlavha va matn kiritilishi shart'); return; }
    setSaving(true);
    try {
      if (editId) {
        const r = await axios.put(`${API_URL}/inbox/quick-replies/${editId}`, form);
        setReplies(prev => prev.map(x => x._id === editId ? r.data.reply : x));
        toast.success('Yangilandi');
      } else {
        const r = await axios.post(`${API_URL}/inbox/quick-replies`, form);
        setReplies(prev => [...prev, r.data.reply]);
        toast.success("Qo'shildi");
      }
      resetForm();
    } catch (e) { toast.error(e.response?.data?.message || 'Xato'); }
    finally { setSaving(false); }
  };

  const startEdit = (r) => { setEditId(r._id); setForm({ title: r.title, text: r.text, shortcut: r.shortcut || '' }); };

  const handleDelete = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    try { await axios.delete(`${API_URL}/inbox/quick-replies/${id}`); setReplies(prev => prev.filter(x => x._id !== id)); toast.success("O'chirildi"); }
    catch { toast.error('Xato'); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-bold text-ink">Tezkor javoblar (Quick Replies)</h2>
        <p className="text-sm text-ink-tertiary mt-0.5">Chat yozganda <code className="bg-surface-100 px-1 rounded text-xs">/</code> bosib tezkor javoblarni tanlang</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-surface-200 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-ink">{editId ? 'Tahrirlash' : "Yangi qo'shish"}</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-ink-tertiary mb-1 block">Sarlavha *</label>
            <input
              className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="masalan: salom"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="w-28">
            <label className="text-xs text-ink-tertiary mb-1 block">Shortcut</label>
            <input
              className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="sl"
              value={form.shortcut}
              onChange={e => setForm(f => ({ ...f, shortcut: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-ink-tertiary mb-1 block">Matn *</label>
          <textarea
            rows={3}
            className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            placeholder="Javob matni..."
            value={form.text}
            onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
          />
        </div>
        <div className="flex gap-2 justify-end">
          {editId && (
            <button onClick={resetForm} className="px-4 py-2 text-sm rounded-xl bg-surface-100 text-ink-secondary hover:bg-surface-200 transition-colors">
              Bekor qilish
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {editId ? 'Saqlash' : "Qo'shish"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>
      ) : replies.length === 0 ? (
        <div className="text-center py-10 text-ink-tertiary">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Tezkor javob yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map(r => (
            <div key={r._id} className="bg-white border border-surface-200 rounded-2xl px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-primary-600">/{r.title}</span>
                  {r.shortcut && (
                    <span className="text-[10px] font-mono bg-surface-100 text-ink-tertiary px-1.5 py-0.5 rounded">!{r.shortcut}</span>
                  )}
                </div>
                <p className="text-xs text-ink-tertiary line-clamp-2">{r.text}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(r)} className="w-7 h-7 rounded-lg hover:bg-surface-100 flex items-center justify-center text-ink-disabled hover:text-ink transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(r._id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-ink-disabled hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function SettingsPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  // Yashirin tablar (umumiy/brending) faqat URL ?tab=... orqali ochiladi; aks holda 'users'.
  const urlTab = new URLSearchParams(location.search).get('tab');
  const initialTab = TABS.some(x => x.key === urlTab) ? urlTab : 'users';
  const [tab, setTab] = useState(initialTab);
  // Strip'da ko'rinadigan tablar: yashirinlardan tashqari + (URL orqali ochilgan bo'lsa) joriy yashirin tab.
  const visibleTabs = TABS.filter(x => !HIDDEN_TAB_KEYS.includes(x.key) || x.key === tab);
  const activeTabRef = useRef(null);

  // Mobilda scroll-tab: faol tabni avtomatik ko'rinadigan joyga surish.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [tab]);

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <TopBar
        onAccountSettings={() => navigate('/dashboard')}
        left={
          <>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('settings.back')}
            </button>
            <div className="w-px h-4 bg-white/20" />
            <h1 className="text-white font-semibold text-sm">{t('settings.title')}</h1>
          </>
        }
      />

      {/* Tabs — mobilda gorizontal scroll bo'ladigan strip, desktopda o'zgarmaydi */}
      <div className="bg-white border-b border-surface-200 px-4 lg:px-6">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {visibleTabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              ref={tab === key ? activeTabRef : null}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0 whitespace-nowrap ${
                tab === key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t('settings.tabs.' + key)}
            </button>
          ))}
        </div>
      </div>

      {/* Content — mobil: p-4, desktop: p-6 (o'zgarmadi) */}
      <main className="flex-1 p-4 lg:p-6 max-w-5xl w-full safe-bottom [--safe-pad:1rem] lg:[--safe-pad:1.5rem]">
        {tab === 'branding'   && <BrandingTab />}
        {tab === 'funnels'    && <FunnelsTab />}
        {tab === 'tasks'         && <TasksTab />}
        {tab === 'deal-sources'  && <DealSourcesTab />}
        {tab === 'goals'         && <GoalsTab />}
        {tab === 'integrations'  && <IntegrationsTab />}
        {tab === 'inbox'         && <QuickReplyTab />}
        {tab === 'atc'           && <AtcTab />}
        {tab === 'users'         && <UsersTab currentUser={user} />}
        {tab === 'roles'      && <RolesTab />}
        {tab === 'currencies' && <CurrenciesTab />}
        {tab === 'uom'        && <UOMTab />}
        {tab === 'company'    && <CompanyTab />}
        {tab === 'assets'     && <AssetsSettingsTab />}
        {tab === 'trash'      && <TrashTab />}
        {tab === 'audit'      && <AuditTab />}
      </main>
    </div>
  );
}
