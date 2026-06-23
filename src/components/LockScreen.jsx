import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lock, Loader2, LogOut, Eye, EyeOff } from 'lucide-react';
import { unlockScreen, logout, logoutUser } from '../store/authSlice';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Ekran qulflanganida butun ekran ustida chiqadigan overlay.
// Foydalanuvchi parolini kiritsa — tasdiqlanadi va ochiladi.
// Sessiya saqlanadi (logout emas), faqat UI bloklangan.
export default function LockScreen() {
  const dispatch = useDispatch();
  const { user, locked } = useSelector((s) => s.auth);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const [time, setTime] = useState(new Date());

  // Soat ko'rinishi uchun
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  // Overlay ochilganda input'ga fokus
  useEffect(() => {
    if (locked) setTimeout(() => inputRef.current?.focus(), 100);
  }, [locked]);

  // Brauzerda back/refresh ham qulflashni o'chirib yubormaydi (localStorage'da)
  if (!locked) return null;

  const unlock = async (e) => {
    e?.preventDefault();
    if (!password) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/verify-password`, { password }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      dispatch(unlockScreen());
      setPassword('');
      toast.success('Ochildi');
    } catch (err) {
      toast.error(err.response?.data?.message || "Parol noto'g'ri");
      setPassword('');
      inputRef.current?.focus();
    } finally { setBusy(false); }
  };

  const handleLogout = async () => {
    if (!window.confirm("Hisobdan to'liq chiqilsinmi?")) return;
    try { await dispatch(logoutUser()).unwrap(); } catch {}
    dispatch(logout());
  };

  const fmtTime = (d) => {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const fmtDate = (d) => d.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary-800 via-primary-900 to-ink flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Top clock */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center text-white/80">
        <div className="text-6xl font-light tracking-tight mb-1">{fmtTime(time)}</div>
        <div className="text-sm capitalize">{fmtDate(time)}</div>
      </div>

      {/* Main card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
        {/* Avatar + lock icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <span className="text-white text-3xl font-bold">{user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <p className="mt-4 text-base font-semibold text-ink">{user?.name || 'Foydalanuvchi'}</p>
          <p className="text-xs text-ink-tertiary">{user?.organization?.name || ''}</p>
        </div>

        {/* Password form */}
        <form onSubmit={unlock} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-tertiary mb-1.5">Ekranni ochish uchun parol</label>
            <div className="relative">
              <input
                ref={inputRef}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parol"
                disabled={busy}
                className="input pr-10"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-tertiary hover:text-ink"
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy || !password}
            className="w-full btn-primary btn-md flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Ochish
          </button>
        </form>

        {/* Logout link */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full text-xs text-ink-tertiary hover:text-red-600 flex items-center justify-center gap-1.5 py-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Boshqa hisob bilan kirish
        </button>
      </div>
    </div>
  );
}
