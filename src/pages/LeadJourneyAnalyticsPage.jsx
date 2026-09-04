import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../utils/translate';
import { ArrowLeft, Loader2, Users, GitBranch, Layers, Phone, MessageSquare, Send, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

function toISO(d) { return d.toISOString().slice(0, 10); }

function getRange(preset) {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  if (preset === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISO(from), to: toISO(today) };
  }
  if (preset === '90d') {
    const from = new Date(today); from.setDate(from.getDate() - 89); from.setHours(0, 0, 0, 0);
    return { from: toISO(from), to: toISO(today) };
  }
  const from = new Date(today); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
  return { from: toISO(from), to: toISO(today) };
}

function HBar({ label, count, max, color }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-ink-secondary truncate">{label}</span>
      <div className="flex-1 h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color || '#6366f1' }} />
      </div>
      <span className="text-xs font-semibold text-ink w-8 text-right shrink-0">{count}</span>
    </div>
  );
}


export default function LeadJourneyAnalyticsPage() {
  const navigate = useNavigate();
  const t = useT();

  const init = getRange('30d');
  const PRESETS = [
    { key: '30d',    label: t('leadJourney.preset30d') },
    { key: 'month',  label: t('leadJourney.presetMonth') },
    { key: '90d',    label: t('leadJourney.preset90d') },
    { key: 'custom', label: t('leadJourney.presetCustom') },
  ];

  const [preset,  setPreset]  = useState('30d');
  const [from,    setFrom]    = useState(init.from);
  const [to,      setTo]      = useState(init.to);
  const [cfrom,   setCfrom]   = useState(init.from);
  const [cto,     setCto]     = useState(init.to);
  const [contacts,    setContacts]    = useState(null);
  const [transitions, setTransitions] = useState(null);
  const [snapshot,     setSnapshot]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (f, tt) => {
    setLoading(true); setError(null);
    try {
      const [c, tr, sn] = await Promise.all([
        axios.get(`${API_URL}/lead-journey/contacts`,    { params: { from: f, to: tt } }),
        axios.get(`${API_URL}/lead-journey/transitions`, { params: { from: f, to: tt } }),
        axios.get(`${API_URL}/lead-journey/snapshot`),
      ]);
      setContacts(c.data);
      setTransitions(tr.data);
      setSnapshot(sn.data);
    } catch { setError(t('leadJourney.loadError')); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(from, to); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const maxSource = contacts?.interacted?.bySource
    ? Math.max(1, ...Object.values(contacts.interacted.bySource))
    : 1;
  const maxTransition = transitions?.transitions?.length ? Math.max(...transitions.transitions.map(x => x.count)) : 1;

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="bg-white border-b border-surface-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('leadJourney.back')}
        </button>
        <div className="w-px h-4 bg-surface-200" />
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary-600" />
          <h1 className="text-sm font-semibold text-ink">{t('leadJourney.title')}</h1>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-5">

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${preset === p.key ? 'bg-white text-ink shadow-sm' : 'text-ink-tertiary hover:text-ink'}`}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" className="input text-xs h-8 w-36" value={cfrom} onChange={e => setCfrom(e.target.value)} />
              <span className="text-ink-tertiary text-xs">—</span>
              <input type="date" className="input text-xs h-8 w-36" value={cto}   onChange={e => setCto(e.target.value)} />
              <button onClick={applyCustom} className="btn-primary btn-sm">{t('leadJourney.apply')}</button>
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
            {/* Widget 1 — contacts: aloqa bo'lganlar va gaplashilganlar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-tertiary">{t('leadJourney.interactedTitle')}</p>
                    <p className="text-3xl font-bold text-ink leading-tight">{contacts?.interacted?.count ?? 0}</p>
                    <p className="text-[10px] text-ink-disabled mt-0.5">{from} — {to}</p>
                  </div>
                </div>
                {!!contacts?.interacted?.bySource && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                      <HBar label={t('leadJourney.sourceFunnelChange')} count={contacts.interacted.bySource.funnelChange} max={maxSource} color="#f59e0b" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                      <HBar label={t('leadJourney.sourceStageChange')} count={contacts.interacted.bySource.stageChange} max={maxSource} color="#8b5cf6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                      <HBar label={t('leadJourney.sourceComment')} count={contacts.interacted.bySource.comment} max={maxSource} color="#6366f1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                      <HBar label={t('leadJourney.sourceInbox')} count={contacts.interacted.bySource.inbox} max={maxSource} color="#0ea5e9" />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-surface-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-tertiary">{t('leadJourney.calledTitle')}</p>
                    <p className="text-3xl font-bold text-ink leading-tight">{contacts?.called?.count ?? 0}</p>
                    <p className="text-[10px] text-ink-disabled mt-0.5">{t('leadJourney.calledHint')} · {from} — {to}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 2 — transitions */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4">
              <p className="text-sm font-semibold text-ink mb-4">{t('leadJourney.transitionsWidgetTitle')}</p>
              {!transitions?.transitions?.length ? (
                <p className="text-xs text-ink-tertiary">{t('leadJourney.transitionsEmpty')}</p>
              ) : (
                <div className="space-y-3">
                  {transitions.transitions.map((x, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 text-xs text-ink-secondary">
                          <span className="truncate">{x.fromFunnel}</span>
                          <ArrowRight className="w-3 h-3 text-ink-disabled shrink-0" />
                          <span className="truncate font-medium text-ink">{x.toFunnel}</span>
                        </div>
                        <span className="text-xs font-semibold text-ink shrink-0">{x.count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${maxTransition ? Math.round((x.count / maxTransition) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Widget 3 — snapshot */}
            <div className="bg-white rounded-2xl border border-surface-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-ink-tertiary" />
                <p className="text-sm font-semibold text-ink">{t('leadJourney.snapshotWidgetTitle')}</p>
              </div>
              <div className="space-y-4">
                {(snapshot?.snapshot || []).map(f => (
                  <div key={f.funnelId}>
                    <p className="text-xs font-semibold text-ink-secondary mb-1.5">{f.funnelName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {f.stages.map(s => (
                        <span key={s.stageId}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-surface-200 bg-surface-50 text-ink-secondary">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color || '#94a3b8' }} />
                          {s.stageName} <span className="font-semibold text-ink">{s.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
