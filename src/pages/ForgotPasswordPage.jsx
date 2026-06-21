import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Building2, Server, Phone, Loader2, ArrowLeft, MailCheck } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!slug.trim() || !phone) return toast.error('Server va telefon kiritilishi shart');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { slug: slug.trim(), phone: '+998' + phone });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-700 flex flex-col">
      <div className="flex items-center justify-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-white text-lg tracking-tight">ERP Line</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-modal p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-7 h-7 text-primary-600" />
              </div>
              <h1 className="text-lg font-bold text-ink">Tekshiring</h1>
              <p className="text-sm text-ink-tertiary mt-2 leading-relaxed">
                Agar bunday foydalanuvchi mavjud bo'lsa, parolni tiklash havolasi emailga yuborildi. Havola 1 soat amal qiladi.
              </p>
              <button onClick={() => navigate('/login')} className="btn-primary btn-md mt-6 w-full">Kirishga qaytish</button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-ink mb-1.5">Parolni tiklash</h1>
              <p className="text-sm text-ink-tertiary mb-6">Server va telefon raqamingizni kiriting — emailingizga tiklash havolasi yuboriladi.</p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Server</label>
                  <div className="relative">
                    <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                    <input className="input input-with-icon" value={slug} onChange={e => setSlug(e.target.value)} placeholder="server..." autoCapitalize="none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Telefon</label>
                  <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 bg-surface-100 border border-r-0 border-surface-200 rounded-l-lg text-sm font-medium text-ink-secondary select-none shrink-0">
                      <Phone className="w-3.5 h-3.5 text-ink-tertiary" />+998
                    </div>
                    <input type="tel" className="input rounded-l-none flex-1" value={phone} inputMode="numeric" maxLength={9}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="90 123 45 67" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilmoqda...</> : 'Havola yuborish'}
                </button>
                <button type="button" onClick={() => navigate('/login')} className="w-full flex items-center justify-center gap-1.5 text-sm text-ink-tertiary hover:text-ink transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Kirishga qaytish
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
