import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
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
import CallsPage from './CallsPage';
import IncomingCallModal from '../components/IncomingCallModal';
import { getSocket } from '../utils/socket';

// Modul darajasida — navigatsiya/remount da reset bo'lmaydi
const _dismissedCalls = new Set();

function navKeyToPath(key) {
  if (key === 'dashboard') return '/dashboard';
  if (key === 'contacts')  return '/contacts';
  if (key === 'tasks')     return '/tasks';
  if (key === 'inbox')     return '/inbox';
  if (key === 'calls')     return '/calls';
  if (key.startsWith('funnel-')) return `/funnel/${key.replace('funnel-', '')}`;
  return '/dashboard';
}

function pathToNavKey(pathname) {
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/tasks'))    return 'tasks';
  if (pathname.startsWith('/inbox'))    return 'inbox';
  if (pathname.startsWith('/calls'))    return 'calls';
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
  const [incomingCall, setIncomingCall] = useState(null);
  const orgId = useSelector(s => s.auth.user?.organization?.id || s.auth.user?.organization?._id);

  useEffect(() => {
    if (!orgId) return;
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/atc/calls`, { params: { limit: 1 } });
        const call = res.data.calls?.[0];
        const age = call ? Math.round((Date.now() - new Date(call.createdAt)) / 1000) : -1;
        if (!call) return;
        // Faqat hozir jiringlayotgan callni ko'rsat
        if (call.status !== 'ringing') return;
        if (_dismissedCalls.has(call.callId)) return;
        setIncomingCall(prev => {
          if (prev?.callId === call.callId) return prev;
          return { callId: call.callId, phone: call.phone, ext: call.ext,
            contactName: call.contact?.name || null, contactId: call.contact?._id || null,
            direction: call.direction, groupName: call.groupName, status: call.status };
        });
      } catch(e) { console.error('[ATC poll error]', e?.response?.status, e?.message); }
    };

    // Socket events — real-time trigger for poll
    const socket = getSocket();
    const onIncoming = () => poll();
    const onEnded = ({ callId } = {}) => {
      // Tugagan callni dismissed deb belgilaymiz — poll() race condition oldini olamiz
      if (callId) _dismissedCalls.add(callId);
      setIncomingCall(prev => (prev?.callId === callId ? null : prev));
    };
    socket.on('atc:incoming', onIncoming);
    socket.on('atc:ended',    onEnded);

    // Polling — har 4 soniyada tekshir (socket ishlamasa ham ishlaydi)
    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      socket.off('atc:incoming', onIncoming);
      socket.off('atc:ended',    onEnded);
      clearInterval(interval);
    };
  }, [orgId]);

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
    if (p === '/calls')   return <CallsPage />;
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
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onDismiss={() => {
            if (incomingCall?.callId) _dismissedCalls.add(incomingCall.callId);
            setIncomingCall(null);
          }}
        />
      )}
    </div>
  );
}
