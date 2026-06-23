import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { useT } from '../utils/translate';
import {
  Phone, PhoneMissed, Users, GitPullRequestDraft, MessageSquare,
  Clock, AlertTriangle, Loader2, RefreshCw, PhoneIncoming,
  PhoneOutgoing, CheckCircle2, TrendingUp, BarChart2,
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const now = new Date();
  const diffMs = now - dt;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Hozirgina';
  if (diffMin < 60) return `${diffMin} daq oldin`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} soat oldin`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} kun oldin`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

function fmtPhone(p) {
  if (!p) return '—';
  const s = String(p);
  if (s.length === 12) return `+${s.slice(0,3)} (${s.slice(3,5)}) ${s.slice(5,8)}-${s.slice(8,10)}-${s.slice(10)}`;
  return `+${s}`;
}

function fmtAmount(v) {
  if (!v) return '';
  return new Intl.NumberFormat('uz-UZ').format(v);
}

const CHANNEL_LABEL = {
  telegram:  'Telegram',
  whatsapp:  'WhatsApp',
  instagram: 'Instagram',
  facebook:  'Facebook',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card card-body flex items-start gap-3 text-left w-full transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-ink leading-none">{value ?? '—'}</p>
        <p className="text-xs text-ink-secondary mt-1">{label}</p>
        {sub && <p className="text-[11px] text-ink-disabled mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

function SectionHeader({ icon: Icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-ink-tertiary shrink-0" />
      <span className="text-sm font-semibold text-ink">{title}</span>
      {count != null && (
        <span className="ml-1 text-[11px] bg-surface-100 text-ink-tertiary px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

function EmptyRow({ text }) {
  return <p className="text-sm text-ink-tertiary text-center py-4">{text}</p>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
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

  const today = new Date();
  const todayStr = today.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Loading / Error ──────────────────────────────────────────────────────
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
        <p className="text-sm">{t('crmDashboard.loadError')}</p>
        <button onClick={load} className="btn-primary btn-sm flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> {t('crmDashboard.reload')}
        </button>
      </div>
    );
  }

  const { kpi, missedCalls, overdueTasks, funnelStats, activity } = data;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-ink leading-none">
            {t('crmDashboard.greeting').replace('{name}', user?.name?.split(' ')[0] || '')}
          </h1>
          <p className="text-xs text-ink-tertiary mt-0.5 capitalize">{todayStr}</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg text-ink-tertiary hover:bg-surface-100 hover:text-ink transition-colors"
          title="Yangilash"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 lg:p-6 space-y-5 max-w-6xl mx-auto w-full">

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={Phone}
            label={t('crmDashboard.kpiCalls')}
            value={kpi.todayCalls}
            color="bg-blue-50 text-blue-600"
            sub={t('crmDashboard.kpiSubToday')}
            onClick={() => navigate('/calls')}
          />
          <KpiCard
            icon={Users}
            label={t('crmDashboard.kpiContacts')}
            value={kpi.todayContacts}
            color="bg-emerald-50 text-emerald-600"
            sub={t('crmDashboard.kpiSubTodayAdded')}
            onClick={() => navigate('/contacts')}
          />
          <KpiCard
            icon={GitPullRequestDraft}
            label={t('crmDashboard.kpiDeals')}
            value={kpi.openDeals}
            color="bg-violet-50 text-violet-600"
            sub={t('crmDashboard.kpiSubTotal')}
          />
          <KpiCard
            icon={MessageSquare}
            label={t('crmDashboard.kpiUnanswered')}
            value={kpi.unansweredConvs}
            color={kpi.unansweredConvs > 0 ? 'bg-amber-50 text-amber-600' : 'bg-surface-100 text-ink-tertiary'}
            sub={t('crmDashboard.kpiSubUnanswered')}
            onClick={() => navigate('/inbox')}
          />
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT column: missed calls + overdue tasks */}
          <div className="lg:col-span-2 space-y-5">

            {/* Missed calls */}
            <div className="card card-body">
              <SectionHeader icon={PhoneMissed} title={t('crmDashboard.missedTitle')} count={missedCalls.length} />
              {missedCalls.length === 0 ? (
                <EmptyRow text={t('crmDashboard.missedEmpty')} />
              ) : (
                <div className="divide-y divide-surface-100">
                  {missedCalls.map(call => (
                    <div key={call._id} className="flex items-center gap-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                        <PhoneMissed className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {call.contact ? (
                          <button
                            onClick={() => navigate(`/contacts/${call.contact._id}`)}
                            className="text-sm font-medium text-ink hover:text-primary-600 transition-colors truncate block"
                          >
                            {call.contact.name}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-ink truncate block">
                            {fmtPhone(call.phone)}
                          </span>
                        )}
                        {call.contact && (
                          <span className="text-[11px] text-ink-tertiary font-mono">{fmtPhone(call.phone)}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-disabled whitespace-nowrap shrink-0">
                        {fmtTime(call.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/calls')}
                className="mt-3 w-full text-center text-xs text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
              >
                {t('crmDashboard.allCalls')}
              </button>
            </div>

            {/* Overdue tasks */}
            {overdueTasks.length > 0 && (
              <div className="card card-body border-l-4 border-l-amber-400">
                <SectionHeader icon={AlertTriangle} title={t('crmDashboard.overdueTitle')} count={overdueTasks.length} />
                <div className="divide-y divide-surface-100">
                  {overdueTasks.map(task => (
                    <div key={task._id} className="flex items-start gap-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{task.title}</p>
                        <p className="text-[11px] text-red-500 mt-0.5">
                          {t('crmDashboard.dueDate')} {fmtDate(task.dueDate)}
                          {task.assignedTo && <span className="text-ink-tertiary ml-2">· {task.assignedTo.name}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/tasks')}
                  className="mt-3 w-full text-center text-xs text-amber-600 hover:text-amber-700 font-medium py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  {t('crmDashboard.allTasks')}
                </button>
              </div>
            )}

            {/* Activity feed */}
            <div className="card card-body">
              <SectionHeader icon={Clock} title={t('crmDashboard.activityTitle')} />
              {activity.length === 0 ? (
                <EmptyRow text={t('crmDashboard.activityEmpty')} />
              ) : (
                <div className="divide-y divide-surface-100">
                  {activity.map(item => (
                    <div key={`${item.type}-${item._id}`} className="flex items-center gap-3 py-2.5">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center">
                        {item.type === 'call' ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.status === 'missed' ? 'bg-red-50' : item.status === 'completed' ? 'bg-emerald-50' : 'bg-blue-50'
                          }`}>
                            {item.status === 'missed'
                              ? <PhoneMissed className="w-3.5 h-3.5 text-red-400" />
                              : item.sub === 'Kiruvchi'
                                ? <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                                : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-400" />
                            }
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                        <p className="text-[11px] text-ink-tertiary truncate">
                          {item.type === 'call'
                            ? item.sub
                            : `${CHANNEL_LABEL[item.channel] || item.channel} · ${item.sub}`
                          }
                        </p>
                      </div>
                      <span className="text-[11px] text-ink-disabled whitespace-nowrap shrink-0">
                        {fmtTime(item.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT column: funnel stats */}
          <div className="space-y-4">
            <div className="card card-body">
              <SectionHeader icon={BarChart2} title={t('crmDashboard.funnelTitle')} />
              {funnelStats.length === 0 ? (
                <EmptyRow text={t('crmDashboard.funnelEmpty')} />
              ) : (
                <div className="space-y-5">
                  {funnelStats.map(funnel => (
                    <div key={funnel._id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-ink truncate flex-1 mr-2">{funnel.name}</span>
                        <span className="text-xs text-ink-tertiary shrink-0">{funnel.total} ta</span>
                      </div>
                      {funnel.stages.filter(s => s.count > 0).length === 0 ? (
                        <p className="text-[11px] text-ink-disabled">{t('crmDashboard.noDeal')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {funnel.stages.map((stage, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color || '#94a3b8' }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] text-ink-secondary truncate">{stage.name}</span>
                                  <span className="text-[11px] font-semibold text-ink shrink-0">{stage.count}</span>
                                </div>
                                {funnel.total > 0 && (
                                  <div className="h-1 bg-surface-100 rounded-full mt-0.5 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${Math.round((stage.count / funnel.total) * 100)}%`,
                                        backgroundColor: stage.color || '#94a3b8',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {funnel.value > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-surface-100">
                          <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            {fmtAmount(funnel.value)} UZS
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="card card-body">
              <p className="text-xs font-semibold text-ink-secondary mb-3">{t('crmDashboard.quickLinks')}</p>
              <div className="space-y-1">
                {[
                  { label: t('crmDashboard.addContact'),  path: '/contacts/new',  icon: Users },
                  { label: t('crmDashboard.callHistory'), path: '/calls',         icon: Phone },
                  { label: 'Inbox',                       path: '/inbox',         icon: MessageSquare },
                  { label: t('bottomNav.tasks'),          path: '/tasks',         icon: CheckCircle2  },
                ].map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-ink-secondary hover:bg-surface-50 hover:text-ink transition-colors text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
