import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle2, ListTodo, UserX, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useT } from '../utils/translate';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';


function fmtSum(v) {
  if (!v) return '0';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} mlrd`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)} mln`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)} ming`;
  return String(v);
}

// ── SVG Gauge (tachometer) ────────────────────────────────────────────────────
function Gauge({ value, max, label, size = 200 }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const sw = 14;
  const pad = sw / 2 + 4;
  const W = size;
  const H = Math.round(size * 0.58);
  const cx = W / 2;
  const r = W / 2 - pad;
  const cy = H;

  // standard math coords: 0°=right, 90°=top, 180°=left
  // SVG: x = cx + r*cos(deg°), y = cy - r*sin(deg°)
  const pt = (deg) => ({
    x: +(cx + r * Math.cos(deg * Math.PI / 180)).toFixed(2),
    y: +(cy - r * Math.sin(deg * Math.PI / 180)).toFixed(2),
  });

  const left  = pt(180); // 0% position
  const right = pt(0);   // 100% position
  const progDeg = 180 - pct * 180;
  const prog  = pt(progDeg);

  // sweep=1 (clockwise on screen, since SVG y grows downward) from left → top → right.
  const bgPath = `M${left.x} ${left.y} A${r} ${r} 0 0 1 ${right.x} ${right.y}`;
  // Sweep never exceeds 180° (this is a semicircle gauge), so the arc from
  // `left` to `prog` is always the minor arc — large-arc-flag is always 0.
  const fgPath = pct > 0.005
    ? `M${left.x} ${left.y} A${r} ${r} 0 0 1 ${prog.x} ${prog.y}`
    : null;

  const arcColor = pct < 0.5 ? '#ef4444' : pct < 0.8 ? '#f59e0b' : '#22c55e';

  // Needle
  const nl = r - sw - 6;
  const np = {
    x: +(cx + nl * Math.cos(progDeg * Math.PI / 180)).toFixed(2),
    y: +(cy - nl * Math.sin(progDeg * Math.PI / 180)).toFixed(2),
  };

  return (
    <svg width={W} height={H + 4} viewBox={`0 0 ${W} ${H + 4}`}>
      <path d={bgPath} fill="none" stroke="#f1f5f9" strokeWidth={sw} strokeLinecap="round" />
      {fgPath && <path d={fgPath} fill="none" stroke={arcColor} strokeWidth={sw} strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={np.x} y2={np.y} stroke="#1e293b" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
      <text x={cx} y={cy - r * 0.45} textAnchor="middle" fontSize={size * 0.11} fontWeight="800" fill="#1e293b">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy - r * 0.22} textAnchor="middle" fontSize={size * 0.055} fill="#64748b">
        {label}
      </text>
    </svg>
  );
}

// ── SVG Donut progress ring (single value, 0..1) ──────────────────────────────
function DonutProgress({ pct, size = 64, strokeWidth = 7 }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const color = pct < 0.5 ? '#ef4444' : pct < 0.8 ? '#f59e0b' : '#22c55e';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
      {pct > 0 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      )}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.24} fontWeight="700" fill="#1e293b">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ── SVG Pie Chart ─────────────────────────────────────────────────────────────
function PieChart({ data, size = 160 }) {
  // data items already have .label and .color from backend
  const t = useT();
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  const total = data.reduce((a, d) => a + d.count, 0);
  if (total === 0) return null;

  let angle = -Math.PI / 2; // start from top
  const slices = data.map((d, i) => {
    const pct   = d.count / total;
    const start = angle;
    const sweep = pct * 2 * Math.PI;
    angle += sweep;
    const end = angle;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const path  = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

    const midAngle = start + sweep / 2;
    return { ...d, path, midAngle, pct };
  });

  const hov = hovered !== null ? slices[hovered] : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {slices.map((s, i) => {
        const scale = hovered === i ? 1.04 : 1;
        return (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            stroke="white"
            strokeWidth={2}
            opacity={hovered !== null && hovered !== i ? 0.55 : 1}
            style={{ transform: `scale(${scale})`, transformOrigin: `${cx}px ${cy}px`, transition: 'all 0.15s' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          />
        );
      })}
      {/* Center donut hole */}
      <circle cx={cx} cy={cy} r={r * 0.48} fill="white" />
      {/* Center text */}
      {hov ? (
        <>
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">
            {Math.round(hov.pct * 100)}%
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#64748b">
            {hov.label}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">
            {t('dashboardHome.total')}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">
            {total}
          </text>
        </>
      )}
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-surface-200 p-6 flex flex-col gap-4 text-left w-full transition-all hover:shadow-lg hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-[13px] font-medium text-ink-secondary leading-none mb-2">{label}</p>
        <p className="text-4xl font-bold text-ink leading-none tracking-tight">{value ?? '—'}</p>
        {sub && <p className="text-[12px] text-ink-tertiary mt-2 leading-snug">{sub}</p>}
      </div>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const navigate = useNavigate();
  const t = useT();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await axios.get(`${API}/dashboard`);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-tertiary">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">{t('dashboardHome.loadError')}</p>
        <button onClick={load} className="btn-primary btn-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> {t('dashboardHome.retry')}
        </button>
      </div>
    );
  }

  const { cards, dealSources = [], dealsByManager = [], managerTotal = { count: 0, sum: 0 }, goalsProgress = null } = data;
  const totalDeals = dealSources.reduce((a, d) => a + d.count, 0);

  return (
    <div className="h-full bg-surface-50 overflow-y-auto">
      <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={AlertCircle}
            iconBg="bg-red-50"
            iconColor="text-red-500"
            label={t('dashboardHome.overdueLabel')}
            value={cards.overdueCount}
            sub={cards.overdueCount > 0 ? t('dashboardHome.overdueSubAlert') : t('dashboardHome.overdueSubOk')}
            onClick={() => navigate('/tasks')}
          />
          <StatCard
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            label={t('dashboardHome.completedLabel')}
            value={cards.completedCount}
            sub={t('dashboardHome.completedSub')}
            onClick={() => navigate('/tasks')}
          />
          <StatCard
            icon={ListTodo}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            label={t('dashboardHome.activeLabel')}
            value={cards.activeCount}
            sub={t('dashboardHome.activeSub')}
            onClick={() => navigate('/tasks')}
          />
          <StatCard
            icon={UserX}
            iconBg="bg-amber-50"
            iconColor="text-amber-500"
            label={t('dashboardHome.unassignedLabel')}
            value={cards.unassignedCount}
            sub={cards.unassignedSum > 0 ? `${fmtSum(cards.unassignedSum)} UZS` : t('dashboardHome.unassignedSubNoLeads')}
          />
        </div>

        {/* Maqsadlar (Goals) */}
        {goalsProgress && (goalsProgress.totalSumTarget > 0 || goalsProgress.totalCountTarget > 0) && (
          <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100">
              <h2 className="text-sm font-semibold text-ink">{t('dashboardHome.goalsTitle')}</h2>
            </div>
            <div className="p-6">
              {/* Two gauges */}
              <div className="flex items-end justify-center gap-8 flex-wrap">
                {goalsProgress.totalSumTarget > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <Gauge
                      value={goalsProgress.currentSum}
                      max={goalsProgress.totalSumTarget}
                      label={t('dashboardHome.gaugeSum')}
                      size={200}
                    />
                    <div className="text-center">
                      <p className="text-base font-bold text-ink">{fmtSum(goalsProgress.currentSum)} <span className="text-xs text-ink-tertiary font-normal">/ {fmtSum(goalsProgress.totalSumTarget)} UZS</span></p>
                    </div>
                  </div>
                )}
                {goalsProgress.totalCountTarget > 0 && (
                  <div className="flex flex-col items-center gap-2">
                    <Gauge
                      value={goalsProgress.currentCount}
                      max={goalsProgress.totalCountTarget}
                      label={t('dashboardHome.gaugeDealCount')}
                      size={200}
                    />
                    <div className="text-center">
                      <p className="text-base font-bold text-ink">{goalsProgress.currentCount} <span className="text-xs text-ink-tertiary font-normal">/ {goalsProgress.totalCountTarget} {t('dashboardHome.unit')}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Per-user progress */}
              {goalsProgress.byUser?.some(u => u.targetSum > 0 || u.targetCount > 0) && (
                <div className="mt-6 pt-5 border-t border-surface-100">
                  <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-3">{t('dashboardHome.byEmployee')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {goalsProgress.byUser.filter(u => u.targetSum > 0 || u.targetCount > 0).map((u, i) => {
                      const sumPct   = u.targetSum   > 0 ? Math.min(u.currentSum   / u.targetSum,   1) : 0;
                      const countPct = u.targetCount > 0 ? Math.min(u.currentCount / u.targetCount, 1) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-surface-100">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary-600">{u.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate mb-2">{u.name}</p>
                            <div className="flex items-center gap-4">
                              {u.targetSum > 0 && (
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <DonutProgress pct={sumPct} />
                                  <span className="text-[10px] text-ink-tertiary">{t('dashboardHome.donutSum')}</span>
                                  <span className="text-[10px] text-ink-secondary whitespace-nowrap">{fmtSum(u.currentSum)} / {fmtSum(u.targetSum)}</span>
                                </div>
                              )}
                              {u.targetCount > 0 && (
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <DonutProgress pct={countPct} />
                                  <span className="text-[10px] text-ink-tertiary">{t('dashboardHome.donutCount')}</span>
                                  <span className="text-[10px] text-ink-secondary whitespace-nowrap">{u.currentCount} / {u.targetCount} {t('dashboardHome.unit')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom row: managers + pie chart side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Menejerlar bo'yicha savdolar */}
          {dealsByManager.length > 0 && (
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                <h2 className="text-sm font-semibold text-ink">{t('dashboardHome.byManager')}</h2>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-ink-tertiary leading-none mb-0.5">{t('dashboardHome.dealsCountLabel')}</p>
                    <p className="text-sm font-bold text-ink">{managerTotal.count} {t('dashboardHome.unit')}</p>
                  </div>
                  <div className="w-px h-7 bg-surface-200" />
                  <div className="text-right">
                    <p className="text-[10px] text-ink-tertiary leading-none mb-0.5">{t('dashboardHome.sumLabel')}</p>
                    <p className="text-sm font-bold text-primary-600">{fmtSum(managerTotal.sum)} UZS</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-surface-100 flex-1">
                {dealsByManager.map((m, i) => {
                  const pct = managerTotal.count > 0 ? (m.count / managerTotal.count) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-600">{m.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-ink truncate">{m.name}</span>
                          <span className="text-xs text-ink-tertiary shrink-0 ml-2">{m.count} {t('dashboardHome.unit')}</span>
                        </div>
                        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <p className="text-sm font-semibold text-ink">{fmtSum(m.sum)}</p>
                        <p className="text-[10px] text-ink-tertiary">UZS</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pie chart — deal sources */}
          {dealSources.length > 0 && (
            <div className="bg-white rounded-2xl border border-surface-200 p-5 flex flex-col">
              <h2 className="text-sm font-semibold text-ink mb-5">{t('dashboardHome.dealSources')}</h2>
              <div className="flex-1 flex items-center justify-center gap-6 flex-wrap">
                <PieChart data={dealSources} size={160} />
                <div className="flex flex-col gap-2.5">
                  {dealSources.map((d, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || '#94a3b8' }} />
                      <span className="text-sm text-ink-secondary min-w-[70px]">{d.label || d.source || t('dashboardHome.other')}</span>
                      <span className="text-sm font-semibold text-ink">{d.pct}%</span>
                      <span className="text-xs text-ink-tertiary">({d.count} {t('dashboardHome.unit')})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
