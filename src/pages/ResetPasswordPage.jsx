import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Building2, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Parol kamida 6 ta belgi bo'lishi kerak");
    if (password !== confirm) return toast.error('Parollar mos kelmadi');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      toast.success("Parol o'zgartirildi. Endi kiring.");
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xato');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-primary-700 flex flex-col">
      <div className="flex items-center justify-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
          <span className="font-bold text-white text-lg tracking-tight">CRM Line</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-modal p-8">
          <h1 className="text-xl font-bold text-ink mb-1.5">Yangi parol</h1>
          {!token ? (
            <>
              <p className="text-sm text-ink-tertiary mb-6">Havola yaroqsiz. Iltimos, parolni tiklashni qaytadan boshlang.</p>
              <button onClick={() => navigate('/forgot-password')} className="btn-primary btn-md w-full">Qaytadan urinish</button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-tertiary mb-6">Yangi parolingizni kiriting.</p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Yangi parol</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                    <input type={show ? 'text' : 'password'} className="input input-with-icon pr-10" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="new-password" />
                    <button type="button" onClick={() => setShow(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Parolni tasdiqlang</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
                    <input type={show ? 'text' : 'password'} className="input input-with-icon" value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="••••••" autoComplete="new-password" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</> : "Parolni o'zgartirish"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
