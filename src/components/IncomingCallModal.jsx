import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, User, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function fmtPhone(p) {
  if (!p) return '';
  const s = String(p);
  if (s.length === 12) return `+${s.slice(0,3)} (${s.slice(3,5)}) ${s.slice(5,8)}-${s.slice(8,10)}-${s.slice(10)}`;
  return `+${s}`;
}

export default function IncomingCallModal({ call, onDismiss }) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmtElapsed = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-end p-6 pointer-events-none">
      <div
        className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-surface-200 w-80 overflow-hidden animate-slide-in"
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="bg-emerald-500 px-5 py-4 flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-white/80">
              {call.direction === 'in' ? 'Kiruvchi qo\'ng\'iroq' : 'Chiquvchi qo\'ng\'iroq'}
            </p>
            <p className="text-white font-semibold text-sm">{fmtPhone(call.phone)}</p>
          </div>
          <span className="text-xs text-white/70 font-mono">{fmtElapsed(elapsed)}</span>
        </div>

        {/* Contact info */}
        <div className="px-5 py-4">
          {call.contactName ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
                {call.contactName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{call.contactName}</p>
                <p className="text-xs text-ink-tertiary">CRM kontakt</p>
              </div>
              {call.contactId && (
                <button
                  onClick={() => { navigate(`/contacts/${call.contactId}`); onDismiss(); }}
                  className="ml-auto text-ink-disabled hover:text-primary-600 transition-colors"
                  title="Kontaktni ochish"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center">
                <User className="w-5 h-5 text-ink-disabled" />
              </div>
              <div>
                <p className="text-sm text-ink-tertiary">Noma'lum raqam</p>
                <p className="text-xs text-ink-disabled">CRM'da topilmadi</p>
              </div>
            </div>
          )}

          {call.ext && (
            <p className="text-xs text-ink-tertiary bg-surface-50 rounded-lg px-3 py-1.5 mb-3">
              Kengaytma: <span className="font-mono font-semibold text-ink">{call.ext}</span>
              {call.groupName && <span className="ml-2 text-ink-disabled">· {call.groupName}</span>}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-100 text-ink-secondary hover:bg-surface-200 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Yopish
            </button>
            {call.contactId && (
              <button
                onClick={() => { navigate(`/contacts/${call.contactId}`); onDismiss(); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Kontakt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
