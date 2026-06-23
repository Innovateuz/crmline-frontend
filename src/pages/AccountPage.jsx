import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { updateProfile } from '../store/authSlice';
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const ROLE_LABELS = {
  owner: 'Egasi',
  admin: 'Admin',
  user:  'Foydalanuvchi',
};

export default function AccountPage() {
  const dispatch  = useDispatch();
  const user      = useSelector(s => s.auth.user);

  // Name form
  const [name,      setName]      = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);

  // Password form
  const [showPw,    setShowPw]    = useState(false);
  const [oldPw,     setOldPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === user?.name) return;
    setNameSaving(true);
    try {
      const res = await axios.put(`${API}/auth/update-profile`, { name: name.trim() });
      dispatch(updateProfile(res.data.user || { name: name.trim() }));
      toast.success('Saqlandi');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 4) { toast.error("Parol kamida 4 ta belgi bo'lishi kerak"); return; }
    setPwSaving(true);
    try {
      const res = await axios.put(`${API}/auth/change-password`, { currentPassword: oldPw, newPassword: newPw });
      if (res.data.token) localStorage.setItem('token', res.data.token);
      toast.success('Parol o\'zgartirildi');
      setOldPw('');
      setNewPw('');
      setShowPw(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-100 bg-white shrink-0">
        <h1 className="text-xl font-bold text-ink">Akkaunt sozlamalari</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Profile info card */}
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Profil</p>
          </div>

          <form onSubmit={handleSaveName}>
            {/* Name — editable */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Ism</span>
              <input
                className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ism familiya"
              />
            </div>

            {/* Phone — read only */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Telefon</span>
              <span className="flex-1 text-sm text-ink-secondary">{user?.phone || '—'}</span>
            </div>

            {/* Email — read only */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Email</span>
              <span className="flex-1 text-sm text-ink-secondary">{user?.email || '—'}</span>
            </div>

            {/* Role — read only */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Rol</span>
              <span className="flex-1 text-sm text-ink-secondary">
                {ROLE_LABELS[user?.role] || user?.role || '—'}
              </span>
            </div>

            {/* Save name */}
            <div className="px-4 py-3 flex justify-end">
              <button
                type="submit"
                disabled={nameSaving || !name.trim() || name.trim() === user?.name}
                className="btn-md btn-primary"
              >
                {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>

        {/* Password card */}
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-surface-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-ink-tertiary" />
              <span className="text-sm font-medium text-ink">Parolni o'zgartirish</span>
            </div>
            <span className="text-xs text-ink-tertiary">{showPw ? 'Yopish' : 'Ochish'}</span>
          </button>

          {showPw && (
            <form onSubmit={handleChangePassword} className="border-t border-surface-100">
              <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
                <span className="w-28 text-sm text-ink shrink-0">Eski parol</span>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type={showOld ? 'text' : 'password'}
                    className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                    placeholder="••••••••"
                    value={oldPw}
                    onChange={e => setOldPw(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowOld(p => !p)} className="text-ink-tertiary hover:text-ink transition-colors shrink-0">
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
                <span className="w-28 text-sm text-ink shrink-0">Yangi parol</span>
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                    placeholder="kamida 4 belgi"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    minLength={4}
                  />
                  <button type="button" onClick={() => setShowNew(p => !p)} className="text-ink-tertiary hover:text-ink transition-colors shrink-0">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 flex justify-end">
                <button type="submit" disabled={pwSaving} className="btn-md btn-primary">
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "O'zgartirish"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}
