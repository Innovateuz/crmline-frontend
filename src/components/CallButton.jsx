import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PhoneCall, Phone, Loader2, X } from 'lucide-react';
import { updateProfile } from '../store/authSlice';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// Tashkilotning "Qo'ng'iroq qilish usuli" sozlamasi (Settings -> ATC): 'atc' |
// 'personal' | 'both'. ATC ulanmagan bo'lsa - sozlamadan qat'i nazar har doim
// shaxsiy telefon (tel:) ishlatiladi, chunki ATC orqali qo'ng'iroq umuman
// imkonsiz bo'ladi.
function useCallMode() {
  const atc = useSelector(s => s.auth.user?.organization?.atc) || {};
  if (!atc.connected) return 'personal';
  return atc.callMode || 'both';
}

// Ichki raqam (ext) profilda saqlanmagan bo'lsa ATC qo'ng'iroq shu yerda so'raladi -
// akkaunt sahifasiga o'tib qaytib kelish shart emas. "Akkauntda saqlash" belgilansa
// keyingi safar bu oyna umuman chiqmaydi (AccountPage'dagi saqlash bilan bir xil maydon).
function ExtPromptModal({ phone, submitting, onClose, onSubmit }) {
  const [ext,  setExt]  = useState('');
  const [save, setSave] = useState(true);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink text-sm">Ichki raqamingiz (ext)</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-tertiary hover:bg-surface-100"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-ink-tertiary mb-3">
          ATC orqali qo'ng'iroq qilish uchun ichki raqam kerak. Raqam: <span className="font-mono font-semibold text-ink">{phone}</span>
        </p>
        <form onSubmit={e => { e.preventDefault(); if (ext.trim()) onSubmit(ext.trim(), save); }} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Kengaytma (ext)</label>
            <input className="input" placeholder="Masalan: 701" value={ext}
              onChange={e => setExt(e.target.value)} autoFocus required />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer select-none">
            <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} className="rounded border-surface-300" />
            Akkauntimda saqlash — keyin qayta so'ralmasin
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary btn-md">Bekor</button>
            <button type="submit" disabled={submitting} className="btn-primary btn-md flex items-center gap-2">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
              Qo'ng'iroq
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Tashkilot bo'yicha bitta joydan boshqariladigan qo'ng'iroq tugmasi - Contacts,
// Contact/Deal detail, Calls sahifalarining barchasida shu ishlatiladi, aks holda
// har bir joy o'zicha ATC yoki tel: tanlab, urinishlar mos kelmay qolardi.
export default function CallButton({ phone, className, iconClassName = 'w-4 h-4', title = "Qo'ng'iroq qilish" }) {
  const dispatch = useDispatch();
  const userName = useSelector(s => s.auth.user?.name);
  const mode = useCallMode();
  const [calling, setCalling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [extPrompt, setExtPrompt] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  if (!phone) return null;

  const btnCls = className || 'p-1.5 rounded-lg text-ink-tertiary hover:text-green-600 hover:bg-green-50 transition-colors';

  const callViaAtc = async (e) => {
    e?.stopPropagation();
    if (calling) return;
    setCalling(true);
    try {
      await axios.post(`${API}/atc/call`, { phone });
      toast.success("Qo'ng'iroq boshlanmoqda...");
    } catch (err) {
      const msg = err.response?.data?.message || 'Xato';
      // Profilda ichki raqam saqlanmagan — shu yerda so'raymiz, statik xato ko'rsatib
      // Akkaunt sahifasiga jo'natish o'rniga.
      if (msg.includes('ext')) setExtPrompt(true);
      else toast.error(msg);
    } finally {
      setCalling(false);
    }
  };

  const submitExtPrompt = async (ext, saveToProfile) => {
    setCalling(true);
    try {
      if (saveToProfile) {
        await dispatch(updateProfile({ name: userName, atcExtension: ext })).unwrap();
      }
      await axios.post(`${API}/atc/call`, { phone, ext });
      toast.success("Qo'ng'iroq boshlanmoqda...");
      setExtPrompt(false);
    } catch (err) {
      // updateProfile'ning unwrap() rad etilganda xato matnini string sifatida
      // tashlaydi (rejectWithValue), axios xatosi esa err.response.data.message'da.
      const msg = typeof err === 'string' ? err : (err.response?.data?.message || 'Xato');
      toast.error(msg);
    } finally {
      setCalling(false);
    }
  };

  if (mode === 'personal') {
    return (
      <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} title={title} className={btnCls}>
        <PhoneCall className={iconClassName} />
      </a>
    );
  }

  const extModal = extPrompt && (
    <ExtPromptModal phone={phone} submitting={calling}
      onClose={() => setExtPrompt(false)} onSubmit={submitExtPrompt} />
  );

  if (mode === 'atc') {
    return (
      <>
        <button type="button" onClick={callViaAtc} disabled={calling} title={`${title} (ATC)`} className={btnCls}>
          {calling ? <Loader2 className={`${iconClassName} animate-spin`} /> : <PhoneCall className={iconClassName} />}
        </button>
        {extModal}
      </>
    );
  }

  // both — tanlov popover
  return (
    <div className="relative inline-block" ref={menuRef}>
      <button type="button" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} disabled={calling}
        title={title} className={btnCls}>
        {calling ? <Loader2 className={`${iconClassName} animate-spin`} /> : <PhoneCall className={iconClassName} />}
      </button>
      {menuOpen && (
        <div onClick={e => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-48 bg-white border border-surface-200 rounded-xl shadow-lg py-1 z-30">
          <button type="button" onClick={e => { setMenuOpen(false); callViaAtc(e); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface-50 transition-colors">
            <Phone className="w-3.5 h-3.5 text-primary-500 shrink-0" /> ATC orqali
          </button>
          <a href={`tel:${phone}`} onClick={e => { e.stopPropagation(); setMenuOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface-50 transition-colors">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Shaxsiy telefondan
          </a>
        </div>
      )}
      {extModal}
    </div>
  );
}
