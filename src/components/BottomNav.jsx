import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useT } from '../utils/translate';
import { usePermissions } from '../utils/permissions';

export default function BottomNav() {
  const location = useLocation();
  const unread   = useSelector(s => s.inbox?.totalUnread || 0);
  const t = useT();
  const { canSeeModule } = usePermissions();

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

  return (
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
      </div>
    </nav>
  );
}
