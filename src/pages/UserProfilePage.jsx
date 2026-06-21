import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, FileText,
  Plus, Trash2, Loader2, Save, Upload, X, Eye, KeyRound,
  Camera, File as FileIcon,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import Dropdown from '../components/Dropdown';
import { mediaUrl } from '../utils/media';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// "DD/MM/YYYY" → ISO "YYYY-MM-DD" | null
function maskToIso(v) {
  if (!v || v.length < 10) return null;
  const [d, m, y] = v.split('/');
  if (!d || !m || !y) return null;
  return `${y}-${m}-${d}`;
}
// ISO date → "DD/MM/YYYY"
function isoToMask(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function lavozimOf(f) {
  if (f.isSnabjenist) return 'snab';
  if (f.isProcessWorker) return 'process';
  if (f.isProjectManager) return 'pm';
  if (f.isCashier) return 'cashier';
  if (f.role === 'admin') return 'admin';
  return 'user';
}
function lavozimPatch(v) {
  return {
    role: v === 'admin' ? 'admin' : 'user',
    isSnabjenist:     v === 'snab',
    isProcessWorker:  v === 'process',
    isProjectManager: v === 'pm',
    isCashier:        v === 'cashier',
  };
}
function lavozimHasRbac(v) { return ['user', 'snab', 'process', 'pm', 'cashier'].includes(v); }

const TABS = [
  { key: 'info',  label: "Ma'lumotlar" },
  { key: 'docs',  label: 'Hujjatlar'   },
];

export default function UserProfilePage() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(s => s.auth.user);
  const id = paramId || currentUser?._id || currentUser?.id;

  const [tab,     setTab]     = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Ref data
  const [departments,   setDepartments]   = useState([]);
  const [cashboxes,     setCashboxes]     = useState([]);
  const [cpFolders,     setCpFolders]     = useState([]);
  const [roles,         setRoles]         = useState([]);
  const [products,      setProducts]      = useState([]);
  const [productCats,   setProductCats]   = useState([]);

  // User fields
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [isActive,     setIsActive]     = useState(true);
  const [avatarUrl,    setAvatarUrl]    = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Personal
  const [birthDate,    setBirthDate]    = useState(''); // "DD/MM/YYYY"
  const [address,      setAddress]      = useState('');
  const [extraPhones,  setExtraPhones]  = useState([]); // [{label,number}]

  // Role
  const [roleForm, setRoleForm] = useState({
    role: 'user', isSnabjenist: false, isProcessWorker: false,
    isProjectManager: false, isCashier: false, customRole: '',
    department: '', departments: [], cashboxes: [], counterpartyFolders: [],
    canConsumeJobOrderMaterials: false, allowedJobOrderMaterials: [],
  });

  // Passport files
  const [passportFiles, setPassportFiles]   = useState([]);
  const [docUploading,  setDocUploading]    = useState(false);
  const [lightbox,      setLightbox]        = useState(null); // url string
  const passportRef = useRef();

  // Password modal
  const [pwModal,  setPwModal]  = useState(false);
  const [newPw,    setNewPw]    = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/organization/users/${id}`),
      axios.get(`${API}/departments`).catch(() => ({ data: {} })),
      axios.get(`${API}/cashbox`).catch(() => ({ data: {} })),
      axios.get(`${API}/counterparty/folders`).catch(() => ({ data: {} })),
      axios.get(`${API}/organization/roles`).catch(() => ({ data: {} })),
      axios.get(`${API}/inventory`).catch(() => ({ data: {} })),
      axios.get(`${API}/inventory/categories`).catch(() => ({ data: {} })),
    ]).then(([uRes, dRes, cbRes, fRes, rRes, pRes, cRes]) => {
      const u = uRes.data.user;
      setName(u.name || '');
      setPhone(u.phone || '');
      setEmail(u.email || '');
      setIsActive(u.isActive !== false);
      setAvatarUrl(u.avatar || '');
      setBirthDate(isoToMask(u.birthDate));
      setAddress(u.address || '');
      setExtraPhones(u.extraPhones || []);
      setPassportFiles(u.passportFiles || []);
      setRoleForm({
        role: u.role || 'user',
        isSnabjenist:     !!u.isSnabjenist,
        isProcessWorker:  !!u.isProcessWorker,
        isProjectManager: !!u.isProjectManager,
        isCashier:        !!u.isCashier,
        customRole: u.customRole?._id || u.customRole || '',
        department: u.department?._id || u.department || '',
        departments: (u.departments || []).length
          ? (u.departments || []).map(d => d?._id || d)
          : (u.isProcessWorker && u.department ? [u.department?._id || u.department] : []),
        cashboxes: (u.cashboxes || []).map(c => c?._id || c),
        counterpartyFolders: (u.counterpartyFolders || []).map(f => f?._id || f),
        canConsumeJobOrderMaterials: !!u.canConsumeJobOrderMaterials,
        allowedJobOrderMaterials: (u.allowedJobOrderMaterials || []).map(p => {
          const pid = p._id || p;
          const uomVal = typeof p.uom === 'object' ? (p.uom?.shortName || '') : (p.uom || '');
          return { _id: pid, name: p.name || '', uom: uomVal };
        }).filter(p => p._id && typeof p._id === 'string'),
      });
      setDepartments(dRes.data.departments || []);
      setCashboxes(cbRes.data.cashboxes || []);
      setCpFolders(fRes.data.folders || []);
      setRoles(rRes.data.roles || []);
      setProducts(pRes.data.products || []);
      setProductCats(cRes.data.categories || []);
    }).catch(() => toast.error("Foydalanuvchi topilmadi"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Ism kiritilishi shart');
    setSaving(true);
    try {
      await axios.put(`${API}/organization/users/${id}`, {
        name: name.trim(), phone, email: email.trim(),
        isActive,
        avatar: avatarUrl || undefined,
        birthDate: maskToIso(birthDate),
        address,
        extraPhones: extraPhones.filter(p => p.number?.trim()),
        passportFiles,
        ...roleForm,
        departments: roleForm.departments.filter(Boolean),
        cashboxes: roleForm.cashboxes.filter(Boolean),
        counterpartyFolders: roleForm.counterpartyFolders.filter(Boolean),
        allowedJobOrderMaterials: roleForm.allowedJobOrderMaterials.map(p => p._id),
        customRole: roleForm.customRole || null,
        department: roleForm.department || null,
      });
      toast.success("Saqlandi");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post(`${API}/upload`, fd);
      setAvatarUrl(res.data.url);
    } catch { toast.error('Rasm yuklanmadi'); }
    finally { setAvatarUploading(false); }
  };

  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setDocUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post(`${API}/upload/file`, fd);
        uploaded.push({ url: res.data.url, name: file.name, uploadedAt: new Date().toISOString() });
      }
      const next = [...passportFiles, ...uploaded];
      setPassportFiles(next);
      await axios.put(`${API}/organization/users/${id}`, { passportFiles: next });
      toast.success(`${uploaded.length} ta fayl yuklandi`);
    } catch { toast.error('Yuklashda xato'); }
    finally { setDocUploading(false); e.target.value = ''; }
  };

  const removeDoc = async (url) => {
    const next = passportFiles.filter(f => f.url !== url);
    setPassportFiles(next);
    await axios.put(`${API}/organization/users/${id}`, { passportFiles: next }).catch(() => {});
    axios.delete(`${API}/upload`, { data: { url } }).catch(() => {});
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (newPw.length < 4) return toast.error('Parol kamida 4 belgi');
    setPwSaving(true);
    try {
      await axios.put(`${API}/organization/users/${id}/password`, { newPassword: newPw });
      toast.success('Parol o\'zgartirildi');
      setPwModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Xato'); }
    finally { setPwSaving(false); }
  };

  const lav = lavozimOf(roleForm);
  const isMe = currentUser?.id === id;

  // ── helpers ────────────────────────────────────────────────────
  const renderDeptMulti = () => (
    departments.length === 0
      ? <p className="text-sm text-ink-tertiary">Bo'limlar yo'q</p>
      : <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {departments.map(d => {
            const checked = roleForm.departments.includes(d._id);
            return (
              <label key={d._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                <input type="checkbox" checked={checked} className="accent-primary-600 w-3.5 h-3.5"
                  onChange={() => setRoleForm(f => ({ ...f, departments: checked ? f.departments.filter(x => x !== d._id) : [...f.departments, d._id] }))} />
                <span className="text-sm text-ink">{d.name}{d.branch?.name ? ` (${d.branch.name})` : ''}</span>
              </label>
            );
          })}
        </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-surface-50">
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-4 py-2.5 flex items-center gap-2">
          <button onClick={() => paramId ? navigate('/settings?tab=users') : navigate(-1)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-semibold text-sm">Foydalanuvchi profili</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-tertiary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-surface-50 overflow-hidden">
      {/* TopBar */}
      <div className="shrink-0 bg-gradient-to-r from-primary-700 to-primary-600 px-4 py-2.5 flex items-center gap-2 shadow">
        <button onClick={() => paramId ? navigate('/settings?tab=users') : navigate(-1)}
          className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none truncate">
            {name || 'Foydalanuvchi'}
          </p>
          <p className="text-white/60 text-xs mt-0.5 truncate">{phone}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setPwModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-colors">
            <KeyRound className="w-3.5 h-3.5" /> Parol
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-primary-700 hover:bg-white/90 text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Saqlash
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-surface-200 px-4 flex gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-secondary hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-12">

          {/* ── Tab: Ma'lumotlar ── */}
          {tab === 'info' && (
            <>
              {/* Avatar card */}
              <div className="card card-body flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-primary-100 overflow-hidden flex items-center justify-center">
                    {avatarUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                    ) : avatarUrl ? (
                      <img src={mediaUrl(avatarUrl)} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-primary-600">{name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center cursor-pointer shadow-sm hover:bg-primary-700 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">{name}</p>
                  <p className="text-sm text-ink-tertiary">{phone}</p>
                  {isMe && <span className="text-[11px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded mt-1 inline-block font-semibold">Siz</span>}
                </div>
                <label className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-ink-secondary">{isActive ? 'Faol' : 'Nofaol'}</span>
                  <button type="button" onClick={() => setIsActive(v => !v)}
                    className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-primary-500' : 'bg-surface-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>

              {/* Asosiy ma'lumotlar */}
              <div className="card card-body space-y-3">
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  <User className="w-4 h-4 text-ink-tertiary" /> Asosiy ma'lumotlar
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Ism *</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Telefon raqam</label>
                    <input value={phone} readOnly className="input bg-surface-50 text-ink-tertiary cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">E-mail</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Tug'ilgan kun</label>
                    <DateTimePicker value={birthDate} onChange={setBirthDate} dateOnly placeholder="KK/OO/YYYY" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-ink-secondary mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1 text-ink-tertiary" />Yashash joyi manzili
                    </label>
                    <textarea className="input resize-none" rows={2} value={address}
                      onChange={e => setAddress(e.target.value)} placeholder="Shahar, ko'cha, uy..." />
                  </div>
                </div>
              </div>

              {/* Qo'shimcha telefon raqamlar */}
              <div className="card card-body space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink flex items-center gap-2">
                    <Phone className="w-4 h-4 text-ink-tertiary" /> Qo'shimcha telefon raqamlar
                  </p>
                  <button type="button" onClick={() => setExtraPhones(p => [...p, { label: '', number: '' }])}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 border border-primary-200 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                  </button>
                </div>
                {extraPhones.length === 0 ? (
                  <p className="text-sm text-ink-tertiary text-center py-2">Qo'shimcha raqam yo'q</p>
                ) : (
                  <div className="space-y-2">
                    {extraPhones.map((ep, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input className="input w-28 shrink-0" value={ep.label}
                          onChange={e => setExtraPhones(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                          placeholder="Uy / Ish" />
                        <input className="input flex-1" value={ep.number}
                          onChange={e => setExtraPhones(p => p.map((x, j) => j === i ? { ...x, number: e.target.value } : x))}
                          placeholder="+998 90 000 00 00" />
                        <button type="button" onClick={() => setExtraPhones(p => p.filter((_, j) => j !== i))}
                          className="p-2 text-ink-tertiary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lavozim va ruxsatlar */}
              <div className="card card-body space-y-4">
                <p className="text-sm font-semibold text-ink">Lavozim va ruxsatlar</p>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Lavozim</label>
                  <Dropdown value={lav}
                    disabled={roleForm.role === 'owner'}
                    options={roleForm.role === 'owner'
                      ? [{ value: 'owner', label: 'Tashkilot egasi' }]
                      : [
                          { value: 'admin',   label: 'Administrator' },
                          { value: 'user',    label: 'Xodim' },
                          { value: 'snab',    label: 'Snabjenist' },
                          { value: 'process', label: 'Jarayon xodimi' },
                          { value: 'pm',      label: 'Loyiha menejeri' },
                          { value: 'cashier', label: 'Kassir' },
                        ]}
                    onChange={v => setRoleForm(f => ({ ...f, ...lavozimPatch(v) }))} />
                </div>

                {lav === 'process' ? (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">Bo'limlar</label>
                    {renderDeptMulti()}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Bo'lim</label>
                    <Dropdown value={roleForm.department} placeholder="Bo'limsiz" searchable
                      options={[{ value: '', label: "Bo'limsiz" }, ...departments.map(d => ({ value: d._id, label: `${d.name}${d.branch?.name ? ` (${d.branch.name})` : ''}` }))]}
                      onChange={v => setRoleForm(f => ({ ...f, department: v }))} />
                  </div>
                )}

                {lavozimHasRbac(lav) && (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1">Custom rol</label>
                    <Dropdown value={roleForm.customRole} placeholder="Rol yo'q (standart)"
                      options={[{ value: '', label: "Rol yo'q (standart)" }, ...roles.map(r => ({ value: r._id, label: r.name }))]}
                      onChange={v => setRoleForm(f => ({ ...f, customRole: v }))} />
                  </div>
                )}

                {roleForm.isSnabjenist && cashboxes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">Kassalar</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cashboxes.map(cb => {
                        const checked = roleForm.cashboxes.includes(cb._id);
                        return (
                          <label key={cb._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                            <input type="checkbox" checked={checked} className="accent-primary-600 w-3.5 h-3.5"
                              onChange={() => setRoleForm(f => ({ ...f, cashboxes: checked ? f.cashboxes.filter(x => x !== cb._id) : [...f.cashboxes, cb._id] }))} />
                            <span className="text-xs font-medium text-ink">{cb.name} <span className="text-ink-tertiary">({cb.currency})</span></span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {roleForm.isSnabjenist && cpFolders.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">Ta'minotchi papkalar</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cpFolders.map(f => {
                        const checked = roleForm.counterpartyFolders.includes(f._id);
                        return (
                          <label key={f._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${checked ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:bg-surface-50'}`}>
                            <input type="checkbox" checked={checked} className="accent-primary-600 w-3.5 h-3.5"
                              onChange={() => setRoleForm(f2 => ({ ...f2, counterpartyFolders: checked ? f2.counterpartyFolders.filter(x => x !== f._id) : [...f2.counterpartyFolders, f._id] }))} />
                            <span className="flex items-center gap-1.5 text-sm text-ink">
                              {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />}{f.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {roleForm.isProcessWorker && (
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-50">
                    <input type="checkbox" checked={roleForm.canConsumeJobOrderMaterials} className="accent-primary-600 w-4 h-4"
                      onChange={e => setRoleForm(f => ({ ...f, canConsumeJobOrderMaterials: e.target.checked }))} />
                    <span className="text-sm text-ink">Xomashyo rasxod qilish huquqi</span>
                  </label>
                )}
              </div>
            </>
          )}

          {/* ── Tab: Hujjatlar ── */}
          {tab === 'docs' && (
            <>
              <div className="card card-body space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink flex items-center gap-2">
                    <FileText className="w-4 h-4 text-ink-tertiary" /> Passport va hujjatlar
                  </p>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors border shadow-sm ${docUploading ? 'bg-surface-100 text-ink-tertiary border-surface-200' : 'bg-primary-600 text-white hover:bg-primary-700 border-primary-600'}`}>
                    {docUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Fayl yuklash
                    <input type="file" multiple accept="image/*,application/pdf" className="sr-only"
                      ref={passportRef} onChange={handleDocUpload} disabled={docUploading} />
                  </label>
                </div>
                <p className="text-xs text-ink-tertiary">Rasm yoki PDF formatdagi fayllar qabul qilinadi. Maks. 15 MB.</p>

                {passportFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-10 h-10 text-surface-300 mb-3" />
                    <p className="text-sm text-ink-tertiary">Hujjatlar yuklanmagan</p>
                    <p className="text-xs text-ink-disabled mt-1">Passport rasm/skanni, yashash joyi hujjati va boshqalar</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {passportFiles.map((f, i) => {
                      const isImg = /\.(jpe?g|png|webp|gif)$/i.test(f.url) || /^image\//.test(f.name);
                      const isPdf = /\.pdf$/i.test(f.url) || /\.pdf$/i.test(f.name);
                      return (
                        <div key={i} className="relative group rounded-xl border border-surface-200 overflow-hidden bg-white">
                          {isImg ? (
                            <div className="aspect-[4/3] bg-surface-50 cursor-pointer" onClick={() => setLightbox(mediaUrl(f.url))}>
                              <img src={mediaUrl(f.url)} alt={f.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="aspect-[4/3] bg-surface-50 flex flex-col items-center justify-center gap-2 px-2">
                              <FileIcon className="w-8 h-8 text-ink-tertiary" />
                              <span className="text-xs text-ink-tertiary text-center leading-tight truncate w-full px-1">{f.name}</span>
                            </div>
                          )}
                          <div className="px-2 py-1.5 flex items-center justify-between gap-1 border-t border-surface-100">
                            <span className="text-[11px] text-ink-tertiary truncate flex-1">{f.name || `Fayl ${i + 1}`}</span>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a href={mediaUrl(f.url)} target="_blank" rel="noreferrer"
                                className="p-1 rounded text-ink-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <button type="button" onClick={() => removeDoc(f.url)}
                                className="p-1 rounded text-ink-tertiary hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Password modal */}
      {pwModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPwModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">Parol o'zgartirish</h3>
              <button onClick={() => setPwModal(false)} className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePwChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Yangi parol</label>
                <input className="input" type="password" value={newPw}
                  onChange={e => setNewPw(e.target.value)} required minLength={4}
                  placeholder="Kamida 4 belgi" autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPwModal(false)} className="btn-secondary btn-md">Bekor</button>
                <button type="submit" disabled={pwSaving} className="btn-primary btn-md flex items-center gap-2">
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
