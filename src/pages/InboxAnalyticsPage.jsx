import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, MessageSquare, CheckCircle2, Clock, Users, Tag, TrendingUp, BarChart2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const CHANNEL_COLOR = {
  telegram:  { bg: 'bg-[#e8f4fb]', text: 'text-[#229ED9]', label: 'Telegram',  accent: '#229ED9' },
  whatsapp:  { bg: 'bg-[#e8faf0]', text: 'text-[#25D366]', label: 'WhatsApp',  accent: '#25D366' },
  instagram: { bg: 'bg-[#fce8ef]', text: 'text-[#E1306C]', label: 'Instagram', accent: '#E1306C' },
  facebook:  { bg: 'bg-[#e7f0fd]', text: 'text-[#1877F2]', label: 'Facebook',  accent: '#1877F2' },
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-600', bg = 'bg-primary-50' }) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-ink-tertiary">{label}</p>
        <p className="text-2xl font-bold text-ink leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-ink-disabled mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label, count, max, colorCls }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-secondary w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-ink w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

function DailyChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-primary-600" />
        <p className="text-sm font-semibold text-ink">Kunlik suhbatlar (14 kun)</p>
      </div>
      <div className="flex items-end gap-1 h-28">
        {data.map(d => {
          const h = max ? Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 8 : 2) : 2;
          const date = new Date(d.date);
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.count} ta
              </div>
              <div
                className={`w-full rounded-t-md transition-all ${isToday ? 'bg-primary-600' : 'bg-primary-200 group-hover:bg-primary-400'}`}
                style={{ height: `${h}%` }}
              />
              <span className={`text-[8px] ${isToday ? 'font-bold text-primary-600' : 'text-ink-disabled'}`}>
                {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InboxAnalyticsPage() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/inbox/analytics`)
      .then(r => setData(r.data))
      .catch(() => setError('Yuklanmadi'))
      .finally(() => setLoading(false));
  }, []);

  const fmtMins = (m) => {
    if (!m || m <= 0) return '—';
    if (m < 60) return `${Math.round(m)} daqiqa`;
    return `${(m / 60).toFixed(1)} soat`;
  };

  const total = data ? (data.overview.unanswered + data.overview.accepted + data.overview.closed) : 0;
  const maxAgent = data?.agentStats?.length ? Math.max(...data.agentStats.map(a => a.count)) : 1;
  const maxLabel = data?.labelStats?.length ? Math.max(...data.labelStats.map(l => l.count)) : 1;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/inbox')}
          className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Inbox
        </button>
        <div className="w-px h-4 bg-surface-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <h1 className="text-sm font-semibold text-ink">Inbox Analitikasi</h1>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-ink-tertiary">{error}</div>
        ) : (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={MessageSquare} label="Jami suhbatlar" value={total}
                sub="Hammasi" />
              <StatCard icon={Clock} label="Javob berilmagan" value={data.overview.unanswered}
                color="text-orange-600" bg="bg-orange-50" sub="Kutilayotgan" />
              <StatCard icon={CheckCircle2} label="Yopilgan" value={data.overview.closed}
                color="text-emerald-600" bg="bg-emerald-50"
                sub={`Hal qilish: ${data.resolutionRate ?? 0}%`} />
              <StatCard icon={Clock} label="O'rt. javob vaqti" value={fmtMins(data.avgResponseMinutes)}
                color="text-violet-600" bg="bg-violet-50" sub="Birinchi javob" />
            </div>

            {/* Daily chart */}
            <DailyChart data={data.dailyVolume} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* By channel */}
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <p className="text-sm font-semibold text-ink mb-3">Kanallar bo'yicha</p>
                <div className="space-y-3">
                  {Object.entries(data.overview)
                    .filter(([k]) => ['telegram','whatsapp','instagram','facebook'].includes(k))
                    .filter(([, v]) => v > 0)
                    .map(([ch, count]) => {
                      const c = CHANNEL_COLOR[ch] || { bg: 'bg-surface-100', text: 'text-ink', label: ch };
                      return (
                        <div key={ch} className="flex items-center justify-between">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                            {c.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${total ? (count/total)*100 : 0}%`, backgroundColor: c.accent || '#94a3b8' }} />
                            </div>
                            <span className="text-sm font-semibold text-ink w-6 text-right">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  {Object.values({ telegram: data.overview.telegram, whatsapp: data.overview.whatsapp, instagram: data.overview.instagram, facebook: data.overview.facebook }).every(v => !v) && (
                    <p className="text-xs text-ink-tertiary">Ma'lumot yo'q</p>
                  )}
                </div>
              </div>

              {/* Agent stats */}
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-ink-tertiary" />
                  <p className="text-sm font-semibold text-ink">Agentlar</p>
                </div>
                <div className="space-y-2.5">
                  {data.agentStats?.length === 0 && (
                    <p className="text-xs text-ink-tertiary">Ma'lumot yo'q</p>
                  )}
                  {(data.agentStats || []).map((a, i) => (
                    <MiniBar key={i} label={a.name || 'Noma\'lum'} count={a.count} max={maxAgent}
                      colorCls="bg-primary-400" />
                  ))}
                </div>
              </div>

              {/* Label stats */}
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-ink-tertiary" />
                  <p className="text-sm font-semibold text-ink">Yorliqlar</p>
                </div>
                <div className="space-y-2.5">
                  {data.labelStats?.length === 0 && (
                    <p className="text-xs text-ink-tertiary">Yorliq yo'q</p>
                  )}
                  {(data.labelStats || []).map((l, i) => (
                    <MiniBar key={i} label={`#${l.label}`} count={l.count} max={maxLabel}
                      colorCls="bg-violet-400" />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
