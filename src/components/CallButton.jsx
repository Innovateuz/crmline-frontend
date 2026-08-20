import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PhoneCall, Phone, Loader2 } from 'lucide-react';

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

// Tashkilot bo'yicha bitta joydan boshqariladigan qo'ng'iroq tugmasi - Contacts,
// Contact/Deal detail, Calls sahifalarining barchasida shu ishlatiladi, aks holda
// har bir joy o'zicha ATC yoki tel: tanlab, urinishlar mos kelmay qolardi.
export default function CallButton({ phone, className, iconClassName = 'w-4 h-4', title = "Qo'ng'iroq qilish" }) {
  const mode = useCallMode();
  const [calling, setCalling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
      toast.error(msg.includes('ext') ? "Avval Akkaunt sozlamalarida ichki raqamingizni saqlang" : msg);
    } finally {
      setCalling(false);
    }
  };

  if (mode === 'personal') {
    return (
      <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} title={title} className={btnCls}>
        {calling ? <Loader2 className={`${iconClassName} animate-spin`} /> : <PhoneCall className={iconClassName} />}
      </a>
    );
  }

  if (mode === 'atc') {
    return (
      <button type="button" onClick={callViaAtc} disabled={calling} title={`${title} (ATC)`} className={btnCls}>
        {calling ? <Loader2 className={`${iconClassName} animate-spin`} /> : <PhoneCall className={iconClassName} />}
      </button>
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
    </div>
  );
}
