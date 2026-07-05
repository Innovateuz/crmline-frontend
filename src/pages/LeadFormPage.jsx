import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const TR = {
  uz: {
    loading: 'Yuklanmoqda…', notFound: 'Forma topilmadi',
    namePh: 'Ismingiz *', phonePh: 'Telefon raqamingiz *',
    submit: 'Yuborish', sending: 'Yuborilmoqda…',
    thanks: 'Rahmat! 🎉', thanksSub: "Arizangiz qabul qilindi, tez orada siz bilan bog'lanamiz.",
    required: "to'ldirilishi shart", genericError: 'Xato yuz berdi, qayta urinib ko\'ring', yes: 'Ha',
  },
  ru: {
    loading: 'Загрузка…', notFound: 'Форма не найдена',
    namePh: 'Ваше имя *', phonePh: 'Номер телефона *',
    submit: 'Отправить', sending: 'Отправка…',
    thanks: 'Спасибо! 🎉', thanksSub: 'Ваша заявка принята, мы скоро свяжемся с вами.',
    required: 'обязательно для заполнения', genericError: 'Произошла ошибка, попробуйте снова', yes: 'Да',
  },
  en: {
    loading: 'Loading…', notFound: 'Form not found',
    namePh: 'Your name *', phonePh: 'Your phone number *',
    submit: 'Submit', sending: 'Sending…',
    thanks: 'Thank you! 🎉', thanksSub: "Your request has been received, we'll contact you soon.",
    required: 'is required', genericError: 'Something went wrong, please try again', yes: 'Yes',
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem('reviewLang');
    if (saved && TR[saved]) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || 'uz').slice(0, 2);
  return TR[nav] ? nav : 'uz';
}

function Center({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#666' }}>
      {children}
    </div>
  );
}

function hexA(hex, a) {
  const h = (hex || '#16a34a').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r || 0},${g || 0},${b || 0},${a})`;
}

export default function LeadFormPage() {
  const { slug } = useParams();
  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [lang,    setLang]    = useState(detectLang);
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);

  const tr = TR[lang] || TR.uz;

  useEffect(() => {
    axios.get(`${API_URL}/lead-forms/p/${slug}`)
      .then(r => setForm(r.data.form))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const setAnswer = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const color = form?.brandColor || '#16a34a';

  const submit = async () => {
    if (!name.trim() || !phone.trim()) { alert(tr.namePh + ' / ' + tr.phonePh); return; }
    for (const f of (form.fields || [])) {
      if (f.required && !String(answers[f.key] ?? '').trim()) {
        alert(`"${f.key}" ${tr.required}`);
        return;
      }
    }
    setSending(true);
    try {
      await axios.post(`${API_URL}/lead-forms/p/${slug}/submit`, { name, phone, answers });
      setDone(true);
    } catch (err) {
      alert(err.response?.data?.message || tr.genericError);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Center>{tr.loading}</Center>;
  if (error || !form) return <Center>{tr.notFound}</Center>;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
    border: '1px solid #e0e0e6', fontSize: 16, fontFamily: 'inherit', outline: 'none',
    marginBottom: 10, transition: 'border-color .15s',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', margin: '0 0 6px', textAlign: 'left' };
  const primaryBtn = {
    width: '100%', padding: 15, borderRadius: 14, border: 'none', background: color,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: sending ? 'default' : 'pointer',
    opacity: sending ? 0.7 : 1, boxShadow: `0 6px 18px ${hexA(color, 0.35)}`,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`.lf-input:focus { border-color: ${color} !important; }`}</style>

      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,.08)', padding: 28, textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 2, background: '#f0f0f3', borderRadius: 9, padding: 2 }}>
          {['uz', 'ru', 'en'].map(l => (
            <button key={l} onClick={() => { setLang(l); try { localStorage.setItem('reviewLang', l); } catch { /* ignore */ } }}
              style={{ border: 'none', background: lang === l ? '#fff' : 'transparent', color: lang === l ? '#1a1a1a' : '#9a9aa2', fontWeight: 600, fontSize: 12, padding: '4px 8px', borderRadius: 7, cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              {l}
            </button>
          ))}
        </div>

        {form.logo
          ? <img src={form.logo} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', margin: '0 auto 14px' }} />
          : <div style={{ width: 64, height: 64, borderRadius: 16, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, margin: '0 auto 14px' }}>{(form.orgName || form.name || '?')[0]}</div>}

        {done ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: '#1a1a1a' }}>{tr.thanks}</h1>
            <p style={{ color: '#666', margin: 0 }}>{tr.thanksSub}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>{form.headline}</h1>
            {form.subtext && <p style={{ color: '#666', margin: '0 0 18px', fontSize: 14 }}>{form.subtext}</p>}

            <div style={{ textAlign: 'left', marginTop: 18 }}>
              <label style={labelStyle}>{tr.namePh}</label>
              <input className="lf-input" style={inputStyle} value={name} onChange={e => setName(e.target.value)} />

              <label style={labelStyle}>{tr.phonePh}</label>
              <input className="lf-input" style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />

              {(form.fields || []).map(f => (
                <div key={f.id}>
                  <label style={labelStyle}>{f.key}{f.required && ' *'}</label>
                  {f.type === 'textarea' && (
                    <textarea className="lf-input" style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
                      value={answers[f.key] || ''} onChange={e => setAnswer(f.key, e.target.value)} />
                  )}
                  {f.type === 'boolean' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 15, color: '#333' }}>
                      <input type="checkbox" checked={!!answers[f.key]} onChange={e => setAnswer(f.key, e.target.checked)} />
                      {tr.yes}
                    </label>
                  )}
                  {f.type === 'dropdown' && (
                    <select className="lf-input" style={inputStyle} value={answers[f.key] || ''} onChange={e => setAnswer(f.key, e.target.value)}>
                      <option value="">—</option>
                      {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {f.type === 'multiselect' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {(f.options || []).map(o => {
                        const arr = Array.isArray(answers[f.key]) ? answers[f.key] : [];
                        const checked = arr.includes(o);
                        return (
                          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, background: checked ? hexA(color, 0.12) : '#f5f5f7', padding: '6px 10px', borderRadius: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => setAnswer(f.key, checked ? arr.filter(x => x !== o) : [...arr, o])} />
                            {o}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {!['textarea', 'boolean', 'dropdown', 'multiselect'].includes(f.type) && (
                    <input className="lf-input" style={inputStyle}
                      type={{ number: 'number', date: 'date', email: 'email', url: 'url', phone: 'tel' }[f.type] || 'text'}
                      value={answers[f.key] || ''} onChange={e => setAnswer(f.key, e.target.value)} />
                  )}
                </div>
              ))}

              <button style={primaryBtn} disabled={sending} onClick={submit}>
                {sending ? tr.sending : tr.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
