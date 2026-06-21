import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import DashboardHome from './DashboardHome';
import ContactsPage from './ContactsPage';
import ContactFormPage from './ContactFormPage';
import AccountPage from './AccountPage';
import FunnelPage from './FunnelPage';
import DealDetailPage from './DealDetailPage';
import TasksPage from './TasksPage';
import InboxPage from './InboxPage';

function navKeyToPath(key) {
  if (key === 'dashboard') return '/dashboard';
  if (key === 'contacts')  return '/contacts';
  if (key === 'tasks')     return '/tasks';
  if (key === 'inbox')     return '/inbox';
  if (key.startsWith('funnel-')) return `/funnel/${key.replace('funnel-', '')}`;
  return '/dashboard';
}

function pathToNavKey(pathname) {
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/tasks'))    return 'tasks';
  if (pathname.startsWith('/inbox'))    return 'inbox';
  if (pathname.startsWith('/funnel/')) {
    const funnelId = pathname.split('/')[2];
    return `funnel-${funnelId}`;
  }
  return 'dashboard';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeKey = pathToNavKey(location.pathname);

  const handleNavigate = (key) => {
    navigate(navKeyToPath(key));
  };

  const handleAccountSettings = () => {
    navigate('/account');
  };

  const getContent = () => {
    const p = location.pathname;
    if (p === '/account') return <AccountPage />;
    if (p === '/tasks')   return <TasksPage />;
    if (p === '/inbox')   return <InboxPage />;
    if (p.startsWith('/funnel/')) {
      // /funnel/:id/deal/new  or  /funnel/:id/deal/:dealId
      const dealMatch = p.match(/^\/funnel\/([^/]+)\/deal\/(.+)$/);
      if (dealMatch) {
        return <DealDetailPage funnelId={dealMatch[1]} dealId={dealMatch[2]} />;
      }
      const funnelId = p.replace('/funnel/', '');
      return <FunnelPage funnelId={funnelId} />;
    }
    if (p === '/contacts/new' || (p.startsWith('/contacts/') && p !== '/contacts/')) {
      return <ContactFormPage />;
    }
    if (activeKey === 'contacts') return <ContactsPage />;
    return <DashboardHome />;
  };

  return (
    <div className="flex h-screen-safe bg-surface-50 overflow-hidden">
      <Sidebar
        active={activeKey}
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          onAccountSettings={handleAccountSettings}
          left={
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          }
        />
        <main className="flex-1 overflow-y-auto">
          {getContent()}
        </main>
      </div>
    </div>
  );
}
