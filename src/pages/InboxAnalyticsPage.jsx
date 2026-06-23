import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../utils/translate';
import {
  ArrowLeft, Loader2, MessageSquare, CheckCircle2, Clock, Users,
  Tag, TrendingUp, BarChart2, ArrowUpRight, ArrowDownRight, Download,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

const CHANNEL_COLOR = {
  telegram:  { bg: 'bg-[#e8f4fb]', text: 'text-[#229ED9]', label: 'Telegram',  accent: '#229ED9' },
  whatsapp:  { bg: 'bg-[#e8faf0]', text: 'text-[#25D366]', label: 'WhatsApp',  accent: '#25D366' },
  instagram: { bg: 'bg-[#fce8ef]', text: 'text-[#E1306C]', label: 'Instagram', accent: '#E1306C' },
  facebook:  { bg: 'bg-[#e7f0fd]', text: 'text-[#1877F2]', label: 'Facebook',  accent: '#1877F2' },
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function toISO(d) { return d.toISOString().slice(0, 10); }

function getPresetRange(preset) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  if (preset === '7d') {
    const from = new Date(today); from.setDate(from.getDate() - 6);
    return { from: toISO(from), to: toISO(end), compare: false };
  }
  if (preset === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to: toISO(end), compare: true };
  }
  if (preset === 'prevMonth') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to   = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: toISO(from), to: toISO(to), compare: true };
  }
  if (preset === 'quarter') {
    const qStart = Math.floor(today.getMonth() / 3) * 3;
    const from = new Date(today.getFullYear(), qStart, 1);
    return { from: toISO(from), to: toISO(end), compare: true };
  }
  // default 14d
  const from = new Date(today); from.setDate(from.getDate() - 13);
  return { from: toISO(from), to: toISO(end), compare: false };
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-600', bg = 'bg-primary-50', prevValue }) {
  const delta = prevValue != null && typeof prevValue === 'number' && typeof value === 'number'
    ? value - prevValue : null;
  const pct = delta != null && prevValue > 0 ? Math.abs(Math.round(delta / prevValue * 100)) : null;

  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-tertiary">{label}</p>
        <p className="text-2xl font-bold text-ink leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-ink-disabled mt-0.5">{sub}</p>}
        {delta != null && pct != null && (
          <div className={`flex items-center gap-0.5 mt-1 text-[11px] font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {pct}% (o'tgan davr: {prevValue})
          </div>
        )}
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

function DailyChart({ data, label }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const show = data.length <= 31;
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="w-4 h-4 text-primary-600" />
        <p className="text-sm font-semibold text-ink">{label || 'Kunlik suhbatlar'}</p>
        <span className="ml-auto text-xs text-ink-tertiary">{data.length} kun</span>
      </div>
      <div className="flex items-end gap-0.5 h-28 overflow-x-auto">
        {data.map(d => {
          const h = max ? Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 8 : 2) : 2;
          const date = new Date(d.date);
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <div key={d.date} className={`flex-1 min-w-[14px] flex flex-col items-center gap-1 group relative`}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-ink text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d.count} ta · {d.date}
              </div>
              <div
                className={`w-full rounded-t-md transition-all ${isToday ? 'bg-primary-600' : 'bg-primary-200 group-hover:bg-primary-400'}`}
                style={{ height: `${h}%` }}
              />
              {show && (
                <span className={`text-[7px] ${isToday ? 'font-bold text-primary-600' : 'text-ink-disabled'}`}>
                  {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtMins(m) {
  if (!m || m <= 0) return '—';
  if (m < 60) return `${Math.round(m)} daq.`;
  return `${(m / 60).toFixed(1)} soat`;
}

// ── Date range filter bar ─────────────────────────────────────────────────────

const PRESETS = [
  { key: '7d',        labelKey: 'inboxAnalytics.preset7d' },
  { key: 'month',     labelKey: 'inboxAnalytics.presetMonth' },
  { key: 'prevMonth', labelKey: 'inboxAnalytics.presetPrevMonth' },
  { key: 'quarter',   labelKey: 'inboxAnalytics.presetQuarter' },
  { key: 'custom',    labelKey: 'inboxAnalytics.presetCustom' },
];

function DateFilter({ from, to, onApply, compare, onCompareChange }) {
  const t = useT();
  const [preset,  setPreset]  = useState('7d');
  const [cfrom,   setCfrom]   = useState(from);
  const [cto,     setCto]     = useState(to);

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== 'custom') {
      const r = getPresetRange(key);
      setCfrom(r.from); setCto(r.to);
      onApply(r.from, r.to, r.compare);
    }
  };

  return (
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
          <button onClick={() => onApply(cfrom, cto, compare)}
            className="btn-primary btn-sm">{t('inboxAnalytics.apply')}</button>
        </div>
      )}
      <label className="flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer ml-auto">
        <input type="checkbox" className="rounded" checked={compare} onChange={e => onCompareChange(e.target.checked)} />
        {t('inboxAnalytics.compare')}
      </label>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InboxAnalyticsPage() {
  const navigate = useNavigate();
  const t = useT();

  const init = getPresetRange('7d');
  const [from,     setFrom]     = useState(init.from);
  const [to,       setTo]       = useState(init.to);
  const [compare,  setCompare]  = useState(false);
  const [tab,      setTab]      = useState('general');

  // ── General analytics ─────────────────────────────────────────────────────
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadAnalytics = useCallback(async (f, t, cmp) => {
    setLoading(true); setError(null);
    try {
      const params = { from: f, to: t };
      if (cmp) params.compare = '1';
      const r = await axios.get(`${API_URL}/inbox/analytics`, { params });
      setData(r.data);
    } catch { setError('Yuklanmadi'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAnalytics(from, to, compare); }, []);

  const handleApply = (f, t, cmp) => {
    setFrom(f); setTo(t);
    if (cmp !== undefined) setCompare(cmp);
    loadAnalytics(f, t, cmp !== undefined ? cmp : compare);
  };
  const handleCompareToggle = (val) => {
    setCompare(val);
    loadAnalytics(from, to, val);
  };

  // ── Agent report ──────────────────────────────────────────────────────────
  const [agents,      setAgents]      = useState(null);
  const [agentLoad,   setAgentLoad]   = useState(false);
  const [agentError,  setAgentError]  = useState(null);

  const loadAgents = useCallback(async (f, t) => {
    setAgentLoad(true); setAgentError(null);
    try {
      const r = await axios.get(`${API_URL}/inbox/analytics/agents`, { params: { from: f, to: t } });
      setAgents(r.data.report || []);
    } catch { setAgentError('Yuklanmadi'); }
    finally { setAgentLoad(false); }
  }, []);

  useEffect(() => { if (tab === 'agents') loadAgents(from, to); }, [tab]);

  const exportAgentCsv = () => {
    const url = `${API_URL}/inbox/analytics/agents?from=${from}&to=${to}&format=csv`;
    window.open(url, '_blank');
  };

  // ─────────────────────────────────────────────────────────────────────────

  const total = data ? (data.overview.unanswered + data.overview.accepted + data.overview.closed) : 0;
  const maxAgent = data?.agentStats?.length ? Math.max(...data.agentStats.map(a => a.count)) : 1;
  const maxLabel = data?.labelStats?.length ? Math.max(...data.labelStats.map(l => l.count)) : 1;
  const prev = data?.prevStats;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/inbox')} className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> Inbox
        </button>
        <div className="w-px h-4 bg-surface-200" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <h1 className="text-sm font-semibold text-ink">{t('inboxAnalytics.title')}</h1>
        </div>
        {/* Tabs */}
        <div className="ml-6 flex items-center gap-1 bg-surface-100 rounded-xl p-1">
          {[['general', t('inboxAnalytics.tabGeneral')], ['agents', t('inboxAnalytics.tabAgents')]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${tab === k ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-5">

        {/* Date filter */}
        <DateFilter from={from} to={to} compare={compare} onApply={handleApply} onCompareChange={handleCompareToggle} />

        {/* ── UMUMIY TAB ── */}
        {tab === 'general' && (
          loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-ink-tertiary">{error}</div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={MessageSquare} label="Jami suhbatlar" value={total}
                  prevValue={prev?.total} sub={`${from} — ${to}`} />
                <StatCard icon={Clock} label="Javob berilmagan" value={data.overview.unanswered}
                  color="text-orange-600" bg="bg-orange-50" />
                <StatCard icon={CheckCircle2} label="Yopilgan" value={data.overview.closed}
                  prevValue={prev?.closed}
                  color="text-emerald-600" bg="bg-emerald-50"
                  sub={`Hal qilish: ${data.resolutionRate ?? 0}%`} />
                <StatCard icon={Clock} label="O'rt. javob vaqti" value={fmtMins(data.avgResponseMinutes)}
                  color="text-violet-600" bg="bg-violet-50" sub="Birinchi javob" />
              </div>

              {/* Comparison bar (when compare enabled) */}
              {prev && (
                <div className="bg-white border border-surface-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Davr solishtiruvchi</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Jami', cur: total, prv: prev.total },
                      { label: 'Yopilgan', cur: data.overview.closed, prv: prev.closed },
                      { label: 'Hal qilish %', cur: data.resolutionRate, prv: prev.resolutionRate },
                    ].map(({ label, cur, prv }) => {
                      const delta = cur - prv;
                      const up = delta >= 0;
                      return (
                        <div key={label} className="text-center">
                          <p className="text-xs text-ink-tertiary mb-1">{label}</p>
                          <p className="text-2xl font-bold text-ink">{cur}</p>
                          <div className={`flex items-center justify-center gap-0.5 text-xs font-medium mt-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(delta)} ({prv})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daily chart */}
              <DailyChart data={data.dailyVolume} label={`Kunlik suhbatlar (${from} — ${to})`} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* By channel */}
                <div className="bg-white rounded-2xl border border-surface-200 p-4">
                  <p className="text-sm font-semibold text-ink mb-3">Kanallar bo'yicha</p>
                  <div className="space-y-3">
                    {Object.entries(data.overview)
                      .filter(([k]) => ['telegram','whatsapp','instagram','facebook'].includes(k) && data.overview[k] > 0)
                      .map(([ch, count]) => {
                        const c = CHANNEL_COLOR[ch] || { bg: 'bg-surface-100', text: 'text-ink', label: ch, accent: '#94a3b8' };
                        return (
                          <div key={ch} className="flex items-center justify-between">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${total ? (count/total)*100 : 0}%`, backgroundColor: c.accent }} />
                              </div>
                              <span className="text-sm font-semibold text-ink w-6 text-right">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    {!['telegram','whatsapp','instagram','facebook'].some(k => data.overview[k] > 0) && (
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
                    {data.agentStats?.length === 0 && <p className="text-xs text-ink-tertiary">Ma'lumot yo'q</p>}
                    {(data.agentStats || []).map((a, i) => (
                      <MiniBar key={i} label={a.name} count={a.count} max={maxAgent} colorCls="bg-primary-400" />
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
                    {data.labelStats?.length === 0 && <p className="text-xs text-ink-tertiary">Yorliq yo'q</p>}
                    {(data.labelStats || []).map((l, i) => (
                      <MiniBar key={i} label={`#${l.label}`} count={l.count} max={maxLabel} colorCls="bg-violet-400" />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* ── XODIMLAR TAB ── */}
        {tab === 'agents' && (
          agentLoad ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : agentError ? (
            <div className="text-center py-16 text-ink-tertiary">{agentError}</div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                <p className="text-sm font-semibold text-ink">Xodimlar bo'yicha hisobot</p>
                <button onClick={exportAgentCsv}
                  className="flex items-center gap-1.5 text-xs text-ink-secondary hover:text-primary-600 transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV yuklab olish
                </button>
              </div>
              {!agents?.length ? (
                <div className="text-center py-12 text-sm text-ink-tertiary">Ma'lumot yo'q</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-ink-tertiary">Xodim</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-ink-tertiary">Suhbatlar</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-ink-tertiary">Yopilgan</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-ink-tertiary">Yopish %</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-ink-tertiary">O'rt. javob</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-ink-tertiary">Qo'ng'iroq</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-50">
                      {agents.map((a, i) => (
                        <tr key={i} className="hover:bg-surface-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-ink">{a.name}</td>
                          <td className="px-4 py-3 text-right text-ink">{a.total}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">{a.closed}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.closedRate >= 70 ? 'bg-emerald-50 text-emerald-700' : a.closedRate >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                              {a.closedRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-ink-secondary">{fmtMins(a.avgResponseMinutes)}</td>
                          <td className="px-5 py-3 text-right text-ink">{a.calls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}

      </div>
    </div>
  );
}
