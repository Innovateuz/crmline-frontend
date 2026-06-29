import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useT } from '../utils/translate';
import { usePermissions } from '../utils/permissions';
import { fetchFunnels } from '../store/funnelSlice';
import {
  LayoutDashboard, Users, Kanban, CheckSquare2, MessageSquare, Phone, Star, X,
} from 'lucide-react';

export const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, labelKey: 'bottomNav.dashboard' },
  { key: 'contacts',  icon: Users,           labelKey: 'bottomNav.contacts'  },
  { key: 'tasks',     icon: CheckSquare2,    labelKey: 'bottomNav.tasks'     },
  { key: 'inbox',     icon: MessageSquare,   labelKey: 'bottomNav.inbox'     },
  { key: 'calls',     icon: Phone,           labelKey: 'bottomNav.calls'     },
  { key: 'reviews',   icon: Star,            labelKey: 'bottomNav.reviews'   },
];

function NavList({ active, onNavigate, mobile = false, onCloseMobile }) {
  const t = useT();
  const dispatch = useDispatch();
  const { canSeeModule } = usePermissions();

  const isAuthed = useSelector((s) => s.auth.isAuthenticated);
  const funnels  = useSelector((s) => s.funnels.list);
  const fLoaded  = useSelector((s) => s.funnels.loaded);

  useEffect(() => {
    if (isAuthed && !fLoaded) dispatch(fetchFunnels());
  }, [isAuthed, fLoaded, dispatch]);

  const navItems = NAV_ITEMS.filter(i => canSeeModule(i.key));

  const go = (key) => { onNavigate?.(key); if (mobile) onCloseMobile?.(); };

  return (
    <div className="flex flex-col h-full pt-6 pb-4 px-2">
      {mobile && (
        <button onClick={onCloseMobile}
          className="absolute top-3 right-3 text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {navItems.map(item => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => go(item.key)}
              className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/10'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full" />
              )}
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium leading-none text-center">
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Varonkalar */}
        {funnels.length > 0 && (
          <>
            <div className="my-2 border-t border-white/10" />
            {funnels.map((funnel) => {
              const key = `funnel-${funnel._id}`;
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => go(key)}
                  title={funnel.name}
                  className={`relative w-full flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/55 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full" />
                  )}
                  <Kanban className="w-6 h-6" />
                  <span className="text-[10px] font-medium leading-none text-center line-clamp-2 px-0.5">
                    {funnel.name}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

export default function Sidebar({ active, onNavigate, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className="hidden lg:block w-[76px] bg-primary-800 shrink-0">
        <NavList active={active} onNavigate={onNavigate} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <div className="relative z-50 w-[76px] h-full bg-primary-800 shadow-modal">
            <NavList active={active} onNavigate={onNavigate} mobile onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
