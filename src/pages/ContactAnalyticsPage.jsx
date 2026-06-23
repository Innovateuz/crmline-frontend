import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../utils/translate';
import { ArrowLeft, Loader2, Users, TrendingUp, BarChart2, Smartphone } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const CHANNEL_COLOR = {
  telegram:  { bg: 'bg-[#e8f4fb]', text: 'text-[#229ED9]', label: 'Telegram',  bar: '#229ED9' },
  whatsapp:  { bg: 'bg-[#e8faf0]', text: 'text-[#25D366]', label: 'WhatsApp',  bar: '#25D366' },
  instagram: { bg: 'bg-[#fce8ef]', text: 'text-[#E1306C]', label: 'Instagram', bar: '#E1306C' },
  facebook:  { bg: 'bg-[#e7f0fd]', text: 'text-[#1877F2]', label: 'Facebook',  bar: '#1877F2' },
};

function toISO(d) { return d.toISOString().slice(0, 10); }

const PRESETS = [
  { key: '30d',    labelKey: 'contactAnalytics.preset30d' },
  { key: 'month',  labelKey: 'contactAnalytics.presetMonth' },
  { key: '90d',    labelKey: 'contactAnalytics.preset90d' },
  { key: 'custom', labelKey: 'contactAnalytics.presetCustom' },
];

function getRange(preset) {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  if (preset === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to: toISO(today) };
  }
  if (preset === '90d') {
    const from = new Date(today); from.setDate(from.getDate() - 89); from.setHours(0,0,0,0);
    return { from: toISO(from), to: toISO(today) };
  }
  // 30d default
  const from = new Date(today); from.setDate(from.getDate() - 29); from.setHours(0,0,0,0);
  return { from: toISO(from), to: toISO(today) };
}

function DailyBar({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const show = data.length <= 31;
  return (
    <div className="flex items-end gap-0.5 h-32 overflow-x-auto">
      {data.map(d => {
        const h = max ? Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 6 : 2) : 2;
        const date = new Date(d.date);
        const isToday = new Date().toDateString() === date.toDateString();
        return (
          <div key={d.date} className="flex-1 min-w-[14px] flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
              {d.count} ta · {d.date}
            </div>
            <div
              className={`w-full rounded-t transition-all ${isToday ? 'bg-primary-600' : 'bg-primary-300 group-hover:bg-primary-500'}`}
              style={{ height: `${h}%` }}
            />
            {show && (
              <span className={`text-[7px] ${isToday ? 'font-bold text-primary-600' : 'text-ink-disabled'}`}>
                {String(date.getDate()).padStart(2,'0')}/{String(date.getMonth()+1).padStart(2,'0')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HBar({ label, count, max, color, badge }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0">
        {badge
          ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{label}</span>
          : <span className="text-xs text-ink-secondary truncate block">{label}</span>}
      </div>
      <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color || '#6366f1' }} />
      </div>
      <span className="text-xs font-semibold text-ink w-10 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function ContactAnalyticsPage() {
  const navigate = useNavigate();
  const t = useT();

  const init = getRange('30d');
  const [preset,  setPreset]  = useState('30d');
  const [from,    setFrom]    = useState(init.from);
  const [to,      setTo]      = useState(init.to);
  const [cfrom,   setCfrom]   = useState(init.from);
  const [cto,     setCto]     = useState(init.to);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (f, t) => {
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${API_URL}/contacts/analytics`, { params: { from: f, to: t } });
      setData(r.data);
    } catch { setError('Yuklanmadi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(from, to); }, []);

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== 'custom') {
      const r = getRange(key);
      setFrom(r.from); setTo(r.to); setCfrom(r.from); setCto(r.to);
      load(r.from, r.to);
    }
  };

  const applyCustom = () => {
    setFrom(cfrom); setTo(cto);
    load(cfrom, cto);
  };

  const maxOp  = data?.operatorStats?.length  ? Math.max(...data.operatorStats.map(o => o.count)) : 1;
  const maxCh  = data?.channelStats?.length   ? Math.max(...data.channelStats.map(c => c.count))  : 1;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/contacts')} className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('contactAnalytics.back')}
        </button>
        <div className="w-px h-4 bg-surface-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <h1 className="text-sm font-semibold text-ink">{t('contactAnalytics.title')}</h1>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-5">

        {/* Date preset bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${preset === p.key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                {t(p.labelKey)}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input text-xs h-8 w-36" value={cfrom} onChange={e => setCfrom(e.target.value)} />
              <span className="text-ink-tertiary text-xs">—</span>
              <input type="date" className="input text-xs h-8 w-36" value={cto}   onChange={e => setCto(e.target.value)} />
              <button onClick={applyCustom} className="btn-primary btn-sm">{t('contactAnalytics.apply')}</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-ink-tertiary">{error}</div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-surface-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs text-ink-tertiary">Davr uchun yangi kontaktlar</p>
                  <p className="text-3xl font-bold text-ink leading-tight">{data.totalPeriod}</p>
                  <p className="text-[10px] text-ink-disabled mt-0.5">{from} — {to}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-surface-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-ink-tertiary" />
                </div>
                <div>
                  <p className="text-xs text-ink-tertiary">Jami kontaktlar</p>
                  <p className="text-3xl font-bold text-ink leading-tight">{data.totalAll}</p>
                  <p className="text-[10px] text-ink-disabled mt-0.5">Barcha vaqt uchun</p>
                </div>
              </div>
            </div>

            {/* Daily chart */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-primary-600" />
                <p className="text-sm font-semibold text-ink">Kunlik yangi kontaktlar ({from} — {to})</p>
              </div>
              <DailyBar data={data.dailyNew} />
            </div>

            {/* Channel + Operator grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Channel attribution */}
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <p className="text-sm font-semibold text-ink mb-4">Kanal bo'yicha (Inbox orqali)</p>
                {!data.channelStats?.length ? (
                  <p className="text-xs text-ink-tertiary">Ma'lumot yo'q</p>
                ) : (
                  <div className="space-y-3">
                    {data.channelStats.map((c, i) => {
                      const cl = CHANNEL_COLOR[c.channel] || { bg: 'bg-surface-100', text: 'text-ink', label: c.channel, bar: '#94a3b8' };
                      return (
                        <HBar key={i}
                          label={cl.label}
                          count={c.count}
                          max={maxCh}
                          color={cl.bar}
                          badge={{ bg: cl.bg, text: cl.text }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Operator / region */}
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-4 h-4 text-ink-tertiary" />
                  <p className="text-sm font-semibold text-ink">Operator bo'yicha</p>
                </div>
                {!data.operatorStats?.length ? (
                  <p className="text-xs text-ink-tertiary">Telefon raqamlar yo'q</p>
                ) : (
                  <div className="space-y-3">
                    {data.operatorStats.map((o, i) => (
                      <HBar key={i}
                        label={o.operator}
                        count={o.count}
                        max={maxOp}
                        color={`hsl(${(i * 47 + 210) % 360}, 65%, 55%)`}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
