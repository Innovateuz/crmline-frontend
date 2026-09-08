import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { updateProfile } from '../store/authSlice';
import { Loader2, KeyRound, Eye, EyeOff, Phone } from 'lucide-react';
import { useT } from '../utils/translate';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const ROLE_LABELS = {
  owner: 'Egasi',
  admin: 'Admin',
  user:  'Foydalanuvchi',
};

export default function AccountPage() {
  const dispatch  = useDispatch();
  const user      = useSelector(s => s.auth.user);
  const t = useT();

  // Name form
  const [name,      setName]      = useState(user?.name || '');
  const [atcExtension, setAtcExtension] = useState(user?.atcExtension || '');
  const [phone,     setPhone]     = useState((user?.phone || '').replace(/^\+?998/, ''));
  const [nameSaving, setNameSaving] = useState(false);

  // Password form
  const [showPw,    setShowPw]    = useState(false);
  const [oldPw,     setOldPw]     = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);

  const currentPhoneDigits = (user?.phone || '').replace(/^\+?998/, '');
  const nameDirty = name.trim() !== (user?.name || '') || atcExtension.trim() !== (user?.atcExtension || '') || phone !== currentPhoneDigits;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || !nameDirty) return;
    if (phone !== currentPhoneDigits && phone.length !== 9) {
      toast.error("Telefon raqam 9 ta raqamdan iborat bo'lishi kerak");
      return;
    }
    setNameSaving(true);
    try {
      const body = { name: name.trim(), atcExtension: atcExtension.trim() };
      if (phone !== currentPhoneDigits) body.phone = '+998' + phone;
      const res = await axios.put(`${API}/auth/update-profile`, body);
      dispatch(updateProfile(res.data.user || { name: name.trim(), atcExtension: atcExtension.trim(), phone: body.phone }));
      toast.success('Saqlandi');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 4) { toast.error(t('account.passwordTooShort')); return; }
    setPwSaving(true);
    try {
      const res = await axios.put(`${API}/auth/change-password`, { currentPassword: oldPw, newPassword: newPw });
      if (res.data.token) localStorage.setItem('token', res.data.token);
      toast.success(t('account.passwordChanged'));
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
        <h1 className="text-xl font-bold text-ink">{t('account.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Profile info card */}
        <div className="bg-white rounded-xl border border-surface-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">{t('account.personalInfo')}</p>
          </div>

          <form onSubmit={handleSaveName}>
            {/* Name — editable */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">{t('account.name')}</span>
              <input
                className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('account.namePlaceholder')}
              />
            </div>

            {/* ATC extension — editable */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Ichki raqam</span>
              <input
                className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled font-mono"
                value={atcExtension}
                onChange={e => setAtcExtension(e.target.value)}
                placeholder="Masalan: 209"
              />
            </div>
            <p className="px-4 -mt-1 pb-2 text-xs text-ink-tertiary border-b border-surface-100">
              ATC (Sipuni/ibrat.sip.uz) ichki raqamingiz — qo'ng'iroq qilishda har safar qayta kiritmasligingiz uchun.
            </p>

            {/* Phone — editable (login uchun ham ishlatiladi) */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">{t('contactForm.phone')}</span>
              <div className="flex-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                <span className="text-sm text-ink-secondary shrink-0">+998</span>
                <input
                  className="flex-1 text-sm text-ink bg-transparent border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-ink-disabled font-mono"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  inputMode="numeric" maxLength={9}
                  placeholder="901234567"
                />
              </div>
            </div>
            <p className="px-4 -mt-1 pb-2 text-xs text-ink-tertiary border-b border-surface-100">
              Bu raqam tizimga kirish (login) uchun ham ishlatiladi — o'zgartirsangiz, keyingi safar yangi raqam bilan kiring.
            </p>

            {/* Email — read only */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">Email</span>
              <span className="flex-1 text-sm text-ink-secondary">{user?.email || '—'}</span>
            </div>

            {/* Role — read only */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
              <span className="w-28 text-sm text-ink shrink-0">{t('account.role')}</span>
              <span className="flex-1 text-sm text-ink-secondary">
                {ROLE_LABELS[user?.role] || user?.role || '—'}
              </span>
            </div>

            {/* Save name */}
            <div className="px-4 py-3 flex justify-end">
              <button
                type="submit"
                disabled={nameSaving || !name.trim() || !nameDirty}
                className="btn-md btn-primary"
              >
                {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('contactForm.save')}
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
              <span className="text-sm font-medium text-ink">{t('account.changePassword')}</span>
            </div>
            <span className="text-xs text-ink-tertiary">{showPw ? t('account.hide') : t('account.show')}</span>
          </button>

          {showPw && (
            <form onSubmit={handleChangePassword} className="border-t border-surface-100">
              <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-100">
                <span className="w-28 text-sm text-ink shrink-0">{t('account.currentPassword')}</span>
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
                <span className="w-28 text-sm text-ink shrink-0">{t('account.newPassword')}</span>
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
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('account.changePasswordBtn')}
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
