import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { register, clearError } from '../store/authSlice';
import { t } from '../utils/translate';
import {
  Building2, User, Lock, Phone, ChevronDown,
  CheckCircle2, XCircle, Loader2, AtSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const ORG_TYPES = ['retail', 'wholesale', 'manufacturing', 'service', 'other'];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);
  const lang = useSelector((s) => s.lang.current);

  const [form, setForm] = useState({
    organizationName: '',
    organizationSlug: '',
    organizationType: 'retail',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  // Org nomidan slug avtomatik hosil qilish
  const handleOrgNameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({
      ...prev,
      organizationName: val,
      // Foydalanuvchi slugni qo'lda o'zgartirmagan bo'lsa, avtomatik to'ldir
      ...(!slugTouched && { organizationSlug: slugify(val) }),
    }));
  };

  const handleSlugChange = (e) => {
    const val = slugify(e.target.value.replace(/\s/g, '-'));
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, organizationSlug: val }));
    setSlugStatus(null);
  };

  // Slug mavjudligini tekshirish
  const checkSlug = useCallback(async (slug) => {
    if (slug.length < 3) { setSlugStatus(null); return; }
    setSlugStatus('checking');
    try {
      const { data } = await axios.get(`${API_URL}/auth/check-slug/${slug}`);
      setSlugStatus(data.available ? 'available' : 'taken');
    } catch {
      setSlugStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!form.organizationSlug || form.organizationSlug.length < 3) {
      setSlugStatus(null);
      return;
    }
    const timer = setTimeout(() => checkSlug(form.organizationSlug), 500);
    return () => clearTimeout(timer);
  }, [form.organizationSlug, checkSlug]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error(t('passwordMatch', lang));
      return;
    }
    if (slugStatus === 'taken') {
      toast.error('Bu slug band. Boshqa slug tanlang');
      return;
    }
    dispatch(register({
      email: form.email,
      organizationName: form.organizationName,
      organizationSlug: form.organizationSlug,
      organizationType: form.organizationType,
      name: form.name,
      phone: form.phone,
      password: form.password,
    })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') navigate('/dashboard');
    });
  };

  const SlugIndicator = () => {
    if (!form.organizationSlug || form.organizationSlug.length < 3) return null;
    if (slugStatus === 'checking') return <Loader2 className="w-4 h-4 text-ink-tertiary animate-spin" />;
    if (slugStatus === 'available') return <CheckCircle2 className="w-4 h-4 text-primary-500" />;
    if (slugStatus === 'taken') return <XCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] bg-primary-700 flex-col justify-between p-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">CRM Line</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            Biznesingizni<br />raqamlashtiring
          </h2>
          <p className="text-primary-200 mt-3 text-sm leading-relaxed">
            Sklad, sotuv, mijozlar va moliya — barchasi bitta tizimda.
          </p>
          <div className="mt-10 space-y-4">
            {['Sklad va mahsulotlar hisobi', 'Sotuv va xarid jarayonlari', 'Mijozlar va ta\'minotchilar', 'Moliyaviy hisobotlar'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary-300 shrink-0" />
                <span className="text-primary-100 text-sm">{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-white/10 rounded-xl">
            <p className="text-primary-100 text-xs font-medium uppercase tracking-wide mb-2">Slug nima?</p>
            <p className="text-primary-200 text-sm leading-relaxed">
              Slug — tashkilotingizning tizimda noyob identifikatori.
              Masalan: <span className="text-white font-medium">baraka-savdo</span>.
              Login vaqtida shu slugni ishlatasiz.
            </p>
          </div>
        </div>

        <p className="text-primary-400 text-xs">© 2025 CRM Line. Barcha huquqlar himoyalangan.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-ink">CRM Line</span>
          </div>

          <h1 className="text-2xl font-bold text-ink">Tashkilot yaratish</h1>
          <p className="text-ink-secondary text-sm mt-1 mb-7">Akkaunt yarating va darhol boshlang</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- Tashkilot bo'limi --- */}
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Tashkilot</p>

            {/* Org name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Tashkilot nomi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  name="organizationName" type="text" value={form.organizationName}
                  onChange={handleOrgNameChange} required
                  placeholder="Masalan: Baraka Savdo"
                  className="input input-with-icon"
                />
              </div>
            </div>

            {/* Org slug */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Tashkilot slug <span className="text-red-500">*</span>
                <span className="text-xs text-ink-tertiary font-normal ml-1">(tizimda noyob ID)</span>
              </label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  name="organizationSlug" type="text" value={form.organizationSlug}
                  onChange={handleSlugChange} required minLength={3}
                  placeholder="baraka-savdo"
                  className={`input input-with-icon pr-9 ${
                    slugStatus === 'taken' ? 'border-red-400 focus:ring-red-400' :
                    slugStatus === 'available' ? 'border-primary-400 focus:ring-primary-400' : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <SlugIndicator />
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-red-500 text-xs mt-1">Bu slug band. Boshqa nom tanlang</p>
              )}
              {slugStatus === 'available' && (
                <p className="text-primary-600 text-xs mt-1">✓ Bu slug bo'sh</p>
              )}
              {form.organizationSlug && (
                <p className="text-ink-tertiary text-xs mt-1">
                  Login uchun: <span className="font-medium text-ink">{form.organizationSlug}</span>
                </p>
              )}
            </div>

            {/* Org type */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Tashkilot turi</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary pointer-events-none" />
                <select name="organizationType" value={form.organizationType}
                  onChange={handleChange} className="input appearance-none pr-9">
                  {ORG_TYPES.map((type) => (
                    <option key={type} value={type}>{t(type, lang)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-surface-200 pt-1" />

            {/* --- Admin bo'limi --- */}
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Admin akkaunt</p>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Ismingiz <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input name="name" type="text" value={form.name}
                  onChange={handleChange} required placeholder="Ism Familiya"
                  className="input input-with-icon" />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Telefon <span className="text-red-500">*</span>
                <span className="text-xs text-ink-tertiary font-normal ml-1">(login uchun)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input name="phone" type="tel" value={form.phone}
                  onChange={handleChange} required placeholder="+998901234567"
                  className="input input-with-icon" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email <span className="text-xs text-ink-tertiary font-normal ml-1">(parol tiklash uchun)</span>
              </label>
              <input name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="example@mail.com"
                className="input" />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Parol <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input name="password" type="password" value={form.password}
                    onChange={handleChange} required minLength={6} placeholder="••••••"
                    className="input input-with-icon" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Tasdiqlash <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input name="confirmPassword" type="password" value={form.confirmPassword}
                    onChange={handleChange} required placeholder="••••••"
                    className="input input-with-icon" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || slugStatus === 'taken' || slugStatus === 'checking'}
              className="btn-primary btn-lg w-full mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</> : 'Tashkilot yaratish'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-secondary mt-5">
            Akkauntingiz bormi?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Kirish</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
