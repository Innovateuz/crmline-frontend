import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, logoutUser, lockScreen } from '../store/authSlice';
import { setLanguage } from '../store/langSlice';
import { fetchFunnels } from '../store/funnelSlice';
import { t, useT } from '../utils/translate';
import { mediaUrl } from '../utils/media';
import { usePermissions } from '../utils/permissions';
import { NAV_ITEMS } from './Sidebar';
import {
  Building2, Settings, LogOut, UserCircle, ChevronDown, Lock,
  Maximize, Minimize, RotateCcw, Kanban,
} from 'lucide-react';

function OrgBrand() {
  const org = useSelector((s) => s.auth.user?.organization);
  const navigate = useNavigate();
  const brandName = org?.name || 'CRM Line';
  return (
    <button onClick={() => navigate('/dashboard')}
      className="hidden lg:flex items-center gap-2.5 shrink-0 rounded-lg hover:bg-white/10 transition-colors -mx-1 px-1 py-0.5">
      <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
        {org?.logo
          ? <img src={mediaUrl(org.logo)} alt={brandName} className="w-full h-full object-cover" />
          : <Building2 className="w-4 h-4 text-white" />}
      </div>
      <span className="font-semibold text-white text-sm leading-none">{brandName}</span>
    </button>
  );
}

function NavBar({ active, onNavigate }) {
  const tFn = useT();
  const dispatch = useDispatch();
  const { canSeeModule } = usePermissions();
  const isAuthed = useSelector((s) => s.auth.isAuthenticated);
  const funnels  = useSelector((s) => s.funnels.list);
  const fLoaded  = useSelector((s) => s.funnels.loaded);

  useEffect(() => {
    if (isAuthed && !fLoaded) dispatch(fetchFunnels());
  }, [isAuthed, fLoaded, dispatch]);

  const navItems = NAV_ITEMS.filter(i => canSeeModule(i.key));

  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      {navItems.map(item => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onNavigate?.(item.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{tFn(item.labelKey)}</span>
          </button>
        );
      })}

      {funnels.length > 0 && (
        <>
          <div className="w-px h-4 bg-white/20 mx-1" />
          {funnels.map(f => {
            const key = `funnel-${f._id}`;
            const isActive = active === key;
            return (
              <button
                key={key}
                onClick={() => onNavigate?.(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white hover:bg-white/10'
                }`}
              >
                <Kanban className="w-4 h-4 shrink-0" />
                <span>{f.name}</span>
              </button>
            );
          })}
        </>
      )}
    </nav>
  );
}

const LANGS = [
  { code: 'uz',      label: "O'zbek", flag: '🇺🇿' },
  { code: 'uz-cyrl', label: 'Ўзбек',  flag: '🇺🇿' },
  { code: 'ru',      label: 'Русский', flag: '🇷🇺' },
  { code: 'en',      label: 'English', flag: '🇬🇧' },
];


export function LangDropdown() {
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
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

export function UserDropdown({ onAccountSettings }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const lang = useSelector((s) => s.lang.current);
  const { user } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { icon: UserCircle, label: t('topbar.accountSettings', lang), action: () => onAccountSettings?.() },
    // Sozlamalar — owner va admin uchun.
    ...(['owner', 'admin'].includes(user?.role)
      ? [{ icon: Settings, label: t('topbar.settings', lang), action: () => navigate('/settings') }]
      : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white font-semibold text-xs">
            {user?.name?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-white text-xs font-medium leading-none">{user?.name}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-surface-200 rounded-xl shadow-modal py-1 z-50">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="text-sm font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-ink-tertiary mt-0.5">{user?.phone}</p>
          </div>

          <div className="py-1">
            {items.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                type="button"
                onClick={() => { action(); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-surface-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-ink-tertiary" />
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-surface-100 py-1">
            <button
              type="button"
              onClick={async () => { setOpen(false); await dispatch(logoutUser()); dispatch(logout()); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t('logout', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RefreshButton() {
  const lang = useSelector((s) => s.lang.current);
  const [spinning, setSpinning] = useState(false);

  const handle = () => {
    if (spinning) return;
    setSpinning(true);
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <button
      type="button"
      onClick={handle}
      title={t('topbar.refresh', lang) || 'Yangilash'}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      <RotateCcw className={`w-4 h-4 transition-transform duration-300 ${spinning ? 'rotate-[-360deg]' : ''}`} />
    </button>
  );
}

function LockButton() {
  const dispatch = useDispatch();
  const lang = useSelector((s) => s.lang.current);
  return (
    <button
      type="button"
      onClick={() => dispatch(lockScreen())}
      title={t('topbar.lockScreen', lang)}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      <Lock className="w-4 h-4" />
    </button>
  );
}

function FullscreenButton() {
  const lang = useSelector((s) => s.lang.current);
  const [isFs, setIsFs] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={t(isFs ? 'topbar.exitFullscreen' : 'topbar.fullscreen', lang)}
      className="flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      {isFs ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
    </button>
  );
}

export default function TopBar({ left, right, onAccountSettings, active, onNavigate, showNav = true }) {
  return (
    <>
      <header className="bg-primary-800 px-4 lg:px-5 py-2.5 flex items-center gap-3 shrink-0 safe-top [--safe-pad:0.625rem]">
        {/* Left: mobile menu + logo */}
        <div className="flex items-center gap-3 shrink-0">
          {left}
          <OrgBrand />
        </div>

        {/* Center: nav items (desktop) */}
        {showNav && (
          <div className="hidden lg:flex items-center gap-1 mx-3">
            <div className="w-px h-5 bg-white/20 mr-2" />
            <NavBar active={active} onNavigate={onNavigate} />
          </div>
        )}

        {/* Right: actions */}
        <div className="flex items-center gap-2 ml-auto">
          {right && <>{right}<div className="w-px h-5 bg-white/20" /></>}
          <LangDropdown />
          <RefreshButton />
          <FullscreenButton />
          <LockButton />
          <div className="w-px h-5 bg-white/20" />
          <UserDropdown onAccountSettings={onAccountSettings} />
        </div>
      </header>
      <div className="h-px bg-primary-600/30 shrink-0" />
    </>
  );
}
