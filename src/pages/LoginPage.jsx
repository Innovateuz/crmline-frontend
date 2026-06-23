import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/authSlice';
import { setLanguage } from '../store/langSlice';
import { t } from '../utils/translate';
import { detectSlug } from '../utils/subdomain';
import { applyTheme } from '../utils/theme';
import axios from 'axios';
import { Building2, Server, Phone, Lock, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { mediaUrl } from '../utils/media';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const LANGS = [
  { code: 'uz',      label: "O'zbek", flag: '🇺🇿' },
  { code: 'uz-cyrl', label: 'Ўзбек',  flag: '🇺🇿' },
  { code: 'ru',      label: 'Русский', flag: '🇷🇺' },
  { code: 'en',      label: 'English', flag: '🇬🇧' },
];

function LangDropdown() {
  const dispatch = useDispatch();
  const lang = useSelector((s) => s.lang.current);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-lg text-sm font-medium text-ink transition-colors"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-surface-200 rounded-xl shadow-modal py-1 z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { dispatch(setLanguage(l.code)); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                lang === l.code
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-ink hover:bg-surface-50'
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((s) => s.auth);
  const lang = useSelector((s) => s.lang.current);
  // Dala rollari o'z sodda sahifasiga tushadi (ta'minotchi / jarayon xodimi).
  const landing = (u) => (u?.isSnabjenist ? '/snab' : u?.isProcessWorker ? '/process' : '/dashboard');

  // Subdomendan tashkilot slug'i (masalan nimadir.erpline.uz → "nimadir").
  // Topilsa — "server" maydoni avtomatik to'ladi va o'qish-uchun ko'rsatiladi.
  const [subSlug] = useState(() => detectSlug());
  const [form, setForm] = useState({ slug: subSlug || '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  // Subdomen tashkilotini tekshirish: 'manual' (subdomen yo'q) | 'checking' | 'found' | 'notfound'
  const [org, setOrg] = useState(null);
  const [orgStatus, setOrgStatus] = useState(subSlug ? 'checking' : 'manual');

  // Subdomen bo'lsa — sahifa ochilishida tashkilot bor-yo'qligini tekshiramiz.
  useEffect(() => {
    if (!subSlug) return;
    let alive = true;
    axios.get(`${API}/auth/org/${subSlug}`)
      .then((res) => {
        if (!alive) return;
        const o = res.data.organization;
        setOrg(o);
        setOrgStatus('found');
        // Subdomen bilan kirilganda — login sahifasi org brendiga moslanadi.
        // Subdomensiz kirishda login oppoq (rangsiz) qoladi.
        if (o.brandColor) applyTheme(o.brandColor, o.brandSolid);
      })
      .catch((err) => {
        if (!alive) return;
        // 404 → tashkilot yo'q (formani bloklaymiz). Boshqa xato (tarmoq) → formani ko'rsataveramiz.
        setOrgStatus(err.response?.status === 404 ? 'notfound' : 'found');
      });
    return () => { alive = false; };
  }, [subSlug]);

  useEffect(() => { if (isAuthenticated) navigate(landing(user)); }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    setForm((prev) => ({ ...prev, phone: digits }));
  };

  // Subdomen bilan kirilganda — brendli (rangli) ko'rinish; aks holda oppoq.
  const branded = Boolean(subSlug);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login({
      slug: form.slug,
      phone: '+998' + form.phone,
      password: form.password,
    })).then((res) => {
      if (res.meta.requestStatus === 'fulfilled') navigate(landing(res.payload));
    });
  };

  return (
    <div className={`min-h-screen min-h-screen-safe flex flex-col ${branded ? 'bg-primary-700' : 'bg-white'}`}>
      {/* Header — logo o'rtada */}
      <div className="flex items-center justify-center px-6 py-5 safe-top [--safe-pad:1.25rem]">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden ${branded ? 'bg-white/15' : 'bg-surface-100'}`}>
            {org?.logo
              ? <img src={mediaUrl(org.logo)} alt={org.name} className="w-full h-full object-cover" />
              : <Building2 className={`w-5 h-5 ${branded ? 'text-white' : 'text-ink-secondary'}`} />}
          </div>
          <span className={`font-bold text-lg tracking-tight ${branded ? 'text-white' : 'text-ink'}`}>{org?.name || 'CRM Line'}</span>
        </div>
      </div>

      {/* Karta */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className={`w-full max-w-md bg-white rounded-2xl shadow-modal p-6 sm:p-8 ${branded ? '' : 'border border-surface-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-ink">{t('login', lang)}</h1>
            <LangDropdown />
          </div>

          {orgStatus === 'checking' ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              <p className="text-sm text-ink-tertiary"><span className="font-medium text-ink">{subSlug}</span> — {t('login_page.checking', lang)}</p>
            </div>
          ) : orgStatus === 'notfound' ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Server className="w-7 h-7 text-red-400" />
              </div>
              <p className="font-semibold text-ink">{t('login_page.serverNotFound', lang)}</p>
              <p className="text-sm text-ink-tertiary mt-1">
                {t('login_page.serverNotFoundHint', lang).split('{slug}').reduce((acc, part, i) => (
                  i === 0 ? [part] : [...acc, <span key={i} className="font-medium text-ink">{subSlug}</span>, part]
                ), [])}
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Server — subdomen bo'lsa avtomatik aniqlanadi va YASHIRIN (nom header'da
                ko'rinadi); subdomen bo'lmasa qo'lda kiritiladi */}
            {!subSlug && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">{t('login_page.server', lang)}</label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                  <input
                    name="slug" type="text" value={form.slug}
                    onChange={handleChange} required
                    placeholder={t('login_page.serverPlaceholder', lang)}
                    className="input input-with-icon"
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {t('phone', lang)}
              </label>
              <div className="flex">
                <div className="flex items-center gap-1.5 px-3 bg-surface-100 border border-r-0 border-surface-200 rounded-l-lg text-sm font-medium text-ink-secondary select-none shrink-0">
                  <Phone className="w-3.5 h-3.5 text-ink-tertiary" />
                  +998
                </div>
                <input
                  type="tel" value={form.phone}
                  onChange={handlePhoneChange} required
                  placeholder={t('login_page.phonePlaceholder', lang)}
                  className="input rounded-l-none flex-1"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                {t('password', lang)}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder={t('login_page.passwordPlaceholder', lang)}
                  className="input input-with-icon pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('login_page.submitting', lang)}</>
                : t('login', lang)}
            </button>

            <button type="button" onClick={() => navigate('/forgot-password')}
              className="w-full text-center text-sm text-primary-600 hover:text-primary-700 transition-colors">
              {t('login_page.forgotPassword', lang)}
            </button>
          </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 safe-bottom [--safe-pad:1.5rem]">
        <p className={`text-xs ${branded ? 'text-primary-300' : 'text-ink-tertiary'}`}>{t('login_page.rights', lang)}</p>
      </div>
    </div>
  );
}
