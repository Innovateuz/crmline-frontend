import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const SPEEDS = [1, 1.25, 1.5, 2];

function fmtT(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Qo'ng'iroq yozuvi pleyeri — Calls, Contact/Deal detail sahifalarining
// barchasida shu ishlatiladi: progress bar bo'ylab bosib/sudrab o'tkazib
// eshitish va tezlikni (1x/1.25x/1.5x/2x) o'zgartirish imkoni bilan.
// <audio> elementi faqat birinchi "Play" bosilgandagina yaratiladi - aks holda
// ro'yxatdagi har bir qatorga darhol audio elementi yaratilib, brauzerning
// "WebMediaPlayer" chegarasiga tez urilib qolar edi.
export default function CallRecordingPlayer({ url }) {
  const [activated, setActivated] = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const [current,   setCurrent]   = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [speed,     setSpeed]     = useState(1);
  const [dragging,  setDragging]  = useState(false);
  const audioRef = useRef(null);
  const barRef   = useRef(null);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, activated]);

  if (!url) return <span className="text-xs text-ink-disabled">—</span>;

  const toggle = (e) => {
    e?.stopPropagation();
    if (!activated) { setActivated(true); setPlaying(true); return; }
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const ratioFromEvent = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };

  const seekTo = (ratio) => {
    if (!audioRef.current || !duration) return;
    const t = ratio * duration;
    audioRef.current.currentTime = t;
    setCurrent(t);
  };

  const onBarPointerDown = (e) => {
    e.stopPropagation();
    if (!duration) return;
    setDragging(true);
    seekTo(ratioFromEvent(e));
    const onMove = (ev) => seekTo(ratioFromEvent(ev));
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const i = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
      {activated && (
        <audio ref={audioRef} src={url} autoPlay preload="none"
          onLoadedMetadata={e => setDuration(e.target.duration || 0)}
          onTimeUpdate={e => { if (!dragging) setCurrent(e.target.currentTime); }}
          onEnded={() => { setPlaying(false); setCurrent(0); }}
        />
      )}
      <button type="button" onClick={toggle}
        className="w-7 h-7 rounded-full bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-colors shrink-0">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      {activated && (
        <>
          <div ref={barRef} onPointerDown={onBarPointerDown}
            className="relative h-1.5 bg-surface-200 rounded-full cursor-pointer flex-1 min-w-[64px] max-w-[140px]">
            <div className="absolute top-0 left-0 h-full bg-primary-500 rounded-full pointer-events-none" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary-600 shadow pointer-events-none"
              style={{ left: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-ink-tertiary font-mono tabular-nums shrink-0">
            {fmtT(current)}/{fmtT(duration)}
          </span>
          <button type="button" onClick={cycleSpeed} title="Tezlik"
            className="text-[10px] font-semibold text-ink-tertiary hover:text-primary-600 bg-surface-100 hover:bg-primary-50 px-1.5 py-0.5 rounded-md shrink-0 transition-colors">
            {speed}x
          </button>
        </>
      )}
    </div>
  );
}
