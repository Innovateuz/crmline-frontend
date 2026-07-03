import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const PLATFORM_LABEL = {
  google: 'Google',
  yandex: 'Yandex',
  '2gis': '2GIS',
  tripadvisor: 'TripAdvisor',
};
const PLATFORM_COLOR = {
  google: '#4285F4',
  yandex: '#FF0000',
  '2gis': '#19AA1E',
  tripadvisor: '#00AA6C',
};

// O'zbekiston raqamini +998 90 123 45 67 ko'rinishida formatlash (ixtiyoriy maydon).
function formatUzPhone(raw) {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return '';
  let out = '+998';
  if (d.length > 0) out += ' ' + d.slice(0, 2);
  if (d.length > 2) out += ' ' + d.slice(2, 5);
  if (d.length > 5) out += ' ' + d.slice(5, 7);
  if (d.length > 7) out += ' ' + d.slice(7, 9);
  return out;
}

export default function ReviewLandingPage() {
  const { slug } = useParams();
  const [page, setPage]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [rating, setRating]   = useState(0);      // gating uchun tanlangan yulduz
  const [hover, setHover]     = useState(0);      // yulduz ustiga olib borilganda
  const [stage, setStage]     = useState('rate'); // rate | contact | platforms | feedback | done
  const [sending, setSending] = useState(false);
  const [fb, setFb]           = useState({ text: '', name: '', phone: '' });

  useEffect(() => {
    axios.get(`${API_URL}/reviews/p/${slug}`)
      .then(r => {
        setPage(r.data.page);
        // gating o'chiq bo'lsa, to'g'ridan platformalar
        if (!r.data.page.gating?.enabled) setStage('platforms');
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // skan qayd
    axios.post(`${API_URL}/reviews/p/${slug}/scan`).catch(() => {});
  }, [slug]);

  const color = page?.brandColor || '#b9183b';

  const pickRating = (n) => {
    setRating(n);
    const min = page.gating?.minStars || 4;
    // Yuqori baho -> avval kontakt bosqichi, keyin map tanlash; past baho -> ichki feedback.
    setStage(n >= min ? 'contact' : 'feedback');
  };

  // Kontaktni saqlab (yoki skip qilib) platformalarga o'tish.
  const goToPlatforms = async (withContact) => {
    if (withContact && (fb.name.trim() || fb.phone.trim())) {
      setSending(true);
      await axios.post(`${API_URL}/reviews/p/${slug}/contact`, {
        rating, name: fb.name.trim(), phone: fb.phone.trim(),
      }).catch(() => {});
      setSending(false);
    }
    setStage('platforms');
  };

  const openPlatform = (p) => {
    axios.post(`${API_URL}/reviews/p/${slug}/click`, { platform: p.type, rating }).catch(() => {});
    window.location.href = p.url;
  };

  const sendFeedback = async () => {
    setSending(true);
    await axios.post(`${API_URL}/reviews/p/${slug}/feedback`, { rating, ...fb }).catch(() => {});
    setSending(false);
    setStage('done');
  };

  if (loading) return <Center>Yuklanmoqda…</Center>;
  if (error || !page) return <Center>Sahifa topilmadi</Center>;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12,
    border: '1px solid #e0e0e6', fontSize: 16, fontFamily: 'inherit', outline: 'none',
    marginBottom: 10, transition: 'border-color .15s',
  };
  const primaryBtn = {
    width: '100%', padding: 15, borderRadius: 14, border: 'none', background: color,
    color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 6px 18px ${hexA(color, 0.35)}`, transition: 'transform .1s, opacity .15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes rl-pop { 0%{transform:scale(.5);opacity:0} 60%{transform:scale(1.18)} 100%{transform:scale(1);opacity:1} }
        @keyframes rl-fade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .rl-in { animation: rl-fade .35s ease both; }
        .rl-star-pop { display:inline-block; animation: rl-pop .4s ease both; }
        .rl-input:focus { border-color: ${color} !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,.08)', padding: 28, textAlign: 'center' }}>
        {page.logo
          ? <img src={page.logo} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', margin: '0 auto 14px' }} />
          : <div style={{ width: 72, height: 72, borderRadius: 16, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, margin: '0 auto 14px' }}>{(page.name || page.orgName || '?')[0]}</div>}
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>{page.name || page.orgName}</h1>

        {/* RATE */}
        {stage === 'rate' && (
          <div className="rl-in">
            <p style={{ color: '#666', margin: '0 0 18px' }}>{page.headline}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}
                 onMouseLeave={() => setHover(0)}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => pickRating(n)}
                  style={{ background: 'none', border: 'none', fontSize: 42, cursor: 'pointer', color: n <= (hover || rating) ? '#FFB400' : '#ddd', transition: 'transform .12s, color .12s', transform: n <= hover ? 'scale(1.15)' : 'scale(1)' }}
                  onMouseEnter={() => setHover(n)}>★</button>
              ))}
            </div>
          </div>
        )}

        {/* CONTACT (yuqori baho — map'ga o'tishdan oldin, ixtiyoriy) */}
        {stage === 'contact' && (
          <div className="rl-in">
            {/* Tanlangan yulduzlar — bayramona tasdiq */}
            <div style={{ margin: '6px 0 2px' }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} className="rl-star-pop"
                  style={{ fontSize: 30, color: n <= rating ? '#FFB400' : '#eee', animationDelay: `${n * 60}ms` }}>★</span>
              ))}
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: '10px 0 4px', color: '#1a1a1a' }}>
              Bahoyingiz uchun rahmat! 🎉
            </h2>
            <p style={{ color: '#666', margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.5 }}>
              Maxsus takliflar va chegirmalardan birinchi bo'lib xabardor bo'lish uchun ma'lumotlaringizni qoldiring 🎁
            </p>

            <input value={fb.name} onChange={e => setFb({ ...fb, name: e.target.value })}
              className="rl-input" style={inputStyle} placeholder="Ismingiz" autoFocus />
            <input value={fb.phone} onChange={e => setFb({ ...fb, phone: formatUzPhone(e.target.value) })}
              className="rl-input" style={inputStyle} placeholder="+998 90 123 45 67"
              inputMode="numeric" type="tel" />

            <button onClick={() => goToPlatforms(true)} disabled={sending}
              style={{ ...primaryBtn, opacity: sending ? 0.7 : 1 }}>
              {sending ? 'Yuborilmoqda…' : 'Davom etish →'}
            </button>

            <button onClick={() => goToPlatforms(false)} disabled={sending}
              style={{ display: 'block', width: '100%', marginTop: 12, background: 'none', border: 'none', color: '#9a9aa2', fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
              Hozircha o'tkazib yuborish
            </button>

            <p style={{ marginTop: 14, fontSize: 12, color: '#bbb' }}>🔒 Ma'lumotlaringiz uchinchi shaxslarga berilmaydi</p>
          </div>
        )}

        {/* PLATFORMS (yaxshi baho) */}
        {stage === 'platforms' && (
          <div className="rl-in">
            <p style={{ color: '#666', margin: '0 0 18px' }}>Deyarli tayyor! Qayerda otziv qoldirasiz?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {page.platforms.map(p => (
                <button key={p.type} onClick={() => openPlatform(p)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 16px', borderRadius: 12, border: '1px solid #e6e6eb', background: '#fff', color: '#1a1a1a', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}>
                  <PlatformLogo type={p.type} />
                  {PLATFORM_LABEL[p.type] || p.type}'da baholash
                </button>
              ))}
              {page.platforms.length === 0 && <p style={{ color: '#999' }}>Platforma sozlanmagan</p>}
            </div>
          </div>
        )}

        {/* FEEDBACK (past baho) */}
        {stage === 'feedback' && (
          <div className="rl-in">
            <p style={{ color: '#666', margin: '0 0 14px' }}>Kechirasiz! Nima yoqmaganini ayting — biz tuzatamiz.</p>
            <textarea value={fb.text} onChange={e => setFb({ ...fb, text: e.target.value })}
              placeholder="Fikringiz…" rows={3} className="rl-input"
              style={{ ...inputStyle, resize: 'vertical' }} />
            <input value={fb.name} onChange={e => setFb({ ...fb, name: e.target.value })}
              className="rl-input" style={inputStyle} placeholder="Ismingiz (ixtiyoriy)" />
            <input value={fb.phone} onChange={e => setFb({ ...fb, phone: formatUzPhone(e.target.value) })}
              className="rl-input" style={inputStyle} placeholder="Telefon (ixtiyoriy)"
              inputMode="numeric" type="tel" />
            <button onClick={sendFeedback} disabled={sending}
              style={{ ...primaryBtn, opacity: sending ? 0.7 : 1 }}>
              {sending ? 'Yuborilmoqda…' : 'Yuborish'}
            </button>
          </div>
        )}

        {/* DONE */}
        {stage === 'done' && (
          <div className="rl-in">
            <div style={{ fontSize: 48, margin: '10px 0' }}>🙏</div>
            <p style={{ color: '#444', fontWeight: 600 }}>Rahmat! Fikringiz biz uchun muhim.</p>
          </div>
        )}

        <p style={{ marginTop: 22, fontSize: 12, color: '#bbb' }}>CRM Line</p>
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'system-ui' }}>{children}</div>;
}

// #rrggbb + alpha -> rgba() (soya rangi uchun)
function hexA(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return `rgba(185,24,59,${a})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

// Platforma logotipi — Google/Yandex uchun brend logolari, qolganlari uchun rangli fallback
function PlatformLogo({ type, size = 22 }) {
  if (type === 'google') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  if (type === 'yandex') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#FC3F1D" />
        <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">Я</text>
      </svg>
    );
  }
  // Boshqa platformalar — rang + bosh harf
  const bg = PLATFORM_COLOR[type] || '#888';
  const label = (PLATFORM_LABEL[type] || type || '?')[0].toUpperCase();
  return (
    <span style={{ width: size, height: size, borderRadius: 6, background: bg, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, fontWeight: 700 }}>
      {label}
    </span>
  );
}
