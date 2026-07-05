import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Phone,
  Kanban,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useT } from '../utils/translate';
import { usePermissions } from '../utils/permissions';
import { fetchFunnels } from '../store/funnelSlice';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const unread   = useSelector(s => s.inbox?.totalUnread || 0);
  const t = useT();
  const { canSeeModule } = usePermissions();
  const isAuthed = useSelector(s => s.auth.isAuthenticated);
  const funnels  = useSelector(s => s.funnels.list);
  const fLoaded  = useSelector(s => s.funnels.loaded);
  const [showFunnelPicker, setShowFunnelPicker] = useState(false);

  useEffect(() => {
    if (isAuthed && !fLoaded) dispatch(fetchFunnels());
  }, [isAuthed, fLoaded, dispatch]);

  const NAV_ITEMS = [
    { key: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: t('bottomNav.dashboard') },
    { key: 'contacts',  to: '/contacts',  icon: Users,           label: t('bottomNav.contacts') },
    { key: 'tasks',     to: '/tasks',     icon: CheckSquare,     label: t('bottomNav.tasks') },
    { key: 'inbox',     to: '/inbox',     icon: MessageSquare,   label: t('bottomNav.inbox') },
    { key: 'calls',     to: '/calls',     icon: Phone,           label: t('bottomNav.calls') },
  ].filter(i => canSeeModule(i.key));

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(to);
  };

  const isFunnelActive = location.pathname.startsWith('/funnel/');

  const openFunnels = () => {
    if (funnels.length === 0) return;
    if (funnels.length === 1) navigate(`/funnel/${funnels[0]._id}`);
    else setShowFunnelPicker(true);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active = isActive(to);
            const isInbox = to === '/inbox';
            return (
              <NavLink
                key={to}
                to={to}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative
                  transition-colors duration-150
                  ${active ? 'text-primary-600' : 'text-gray-400'}
                `}
              >
                <span className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-150 ${active ? 'scale-110' : ''}`} />
                  {isInbox && unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-600 rounded-full" />
                )}
              </NavLink>
            );
          })}

          {funnels.length > 0 && (
            <button type="button" onClick={openFunnels}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative transition-colors duration-150 ${
                isFunnelActive ? 'text-primary-600' : 'text-gray-400'
              }`}>
              <Kanban className={`w-5 h-5 transition-transform duration-150 ${isFunnelActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-medium leading-none ${isFunnelActive ? 'text-primary-600' : 'text-gray-400'}`}>
                {t('bottomNav.funnels')}
              </span>
              {isFunnelActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Bir nechta voronka bo'lsa — tanlash varag'i */}
      {showFunnelPicker && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowFunnelPicker(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()}
            className="relative w-full bg-white rounded-t-2xl shadow-modal max-h-[70vh] overflow-y-auto safe-bottom">
            <div className="px-5 py-4 border-b border-surface-100">
              <p className="font-semibold text-ink">{t('bottomNav.funnels')}</p>
            </div>
            <div className="divide-y divide-surface-100">
              {funnels.map(f => (
                <button key={f._id} type="button"
                  onClick={() => { setShowFunnelPicker(false); navigate(`/funnel/${f._id}`); }}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-50 transition-colors">
                  <Kanban className="w-4 h-4 text-ink-tertiary shrink-0" />
                  <span className="text-sm font-medium text-ink">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
