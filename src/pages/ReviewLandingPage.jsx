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

export default function ReviewLandingPage() {
  const { slug } = useParams();
  const [page, setPage]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [rating, setRating]   = useState(0);     // gating uchun tanlangan yulduz
  const [stage, setStage]     = useState('rate'); // rate | platforms | feedback | done
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
    setStage(n >= min ? 'platforms' : 'feedback');
  };

  const openPlatform = (p) => {
    axios.post(`${API_URL}/reviews/p/${slug}/click`, { platform: p.type, rating }).catch(() => {});
    window.location.href = p.url;
  };

  const sendFeedback = async () => {
    await axios.post(`${API_URL}/reviews/p/${slug}/feedback`, { rating, ...fb }).catch(() => {});
    setStage('done');
  };

  if (loading) return <Center>Yuklanmoqda…</Center>;
  if (error || !page) return <Center>Sahifa topilmadi</Center>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, boxShadow: '0 10px 40px rgba(0,0,0,.08)', padding: 28, textAlign: 'center' }}>
        {page.logo
          ? <img src={page.logo} alt="" style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', margin: '0 auto 14px' }} />
          : <div style={{ width: 72, height: 72, borderRadius: 16, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, margin: '0 auto 14px' }}>{(page.orgName || page.name || '?')[0]}</div>}
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>{page.orgName || page.name}</h1>

        {/* RATE */}
        {stage === 'rate' && (
          <>
            <p style={{ color: '#666', margin: '0 0 18px' }}>{page.headline}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => pickRating(n)}
                  style={{ background: 'none', border: 'none', fontSize: 40, cursor: 'pointer', color: n <= rating ? '#FFB400' : '#ddd', transition: 'transform .1s' }}
                  onMouseEnter={() => setRating(n)}>★</button>
              ))}
            </div>
          </>
        )}

        {/* PLATFORMS (yaxshi baho) */}
        {stage === 'platforms' && (
          <>
            <p style={{ color: '#666', margin: '0 0 18px' }}>Rahmat! Qayerда otziv qoldirasiz?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {page.platforms.map(p => (
                <button key={p.type} onClick={() => openPlatform(p)}
                  style={{ padding: '14px', borderRadius: 12, border: 'none', background: PLATFORM_COLOR[p.type] || color, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                  {PLATFORM_LABEL[p.type] || p.type}' да baholash
                </button>
              ))}
              {page.platforms.length === 0 && <p style={{ color: '#999' }}>Platforma sozlanmagan</p>}
            </div>
          </>
        )}

        {/* FEEDBACK (past baho) */}
        {stage === 'feedback' && (
          <>
            <p style={{ color: '#666', margin: '0 0 14px' }}>Kechirasiz! Nima yoqmaganini ayting — biz tuzatamiz.</p>
            <textarea value={fb.text} onChange={e => setFb({ ...fb, text: e.target.value })}
              placeholder="Fikringiz…" rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #ddd', marginBottom: 8, fontFamily: 'inherit' }} />
            <input value={fb.phone} onChange={e => setFb({ ...fb, phone: e.target.value })}
              placeholder="Telefon (ixtiyoriy)"
              style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #ddd', marginBottom: 10 }} />
            <button onClick={sendFeedback}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: color, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Yuborish
            </button>
          </>
        )}

        {/* DONE */}
        {stage === 'done' && (
          <>
            <div style={{ fontSize: 48, margin: '10px 0' }}>🙏</div>
            <p style={{ color: '#444', fontWeight: 600 }}>Rahmat! Fikringiz biz uchun muhim.</p>
          </>
        )}

        <p style={{ marginTop: 22, fontSize: 12, color: '#bbb' }}>CRM Line</p>
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontFamily: 'system-ui' }}>{children}</div>;
}
