import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import store from './store';
import { getMe, setInitialized } from './store/authSlice';
import { applyTheme } from './utils/theme';
import { connectSocket, getSocket } from './utils/socket';
import { addFunnel, updateFunnel as updateFunnelInList, removeFunnel } from './store/funnelSlice';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ReviewLandingPage from './pages/ReviewLandingPage';
import LeadFormPage from './pages/LeadFormPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import UserProfilePage from './pages/UserProfilePage';
import AccountPage from './pages/AccountPage';
import InboxAnalyticsPage from './pages/InboxAnalyticsPage';
import ContactAnalyticsPage from './pages/ContactAnalyticsPage';
import LockScreen from './components/LockScreen';
import UpdatePrompt from './components/UpdatePrompt';
import { subscribeToPush } from './utils/swRegister';

function PrivateRoute({ children }) {
  const { isAuthenticated, initialized } = useSelector((s) => s.auth);
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, initialized, user } = useSelector((s) => s.auth);
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;
  return ['owner', 'admin'].includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, initialized } = useSelector((s) => s.auth);
  if (!initialized) return null;
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
}

function AppInit() {
  const dispatch = useDispatch();
  const brandColor = useSelector((s) => s.auth.user?.organization?.brandColor);
  const brandSolid = useSelector((s) => s.auth.user?.organization?.brandSolid);
  const orgId      = useSelector((s) => s.auth.user?.organization?.id || s.auth.user?.organization?._id);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(getMe());
    } else {
      dispatch(setInitialized());
    }
  }, [dispatch]);

  useEffect(() => {
    const normalized = brandColor ? (brandColor.startsWith('#') ? brandColor : '#' + brandColor) : null;
    applyTheme(normalized, brandSolid);
  }, [brandColor, brandSolid]);

  // getMe() muvaffaqiyatli bo'lishi bilan darhol socket ulansin
  useEffect(() => {
    if (orgId) connectSocket(orgId);
  }, [orgId]);

  // Real-time sync: boshqa foydalanuvchi varonka (funnel) qo'shsa/o'zgartirsa/o'chirsa —
  // sidebar navigatsiyasi avtomatik yangilanadi.
  useEffect(() => {
    if (!orgId) return;
    const socket = getSocket();
    const onCreated = ({ funnel }) => dispatch(addFunnel(funnel));
    const onUpdated = ({ funnel }) => dispatch(updateFunnelInList(funnel));
    const onDeleted = ({ funnelId }) => dispatch(removeFunnel(funnelId));
    socket.on('funnel:created', onCreated);
    socket.on('funnel:updated', onUpdated);
    socket.on('funnel:deleted', onDeleted);
    return () => {
      socket.off('funnel:created', onCreated);
      socket.off('funnel:updated', onUpdated);
      socket.off('funnel:deleted', onDeleted);
    };
  }, [orgId, dispatch]);

  // Push notification subscription — faqat bir marta, ruxsat so'ragandan keyin
  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'granted') {
      subscribeToPush(token).catch(() => {});
      return;
    }
    // 'default' → so'rang
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') subscribeToPush(token).catch(() => {});
    });
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/r/:slug"         element={<ReviewLandingPage />} />
        <Route path="/f/:slug"         element={<LeadFormPage />} />
        <Route path="/dashboard"       element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/contacts"            element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/contacts/new"        element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/contacts/analytics"  element={<PrivateRoute><ContactAnalyticsPage /></PrivateRoute>} />
        <Route path="/contacts/:id"        element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/settings"        element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="/settings/users/:id" element={<AdminRoute><UserProfilePage /></AdminRoute>} />
        <Route path="/account"         element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/tasks"                   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/inbox"                   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/inbox/analytics"         element={<PrivateRoute><InboxAnalyticsPage /></PrivateRoute>} />
        <Route path="/reviews"                 element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/calls"                   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/funnel/:id"              element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/funnel/:id/deal/new"     element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/funnel/:id/deal/:dealId" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <LockScreen />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Toaster position="top-center" />
      <UpdatePrompt />
      <AppInit />
    </Provider>
  );
}
