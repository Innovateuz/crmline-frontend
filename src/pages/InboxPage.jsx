import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setTotalUnread } from '../store/inboxSlice';
import { invalidateContacts } from '../store/contactsSlice';
import { useT } from '../utils/translate';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import { mediaUrl as resolveMediaUrl } from '../utils/media';
import {
  Send, MessageSquare, Search, Loader2,
  CheckCheck, User, X, Smile, Trash2, Paperclip, FileText,
  StickyNote, CheckCircle2, RotateCcw, Info, Phone, Mail, Hash, ChevronRight,
  Plus, Check, Tag, UserCheck, Search as SearchIcon, TrendingUp, ArrowLeft,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const CONV_LIMIT = 30;

/* ─── Channel icons ──────────────────────────────────────── */
const CHANNEL_ICON = {
  email: () => <Mail className="w-3.5 h-3.5" />,
  telegram:  () => (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.593l-2.969-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.897.966z"/>
    </svg>
  ),
  whatsapp:  () => (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.133 1.535 5.866L.057 23.857l6.156-1.617A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 01-5.031-1.386l-.36-.214-3.733.98.999-3.645-.235-.374A9.809 9.809 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  ),
  instagram: () => (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  facebook: () => (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
};

const CHANNEL_COLOR = {
  email:     'text-[#6366F1] bg-[#eef2ff]',
  telegram:  'text-[#229ED9] bg-[#e8f4fb]',
  whatsapp:  'text-[#25D366] bg-[#e8faf0]',
  instagram: 'text-[#E1306C] bg-[#fce8ef]',
  facebook:  'text-[#1877F2] bg-[#e7f0fd]',
};

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
}

function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  if (isToday) return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`;
}

function slaInfo(lastMessageAt, status) {
  if (!lastMessageAt || status !== 'unanswered') return null;
  const mins = Math.floor((Date.now() - new Date(lastMessageAt)) / 60000);
  if (mins < 30)  return { label: mins < 1 ? 'Hozir' : `${mins}d`, cls: 'bg-emerald-50 text-emerald-600' };
  if (mins < 60)  return { label: `${mins}d`, cls: 'bg-amber-50 text-amber-600' };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return { label: `${hrs}s`, cls: 'bg-red-50 text-red-600' };
  return { label: `${Math.floor(hrs/24)}k`, cls: 'bg-red-100 text-red-700' };
}

/* ─── Conversation List Item ────────────────────────────── */
function ConvItem({ conv, active, onClick, onContextMenu }) {
  const Icon   = CHANNEL_ICON[conv.channel] || CHANNEL_ICON.telegram;
  const iconCls = CHANNEL_COLOR[conv.channel] || CHANNEL_COLOR.telegram;
  const sla    = slaInfo(conv.lastMessageAt, conv.status);

  return (
    <button
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, conv._id); }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-surface-100 ${
        active ? 'bg-primary-50' : 'hover:bg-surface-50'
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 overflow-hidden">
          {initials(conv.title)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${iconCls}`}>
          <Icon />
        </span>
        {conv.source === 'comment' && conv.postThumb && (
          <img
            src={resolveMediaUrl(conv.postThumb)}
            alt=""
            className="absolute -top-1 -left-1 w-5 h-5 rounded object-cover border-2 border-white shadow"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink truncate">{conv.title || 'Anonim'}</span>
          <div className="flex items-center gap-1 shrink-0">
            {sla && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sla.cls}`}>
                {sla.label}
              </span>
            )}
            <span className="text-[10px] text-ink-disabled">{fmtTime(conv.lastMessageAt)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-ink-tertiary truncate">
            {conv.source === 'comment' && (
              <span className="mr-1 text-[10px] text-pink-600 bg-pink-50 px-1 py-0 rounded">Komment</span>
            )}
            {conv.lastMessage || '...'}
          </span>
          {conv.unreadCount > 0 ? (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          ) : conv.assignedTo?.name ? (
            <span className="shrink-0 text-[10px] text-ink-disabled bg-surface-100 rounded-full px-1.5 py-0.5 truncate max-w-[60px]">
              {conv.assignedTo.name.split(' ')[0]}
            </span>
          ) : null}
        </div>
        {conv.labels?.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {conv.labels.slice(0, 3).map(l => (
              <span key={l} className="text-[9px] font-medium px-1.5 py-0 rounded-full bg-primary-50 text-primary-600 border border-primary-100">
                #{l}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/* ─── File size formatter ───────────────────────────────── */
function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Sticker image (lazy fetch with module-level cache) ── */
const stickerUrlCache = new Map();

function StickerImage({ fileId }) {
  const [info, setInfo] = useState(stickerUrlCache.get(fileId) || null); // { url, ext }

  useEffect(() => {
    if (!fileId || info) return;
    axios.get(`${API_URL}/inbox/sticker-file/${encodeURIComponent(fileId)}`)
      .then(r => {
        const data = { url: r.data.url, ext: r.data.ext || 'webp' };
        stickerUrlCache.set(fileId, data);
        setInfo(data);
      })
      .catch(() => {});
  }, [fileId, info]);

  if (!info) return <span className="text-5xl">🎭</span>;
  if (info.ext === 'webm') {
    return (
      <video
        src={info.url}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    );
  }
  return <img src={info.url} alt="sticker" className="w-full h-full object-contain" />;
}

/* ─── Media attachment (lazy fetch URL, cached) ─────────── */
const mediaUrlCache = new Map();

function MediaAttachment({ msg, isOut }) {
  const { mediaType, mediaUrl: directUrl, mediaFileId, mediaFileName, mediaMimeType, mediaFileSize, mediaDuration } = msg;
  // Instagram media to'g'ridan-to'g'ri URL bilan keladi (R2'da saqlangan);
  // Telegram esa file_id orqali — uni alohida so'rov bilan olamiz.
  const [info, setInfo] = useState(() =>
    directUrl ? { url: resolveMediaUrl(directUrl), ext: '' } : (mediaUrlCache.get(mediaFileId) || null)
  );

  useEffect(() => {
    if (directUrl || !mediaFileId || info) return;
    axios.get(`${API_URL}/inbox/media-file/${encodeURIComponent(mediaFileId)}`)
      .then(r => { const d = { url: r.data.url, ext: r.data.ext || '' }; mediaUrlCache.set(mediaFileId, d); setInfo(d); })
      .catch(() => {});
  }, [mediaFileId, info, directUrl]);

  const textCls = isOut ? 'text-white/80' : 'text-ink-tertiary';

  if (!info) return (
    <div className="flex items-center gap-2 py-1">
      <Loader2 className="w-4 h-4 animate-spin opacity-50" />
      <span className={`text-xs ${textCls}`}>Yuklanmoqda...</span>
    </div>
  );

  if (mediaType === 'photo') return (
    <a href={info.url} target="_blank" rel="noreferrer" className="block">
      <img src={info.url} alt="photo" className="max-w-[260px] max-h-64 rounded-xl object-cover" />
    </a>
  );

  if (mediaType === 'video' || mediaType === 'video_note') return (
    <video controls src={info.url} className="max-w-[260px] max-h-48 rounded-xl"
      style={{ display: 'block' }}>
      <source src={info.url} type={mediaMimeType || 'video/mp4'} />
    </video>
  );

  if (mediaType === 'voice' || mediaType === 'audio') return (
    <div className="min-w-[200px]">
      {mediaFileName && mediaFileName !== 'audio' && (
        <p className={`text-xs font-medium mb-1 truncate max-w-[220px] ${isOut ? 'text-white' : 'text-ink'}`}>{mediaFileName}</p>
      )}
      <audio controls src={info.url} className="w-full h-8" style={{ minWidth: 200 }}>
        <source src={info.url} type={mediaMimeType || 'audio/ogg'} />
      </audio>
      {mediaDuration > 0 && (
        <p className={`text-[10px] mt-0.5 ${textCls}`}>{mediaDuration}s</p>
      )}
    </div>
  );

  if (mediaType === 'document') return (
    <a href={info.url} target="_blank" rel="noreferrer" download={mediaFileName}
      className={`flex items-center gap-2 py-1 hover:opacity-80 transition-opacity`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isOut ? 'bg-white/20' : 'bg-surface-100'}`}>
        <span className="text-lg">📄</span>
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium truncate max-w-[180px] ${isOut ? 'text-white' : 'text-ink'}`}>{mediaFileName || 'Fayl'}</p>
        <p className={`text-[10px] ${textCls}`}>{fmtSize(mediaFileSize)}</p>
      </div>
    </a>
  );

  return <a href={info.url} target="_blank" rel="noreferrer" className={`text-xs underline ${textCls}`}>Faylni ochish</a>;
}

/* ─── Chat Bubble ───────────────────────────────────────── */
function Bubble({ msg, onContextMenu }) {
  const isOut     = msg.direction === 'out';
  const isNote    = msg.isNote;
  const isSticker = msg.mediaType === 'sticker';
  const hasMedia  = (msg.mediaFileId || msg.mediaUrl) && ['photo','video','video_note','voice','audio','document'].includes(msg.mediaType);

  // Internal note — special style
  if (isNote) {
    return (
      <div
        onContextMenu={e => { e.preventDefault(); onContextMenu(e, msg._id); }}
        className="flex justify-center mb-2"
      >
        <div className="max-w-[80%] bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 text-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-amber-600">Ichki eslatma</span>
            {msg.sentBy?.name && <span className="text-[10px] text-amber-500">· {msg.sentBy.name}</span>}
          </div>
          <p className="text-ink leading-relaxed">{msg.text}</p>
          <p className="text-[10px] text-amber-400 mt-1 text-right">{fmtTime(msg.createdAt)}</p>
        </div>
      </div>
    );
  }

  if (isSticker) {
    return (
      <div
        onContextMenu={e => { e.preventDefault(); onContextMenu(e, msg._id); }}
        className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1 select-none`}
      >
        <div className={`flex flex-col gap-1 ${isOut ? 'items-end' : 'items-start'}`}>
          <div className="w-28 h-28 flex items-center justify-center">
            <StickerImage fileId={msg.stickerFileId} />
          </div>
          {msg.stickerSetName && (
            <span className="text-[10px] text-ink-tertiary bg-surface-100 rounded-full px-2 py-0.5 font-mono">
              {msg.stickerSetName}
            </span>
          )}
          <span className="text-[10px] text-ink-disabled flex items-center gap-1">
            {fmtTime(msg.createdAt)}
            {isOut && <CheckCheck className="w-3 h-3" />}
          </span>
        </div>
      </div>
    );
  }

  const isEmail = !!msg.emailMsgId || !!msg.emailSubject;

  return (
    <div
      onContextMenu={e => { e.preventDefault(); onContextMenu(e, msg._id); }}
      className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div
        className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isOut
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white border border-surface-200 text-ink rounded-bl-sm'
        }`}
      >
        {isEmail && msg.emailSubject && (
          <p className={`text-[11px] font-semibold mb-1 border-b pb-1 ${isOut ? 'border-white/20 text-white/80' : 'border-surface-100 text-ink-tertiary'}`}>
            {msg.emailSubject}
          </p>
        )}
        {isEmail && (msg.emailFrom || msg.emailTo) && (
          <p className={`text-[10px] mb-1.5 ${isOut ? 'text-white/60' : 'text-ink-disabled'}`}>
            {isOut ? `→ ${msg.emailTo}` : `${msg.emailFrom}`}
          </p>
        )}
        {hasMedia && <MediaAttachment msg={msg} isOut={isOut} />}
        {msg.text && <p className={hasMedia ? 'mt-1' : ''}>{msg.text}</p>}
        {!hasMedia && !msg.text && msg.mediaType && (
          <span className="italic text-xs opacity-70">[{msg.mediaType}]</span>
        )}
        <div className={`flex items-center gap-1 mt-1 justify-end ${isOut ? 'text-white/60' : 'text-ink-disabled'}`}>
          <span className="text-[10px]">{fmtTime(msg.createdAt)}</span>
          {isOut && <CheckCheck className="w-3 h-3" />}
        </div>
      </div>
    </div>
  );
}

/* ─── Main InboxPage ────────────────────────────────────── */
export default function InboxPage() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const t = useT();
  const orgId = useSelector(s => s.auth.user?.organization?.id || s.auth.user?.organization?._id);

  const [conversations, setConversations]   = useState([]);
  const [activeConvId,  setActiveConvId]    = useState(null);
  const [messages,      setMessages]        = useState([]);
  const [search,        setSearch]          = useState('');
  const [text,          setText]            = useState('');
  const [loadingConvs,  setLoadingConvs]    = useState(true);
  const [loadingMsgs,   setLoadingMsgs]     = useState(false);
  const [sending,       setSending]         = useState(false);
  const [inboxTab,      setInboxTab]        = useState('unanswered');
  const [ctxMenu,       setCtxMenu]         = useState(null); // { x, y, type:'conv'|'msg', id }
  const [showStickers,  setShowStickers]    = useState(() => localStorage.getItem('inbox_sticker_panel') === 'true');
  const [orgPacks,      setOrgPacks]        = useState([]);
  const [activePackIdx, setActivePackIdx]   = useState(0);
  const [packStickers,  setPackStickers]    = useState({});
  const [loadingPack,   setLoadingPack]     = useState(false);
  const [pendingFile,   setPendingFile]     = useState(null);
  const [isNoteMode,    setIsNoteMode]      = useState(false);
  const [quickReplies,  setQuickReplies]    = useState([]);
  const [showQR,        setShowQR]          = useState(false);
  const [qrFilter,      setQrFilter]        = useState('');
  const [qrIdx,         setQrIdx]           = useState(0);
  const [showInfo,        setShowInfo]          = useState(false);
  const [contactInfo,     setContactInfo]       = useState(null);
  const [loadingInfo,     setLoadingInfo]       = useState(false);
  const [contactForm,     setContactForm]       = useState({ name: '', phone: '', email: '' });
  const [showContactForm, setShowContactForm]   = useState(false);
  const [savingContact,   setSavingContact]     = useState(false);
  // Labels
  const [labelFilter,     setLabelFilter]       = useState('');   // filter sidebar by label
  const [showLabelPanel,  setShowLabelPanel]    = useState(false);
  const [labelInput,      setLabelInput]        = useState('');
  // Reassign
  const [showReassign,    setShowReassign]      = useState(false);
  const [orgUsers,        setOrgUsers]          = useState([]);
  // Message search + date filter
  const [msgSearch,       setMsgSearch]         = useState('');
  const [showMsgSearch,   setShowMsgSearch]     = useState(false);
  const [msgDateFrom,     setMsgDateFrom]       = useState('');
  const [msgDateTo,       setMsgDateTo]         = useState('');
  // Pagination
  const [convPage,  setConvPage]  = useState(1);
  const [convTotal, setConvTotal] = useState(0);
  const [convPages, setConvPages] = useState(1);
  const [loadKey,   setLoadKey]   = useState(0);

  const fileInputRef    = useRef(null);
  const textareaRef     = useRef(null);
  const searchTimerRef  = useRef(null);

  // Refs updated every render — no stale closures in socket handlers
  const inboxTabRef = useRef(inboxTab);
  const convPageRef = useRef(convPage);
  const searchRef   = useRef(search);
  inboxTabRef.current = inboxTab;
  convPageRef.current = convPage;
  searchRef.current   = search;

  const messagesEndRef = useRef(null);
  const activeConv = conversations.find(c => c._id === activeConvId);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const params = {
        status: inboxTabRef.current,
        page:   convPageRef.current,
        limit:  CONV_LIMIT,
      };
      if (searchRef.current) params.search = searchRef.current;
      const res = await axios.get(`${API_URL}/inbox`, { params });
      setConversations(res.data.conversations || []);
      setConvTotal(res.data.total   || 0);
      setConvPages(res.data.pages   || 1);
    } catch {
      toast.error('Yuklanishda xato');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations, inboxTab, convPage, loadKey]);

  // Debounce search — reset page and trigger reload
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setConvPage(1);
      setLoadKey(k => k + 1);
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // activeConvId ref — closure muammosiz listener ichida ishlaydi
  const activeConvIdRef  = useRef(activeConvId);
  const typingThrottle   = useRef(0);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  // Socket.io — join org room once
  useEffect(() => {
    if (!orgId) return;
    connectSocket(orgId);
    return () => disconnectSocket(orgId);
  }, [orgId]);

  // Socket.io — message listeners
  useEffect(() => {
    if (!orgId) return;
    const socket = getSocket();

    const onMessage = ({ conversationId, message }) => {
      const isOpen = String(conversationId) === String(activeConvIdRef.current);
      if (isOpen) {
        setMessages(prev => prev.some(m => String(m._id) === String(message._id)) ? prev : [...prev, message]);
      }
      setConversations(prev => {
        const exists = prev.some(c => String(c._id) === String(conversationId));
        if (!exists) {
          // New conversation — reload to get full data
          loadConversations();
          return prev;
        }
        return prev.map(c =>
          String(c._id) === String(conversationId)
            ? { ...c, lastMessage: message.text || `[${message.mediaType || 'media'}]`, lastMessageAt: message.createdAt, unreadCount: isOpen ? 0 : (c.unreadCount || 0) + 1 }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };

    const onConvUpdated = ({ conversationId, updates } = {}) => {
      if (updates && conversationId) {
        setConversations(prev => prev.map(c =>
          String(c._id) === String(conversationId) ? { ...c, ...updates } : c
        ));
      } else {
        loadConversations();
      }
    };

    socket.on('inbox:message', onMessage);
    socket.on('inbox:conversation-updated', onConvUpdated);

    return () => {
      socket.off('inbox:message', onMessage);
      socket.off('inbox:conversation-updated', onConvUpdated);
    };
  }, [orgId, loadConversations]);

  const openConv = async (conv) => {
    setActiveConvId(conv._id);
    setMessages([]);
    setLoadingMsgs(true);
    setMsgSearch('');
    setMsgDateFrom('');
    setMsgDateTo('');
    setShowMsgSearch(false);
    try {
      const res = await axios.get(`${API_URL}/inbox/${conv._id}/messages`);
      setMessages(res.data.messages || []);
      // Apply updated conversation from server (may include auto-assign)
      if (res.data.conversation) {
        const updated = res.data.conversation;
        setConversations(prev => prev.map(c =>
          c._id === conv._id ? { ...c, ...updated, unreadCount: 0 } : c
        ));
      }
    } catch {
      toast.error('Xato');
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !activeConvId || sending) return;
    setSending(true);
    const draft = text.trim();
    setText('');
    setShowQR(false);
    try {
      const body = isNoteMode ? { text: draft, isNote: true } : { text: draft };
      const res = await axios.post(`${API_URL}/inbox/${activeConvId}/send`, body);
      setMessages(prev => prev.some(m => String(m._id) === String(res.data.message._id)) ? prev : [...prev, res.data.message]);
      if (!isNoteMode) {
        setConversations(prev => prev.map(c =>
          c._id === activeConvId ? { ...c, lastMessage: draft, lastMessageAt: new Date() } : c
        ));
      }
    } catch (e) {
      setText(draft);
      toast.error(e.response?.data?.message || t('inbox.sendError'));
    } finally {
      setSending(false);
    }
  };

  // Load org sticker packs + quick replies
  useEffect(() => {
    axios.get(`${API_URL.replace('/api', '')}/api/organization/sticker-packs`)
      .then(r => setOrgPacks(r.data.stickerPacks || []))
      .catch(() => {});
    axios.get(`${API_URL}/inbox/quick-replies`)
      .then(r => setQuickReplies(r.data.replies || []))
      .catch(() => {});
  }, []);

  // Load a pack's stickers (lazy, cached)
  const loadPack = useCallback(async (name) => {
    if (!name || packStickers[name]) return;
    setLoadingPack(true);
    try {
      const res = await axios.get(`${API_URL}/inbox/sticker-set/${encodeURIComponent(name)}`);
      setPackStickers(prev => ({ ...prev, [name]: res.data.stickers || [] }));
    } catch {
      setPackStickers(prev => ({ ...prev, [name]: [] }));
    } finally {
      setLoadingPack(false);
    }
  }, [packStickers]);

  // When panel opens or active tab changes — load that pack
  useEffect(() => {
    if (showStickers && orgPacks[activePackIdx]) {
      loadPack(orgPacks[activePackIdx]);
    }
  }, [showStickers, activePackIdx, orgPacks, loadPack]);

  const toggleStickers = () => {
    setShowStickers(v => {
      const next = !v;
      localStorage.setItem('inbox_sticker_panel', String(next));
      if (next) setShowInfo(false);
      return next;
    });
  };

  // Quick reply: watch "/" in textarea
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (val.startsWith('/')) {
      setQrFilter(val.slice(1).toLowerCase());
      setShowQR(true);
      setQrIdx(0);
    } else {
      setShowQR(false);
    }
    // Typing indicator — throttled to once per 4 seconds, skip for email
    if (activeConvId && !isNoteMode && val.trim() && activeConv?.channel !== 'email') {
      const now = Date.now();
      if (now - typingThrottle.current > 4000) {
        typingThrottle.current = now;
        axios.post(`${API_URL}/inbox/${activeConvId}/typing`).catch(() => {});
      }
    }
  };

  const filteredQR = quickReplies.filter(r =>
    !qrFilter || r.title.toLowerCase().includes(qrFilter) || r.text.toLowerCase().includes(qrFilter)
  );

  const selectQR = (reply) => {
    setText(reply.text);
    setShowQR(false);
    textareaRef.current?.focus();
  };

  const handleTextKeyDown = (e) => {
    if (showQR && filteredQR.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setQrIdx(i => Math.min(i + 1, filteredQR.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setQrIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter')     { e.preventDefault(); selectQR(filteredQR[qrIdx]); return; }
      if (e.key === 'Escape')    { setShowQR(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pendingFile ? handleSendFile() : handleSend(); }
  };

  // Resolve / Reopen conversation
  const handleResolve = async () => {
    if (!activeConvId) return;
    try {
      await axios.put(`${API_URL}/inbox/${activeConvId}/status`, { status: 'closed' });
      setConversations(prev => prev.filter(c => c._id !== activeConvId));
      setActiveConvId(null);
      setMessages([]);
      toast.success('Chat yopildi');
    } catch { toast.error('Xato'); }
  };

  const handleReopen = async () => {
    if (!activeConvId) return;
    try {
      await axios.put(`${API_URL}/inbox/${activeConvId}/status`, { status: 'unanswered' });
      setConversations(prev => prev.filter(c => c._id !== activeConvId));
      setActiveConvId(null);
      setMessages([]);
      toast.success('Chat qayta ochildi');
    } catch { toast.error('Xato'); }
  };

  // Contact info panel
  const toggleInfo = async () => {
    if (showInfo) { setShowInfo(false); return; }
    setShowInfo(true);
    setShowStickers(false);
    setShowContactForm(false);
    localStorage.setItem('inbox_sticker_panel', 'false');
    if (!activeConvId) return;
    setLoadingInfo(true);
    try {
      const res = await axios.get(`${API_URL}/inbox/${activeConvId}/contact-info`);
      setContactInfo(res.data);
      setContactForm({ name: res.data.conv?.title || '', phone: '', email: '' });
    } catch { toast.error('Ma\'lumot yuklanmadi'); }
    finally { setLoadingInfo(false); }
  };

  const handleCreateContact = async () => {
    if (!activeConvId || savingContact) return;
    setSavingContact(true);
    try {
      const res = await axios.post(`${API_URL}/inbox/${activeConvId}/create-contact`, contactForm);
      if (res.data.alreadyExists) {
        toast.success('Bu kontakt allaqachon mavjud');
      } else {
        toast.success('Kontakt yaratildi');
        dispatch(invalidateContacts());
      }
      // Reload contact info to show linked contact
      const info = await axios.get(`${API_URL}/inbox/${activeConvId}/contact-info`);
      setContactInfo(info.data);
      setShowContactForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Xato');
    } finally {
      setSavingContact(false);
    }
  };

  // Load org users for reassign
  useEffect(() => {
    axios.get(`${API_URL.replace('/api', '')}/api/organization/users`)
      .then(r => setOrgUsers(r.data.users || []))
      .catch(() => {});
  }, []);

  // Reassign
  const handleReassign = async (userId) => {
    if (!activeConvId) return;
    setShowReassign(false);
    try {
      await axios.put(`${API_URL}/inbox/${activeConvId}/assign`, { assignedTo: userId || null });
      setConversations(prev => prev.map(c =>
        c._id === activeConvId
          ? { ...c, assignedTo: userId ? orgUsers.find(u => u._id === userId) : null }
          : c
      ));
      toast.success(userId ? 'Agent belgilandi' : 'Agent olib tashlandi');
    } catch { toast.error('Xato'); }
  };

  // Labels
  const activeLabels = activeConv?.labels || [];

  const handleAddLabel = async () => {
    const label = labelInput.trim().replace(/^#/, '');
    if (!label || !activeConvId) return;
    if (activeLabels.includes(label)) { setLabelInput(''); return; }
    const next = [...activeLabels, label];
    setLabelInput('');
    try {
      await axios.put(`${API_URL}/inbox/${activeConvId}/labels`, { labels: next });
      setConversations(prev => prev.map(c => c._id === activeConvId ? { ...c, labels: next } : c));
    } catch { toast.error('Xato'); }
  };

  const handleRemoveLabel = async (label) => {
    if (!activeConvId) return;
    const next = activeLabels.filter(l => l !== label);
    try {
      await axios.put(`${API_URL}/inbox/${activeConvId}/labels`, { labels: next });
      setConversations(prev => prev.map(c => c._id === activeConvId ? { ...c, labels: next } : c));
    } catch { toast.error('Xato'); }
  };

  // All unique labels in org for sidebar filter
  const allLabels = [...new Set(conversations.flatMap(c => c.labels || []))];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;
    setPendingFile({ file, previewUrl, type: isImage ? 'image' : isVideo ? 'video' : 'document' });
    e.target.value = '';
  };

  const cancelFile = () => {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
  };

  const handleSendFile = async () => {
    if (!pendingFile || !activeConvId || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.append('file', pendingFile.file);
    if (text.trim()) fd.append('text', text.trim());
    try {
      const res = await axios.post(`${API_URL}/inbox/${activeConvId}/send`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(prev => prev.some(m => String(m._id) === String(res.data.message._id)) ? prev : [...prev, res.data.message]);
      setConversations(prev => prev.map(c =>
        c._id === activeConvId ? { ...c, lastMessage: res.data.message.text || `[${pendingFile.file.name}]`, lastMessageAt: new Date() } : c
      ));
      cancelFile();
      setText('');
    } catch (e) {
      toast.error(e.response?.data?.message || t('inbox.sendError'));
    } finally {
      setSending(false);
    }
  };

  const handleSendSticker = async (fileId) => {
    if (!activeConvId || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/inbox/${activeConvId}/send`, { stickerFileId: fileId });
      setMessages(prev => prev.some(m => String(m._id) === String(res.data.message._id)) ? prev : [...prev, res.data.message]);
      setConversations(prev => prev.map(c =>
        c._id === activeConvId ? { ...c, lastMessage: '[Sticker]', lastMessageAt: new Date() } : c
      ));
    } catch (e) {
      toast.error(e.response?.data?.message || t('inbox.sendError'));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    setCtxMenu(null);
    if (!window.confirm("Bu chatni o'chirishni tasdiqlaysizmi? Barcha xabarlar ham o'chadi.")) return;
    try {
      await axios.delete(`${API_URL}/inbox/${convId}`);
      setConversations(prev => prev.filter(c => c._id !== convId));
      if (activeConvId === convId) { setActiveConvId(null); setMessages([]); }
    } catch {
      toast.error("O'chirishda xato");
    }
  };

  const handleDeleteMessage = async (msgId) => {
    setCtxMenu(null);
    try {
      await axios.delete(`${API_URL}/inbox/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch {
      toast.error("O'chirishda xato");
    }
  };

  const openCtxMenu = (e, type, id) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const filteredConvs = conversations.filter(c =>
    !labelFilter || (c.labels || []).includes(labelFilter)
  );

  const displayedMessages = messages.filter(m => {
    const textMatch = !msgSearch.trim() || m.text?.toLowerCase().includes(msgSearch.toLowerCase());
    const dateFrom  = msgDateFrom ? new Date(msgDateFrom) : null;
    const dateTo    = msgDateTo   ? new Date(msgDateTo + 'T23:59:59') : null;
    const msgDate   = new Date(m.createdAt);
    return textMatch && (!dateFrom || msgDate >= dateFrom) && (!dateTo || msgDate <= dateTo);
  });

  const unansweredCount = conversations.filter(c => c.status === 'unanswered').reduce((s, c) => s + (c.unreadCount || 0), 0);
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  // Sync global badge for BottomNav
  useEffect(() => { dispatch(setTotalUnread(totalUnread)); }, [totalUnread, dispatch]);

  return (
    <div className="flex h-full overflow-hidden" onClick={() => { ctxMenu && setCtxMenu(null); showReassign && setShowReassign(false); showLabelPanel && setShowLabelPanel(false); }}>
      {/* ── Context menu ── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onContextMenu={e => e.preventDefault()} />
          <div
            className="fixed z-50 bg-white border border-surface-200 rounded-xl shadow-xl py-1 min-w-[160px]"
            style={{ left: Math.min(ctxMenu.x, window.innerWidth - 180), top: Math.min(ctxMenu.y, window.innerHeight - 80) }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => ctxMenu.type === 'conv' ? handleDeleteConversation(ctxMenu.id) : handleDeleteMessage(ctxMenu.id)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('inbox.delete')}
            </button>
          </div>
        </>
      )}

      {/* ── Left panel: conversation list ── */}
      <div className={`${activeConvId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 lg:shrink-0 flex-col border-r border-surface-200 bg-white`}>
        {/* Header */}
        <div className="px-4 pt-3 pb-0 border-b border-surface-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-ink">Inbox</span>
            {totalUnread > 0 && (
              <span className="text-[10px] font-bold bg-primary-600 text-white rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
            <button
              onClick={() => navigate('/inbox/analytics')}
              title="Analitika"
              className="ml-auto w-7 h-7 rounded-lg bg-surface-100 hover:bg-primary-50 hover:text-primary-600 text-ink-disabled flex items-center justify-center transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex -mb-px">
            {[
              { key: 'unanswered', labelKey: 'inbox.tabUnanswered' },
              { key: 'accepted',   labelKey: 'inbox.tabAccepted'  },
              { key: 'closed',     labelKey: 'inbox.tabClosed'    },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setInboxTab(tab.key); setActiveConvId(null); setConvPage(1); }}
                className={`flex-1 text-xs font-medium py-2 border-b-2 transition-colors ${
                  inboxTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-ink-tertiary hover:text-ink'
                }`}
              >
                {t(tab.labelKey)}
                {tab.key === 'unanswered' && unansweredCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold">
                    {unansweredCount > 99 ? '99+' : unansweredCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Search */}
        <div className="px-3 py-2 border-b border-surface-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-100 rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary-300"
              placeholder="Qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Label filter chips */}
        {allLabels.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {allLabels.map(l => (
              <button
                key={l}
                onClick={() => setLabelFilter(labelFilter === l ? '' : l)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  labelFilter === l
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-surface-50 text-ink-tertiary border-surface-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                #{l}
              </button>
            ))}
          </div>
        )}

        {/* Total count */}
        {!loadingConvs && convTotal > 0 && (
          <div className="px-3 py-1 border-b border-surface-100 bg-surface-50">
            <span className="text-[10px] text-ink-disabled">{convTotal} ta suhbat</span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="py-12 text-center text-ink-tertiary">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {inboxTab === 'unanswered' ? (
                <>
                  <p className="text-sm">{t('inbox.noUnanswered')}</p>
                  <p className="text-xs mt-1 px-4 text-ink-disabled">{t('inbox.noUnansweredHint')}</p>
                </>
              ) : inboxTab === 'closed' ? (
                <>
                  <p className="text-sm">{t('inbox.noClosed')}</p>
                  <p className="text-xs mt-1 px-4 text-ink-disabled">{t('inbox.noClosedHint')}</p>
                </>
              ) : (
                <>
                  <p className="text-sm">{t('inbox.noAccepted')}</p>
                  <p className="text-xs mt-1 px-4 text-ink-disabled">{t('inbox.noAcceptedHint')}</p>
                </>
              )}
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConvItem
                key={conv._id}
                conv={conv}
                active={conv._id === activeConvId}
                onClick={() => openConv(conv)}
                onContextMenu={(e, id) => openCtxMenu(e, 'conv', id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {convPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-surface-100 bg-white shrink-0">
            <button
              disabled={convPage <= 1}
              onClick={() => setConvPage(p => p - 1)}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-100 hover:bg-surface-200 disabled:opacity-30 transition-colors"
            >
              ← Oldingi
            </button>
            <span className="text-[11px] text-ink-tertiary font-medium">{convPage} / {convPages}</span>
            <button
              disabled={convPage >= convPages}
              onClick={() => setConvPage(p => p + 1)}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-100 hover:bg-surface-200 disabled:opacity-30 transition-colors"
            >
              Keyingi →
            </button>
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* Chat column */}
          <div className="flex-1 flex flex-col bg-surface-50 min-w-0 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-3 lg:px-5 py-3 bg-white border-b border-surface-200 flex items-center gap-2 lg:gap-3">
              <button
                onClick={() => setActiveConvId(null)}
                className="lg:hidden -ml-1 p-1.5 rounded-lg hover:bg-surface-100 text-ink-tertiary flex-shrink-0"
                aria-label="Orqaga"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                {initials(activeConv.title)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{activeConv.title || 'Anonim'}</p>
                <div className="flex items-center gap-2">
                  {activeConv.username && (
                    <p className="text-xs text-ink-tertiary">
                      {activeConv.channel === 'email' ? activeConv.username : `@${activeConv.username}`}
                    </p>
                  )}
                  {activeConv.source === 'comment' && (
                    <span className="text-xs text-pink-600 bg-pink-50 px-1.5 py-0 rounded-full">Komment</span>
                  )}
                  {activeConv.channel === 'email' && activeConv.emailSubject && (
                    <p className="text-xs text-ink-disabled truncate max-w-[200px]" title={activeConv.emailSubject}>
                      {activeConv.emailSubject}
                    </p>
                  )}
                  {activeConv.assignedTo?.name && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0 rounded-full flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {activeConv.assignedTo.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLOR[activeConv.channel] || ''}`}>
                {(() => { const I = CHANNEL_ICON[activeConv.channel]; return I ? <I /> : null; })()}
                <span className="ml-1 capitalize">{activeConv.channel}</span>
              </div>
              {/* Message search toggle */}
              <button
                onClick={() => { setShowMsgSearch(v => !v); setMsgSearch(''); setMsgDateFrom(''); setMsgDateTo(''); }}
                title="Xabar qidirish"
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  showMsgSearch ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                }`}
              >
                <SearchIcon className="w-4 h-4" />
              </button>
              {/* Reassign */}
              <div className="relative">
                <button
                  onClick={() => setShowReassign(v => !v)}
                  title="Agent o'zgartirish"
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    showReassign ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </button>
                {showReassign && (
                  <div className="absolute right-0 top-10 z-50 bg-white border border-surface-200 rounded-xl shadow-xl py-1 min-w-[180px]"
                    onClick={e => e.stopPropagation()}>
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-ink-disabled uppercase tracking-wide">Agent tanlang</p>
                    <button
                      onClick={() => handleReassign(null)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </div>
                      Olib tashlash
                    </button>
                    {orgUsers.map(u => (
                      <button
                        key={u._id}
                        onClick={() => handleReassign(u._id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 transition-colors ${
                          activeConv?.assignedTo?._id === u._id || activeConv?.assignedTo === u._id
                            ? 'text-primary-600 font-medium' : 'text-ink'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                          {initials(u.name)}
                        </div>
                        <span className="truncate">{u.name}</span>
                        {(activeConv?.assignedTo?._id === u._id || activeConv?.assignedTo === u._id) && (
                          <Check className="w-3 h-3 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Label panel toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowLabelPanel(v => !v)}
                  title="Yorliqlar"
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    showLabelPanel ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                </button>
                {showLabelPanel && (
                  <div className="absolute right-0 top-10 z-50 bg-white border border-surface-200 rounded-xl shadow-xl p-3 w-64"
                    onClick={e => e.stopPropagation()}>
                    <p className="text-xs font-semibold text-ink mb-2">Yorliqlar</p>

                    {/* Active labels on this chat */}
                    {activeLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {activeLabels.map(l => (
                          <span key={l} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                            #{l}
                            <button onClick={() => handleRemoveLabel(l)} className="hover:text-red-500 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Existing org labels to pick from */}
                    {allLabels.filter(l => !activeLabels.includes(l)).length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-ink-disabled mb-1.5">Mavjud yorliqlar</p>
                        <div className="flex flex-wrap gap-1">
                          {allLabels.filter(l => !activeLabels.includes(l)).map(l => (
                            <button
                              key={l}
                              onClick={async () => {
                                const next = [...activeLabels, l];
                                try {
                                  await axios.put(`${API_URL}/inbox/${activeConvId}/labels`, { labels: next });
                                  setConversations(prev => prev.map(c => c._id === activeConvId ? { ...c, labels: next } : c));
                                } catch { toast.error('Xato'); }
                              }}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-dashed border-surface-300 text-ink-tertiary hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              + #{l}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New label input */}
                    <div className="flex gap-1">
                      <input
                        className="flex-1 border border-surface-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="Yangi yorliq..."
                        value={labelInput}
                        onChange={e => setLabelInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLabel(); } }}
                      />
                      <button
                        onClick={handleAddLabel}
                        disabled={!labelInput.trim()}
                        className="px-2.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-700 disabled:opacity-40 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Resolve / Reopen button */}
              {activeConv.status === 'closed' ? (
                <button
                  onClick={handleReopen}
                  title="Chatni qayta ochish"
                  className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('inbox.openConv')}</span>
                </button>
              ) : (
                <button
                  onClick={handleResolve}
                  title={t('inbox.closeConv')}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('inbox.closeConv')}</span>
                </button>
              )}
              {/* Info toggle */}
              <button
                onClick={toggleInfo}
                title="Kontakt ma'lumotlari"
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  showInfo ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                }`}
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            {/* Instagram komment — qaysi post ostida ekanini ko'rsatuvchi banner */}
            {activeConv.source === 'comment' && (
              <a
                href={activeConv.postUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className={`shrink-0 flex items-center gap-3 px-4 py-2 border-b border-surface-100 bg-pink-50/60 ${activeConv.postUrl ? 'hover:bg-pink-50 cursor-pointer' : 'cursor-default'}`}
              >
                {activeConv.postThumb ? (
                  <img
                    src={resolveMediaUrl(activeConv.postThumb)}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-pink-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center shrink-0 text-pink-500">
                    {(() => { const I = CHANNEL_ICON.instagram; return <I />; })()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-pink-600 uppercase tracking-wide">Post ostidagi komment</p>
                  <p className="text-xs text-ink-secondary truncate">
                    {activeConv.postCaption || 'Post matni yo\'q'}
                  </p>
                </div>
                {activeConv.postUrl && (
                  <span className="text-[11px] text-pink-600 font-medium shrink-0">Postni ochish →</span>
                )}
              </a>
            )}

            {/* Message search bar */}
            {showMsgSearch && (
              <div className="shrink-0 px-4 py-2 border-b border-surface-100 bg-white space-y-2">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-disabled" />
                  <input
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 text-sm bg-surface-50 rounded-xl border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    placeholder="Xabarlar ichida qidirish..."
                    value={msgSearch}
                    onChange={e => setMsgSearch(e.target.value)}
                  />
                  {msgSearch && (
                    <button onClick={() => setMsgSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-disabled hover:text-ink">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-2 py-1 text-xs bg-surface-50 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-ink"
                    value={msgDateFrom}
                    onChange={e => setMsgDateFrom(e.target.value)}
                  />
                  <span className="text-xs text-ink-disabled">—</span>
                  <input
                    type="date"
                    className="flex-1 px-2 py-1 text-xs bg-surface-50 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-ink"
                    value={msgDateTo}
                    onChange={e => setMsgDateTo(e.target.value)}
                  />
                  {(msgDateFrom || msgDateTo) && (
                    <button onClick={() => { setMsgDateFrom(''); setMsgDateTo(''); }} className="text-ink-disabled hover:text-ink">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {(msgSearch || msgDateFrom || msgDateTo) && (
                  <p className="text-[10px] text-ink-tertiary px-1">
                    {displayedMessages.length} ta natija
                  </p>
                )}
              </div>
            )}

            {/* Active labels in header */}
            {activeLabels.length > 0 && (
              <div className="shrink-0 px-5 py-1.5 bg-white border-b border-surface-100 flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3 h-3 text-ink-disabled shrink-0" />
                {activeLabels.map(l => (
                  <span key={l} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                    #{l}
                  </span>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-tertiary">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">{msgSearch ? t('inbox.msgNotFound') : t('inbox.noMsgs')}</p>
                </div>
              ) : (
                displayedMessages.map(msg => (
                  <Bubble
                    key={msg._id}
                    msg={msg}
                    onContextMenu={(e, id) => openCtxMenu(e, 'msg', id)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative shrink-0 bg-white border-t border-surface-200 px-4 py-3 space-y-2">
              {/* Note mode indicator */}
              {isNoteMode && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium">{t('inbox.noteMode')}</span>
                </div>
              )}

              {/* File preview */}
              {pendingFile && (
                <div className="flex items-center gap-2 p-2 bg-surface-50 rounded-xl border border-surface-200">
                  {pendingFile.type === 'image' && (
                    <img src={pendingFile.previewUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  {pendingFile.type === 'video' && (
                    <video src={pendingFile.previewUrl} className="w-12 h-12 rounded-lg object-cover shrink-0" muted />
                  )}
                  {pendingFile.type === 'document' && (
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{pendingFile.file.name}</p>
                    <p className="text-[10px] text-ink-tertiary">{fmtSize(pendingFile.file.size)}</p>
                  </div>
                  <button onClick={cancelFile} className="shrink-0 w-6 h-6 rounded-full hover:bg-surface-200 flex items-center justify-center text-ink-disabled hover:text-ink transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Quick reply dropdown */}
              {showQR && filteredQR.length > 0 && (
                <div className="absolute bottom-[80px] left-0 right-0 mx-4 bg-white border border-surface-200 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto">
                  {filteredQR.map((r, i) => (
                    <button
                      key={r._id}
                      onClick={() => selectQR(r)}
                      className={`w-full flex flex-col items-start px-3 py-2 text-left transition-colors ${i === qrIdx ? 'bg-primary-50' : 'hover:bg-surface-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary-600">/{r.title}</span>
                        {r.shortcut && <span className="text-[10px] text-ink-disabled font-mono bg-surface-100 px-1 rounded">!{r.shortcut}</span>}
                      </div>
                      <span className="text-xs text-ink-tertiary truncate w-full mt-0.5">{r.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Sticker toggle — faqat Telegram (boshqa kanallar stikerni qo'llamaydi) */}
                {activeConv?.channel === 'telegram' && (
                  <button
                    onClick={toggleStickers}
                    disabled={orgPacks.length === 0}
                    title={orgPacks.length === 0 ? 'Sozlamalarda sticker pack qo\'shing' : 'Sticker'}
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      showStickers ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200 disabled:opacity-30'
                    }`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                )}

                {/* Note mode toggle */}
                <button
                  onClick={() => setIsNoteMode(v => !v)}
                  title="Ichki eslatma"
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isNoteMode ? 'bg-amber-100 text-amber-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200'
                  }`}
                >
                  <StickyNote className="w-5 h-5" />
                </button>

                {/* File attach (hidden in note mode and for email) */}
                {!isNoteMode && activeConv?.channel !== 'email' && (
                  <>
                    <input ref={fileInputRef} type="file" className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                      onChange={handleFileSelect} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Fayl yuborish"
                      className="shrink-0 w-10 h-10 rounded-xl bg-surface-100 text-ink-secondary hover:bg-surface-200 flex items-center justify-center transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </>
                )}

                <textarea
                  ref={textareaRef}
                  className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 max-h-32 min-h-[40px] ${
                    isNoteMode
                      ? 'border-amber-300 bg-amber-50 focus:ring-amber-300'
                      : 'border-surface-200 focus:ring-primary-300'
                  }`}
                  placeholder={
                    isNoteMode ? t('inbox.notePlaceholder') :
                    pendingFile ? t('inbox.captionPlaceholder') :
                    activeConv?.channel === 'email' ? t('inbox.emailPlaceholder') :
                    t('inbox.sendPlaceholder')
                  }
                  rows={1}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleTextKeyDown}
                />
                <button
                  onClick={pendingFile ? handleSendFile : handleSend}
                  disabled={(!text.trim() && !pendingFile) || sending}
                  className={`shrink-0 w-10 h-10 rounded-xl text-white flex items-center justify-center disabled:opacity-40 transition-colors ${
                    isNoteMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* ── Contact info panel ── */}
          {showInfo && (
            <div className="w-72 shrink-0 flex flex-col border-l border-surface-200 bg-white overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                <span className="text-sm font-semibold text-ink">Kontakt ma'lumotlari</span>
                <button onClick={() => setShowInfo(false)} className="text-ink-disabled hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingInfo ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-400" /></div>
              ) : contactInfo ? (
                <div className="p-4 space-y-4">
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
                      {initials(contactInfo.conv?.title)}
                    </div>
                    <p className="font-semibold text-ink text-center">{contactInfo.conv?.title || 'Anonim'}</p>
                    {contactInfo.conv?.username && (
                      <p className="text-xs text-ink-tertiary">@{contactInfo.conv.username}</p>
                    )}
                    <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${CHANNEL_COLOR[contactInfo.conv?.channel] || ''}`}>
                      {(() => { const I = CHANNEL_ICON[contactInfo.conv?.channel]; return I ? <I /> : null; })()}
                      <span className="ml-1 capitalize">{contactInfo.conv?.channel}</span>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-0">
                    <div className="flex items-center gap-2.5 py-2.5 border-b border-surface-100">
                      <Hash className="w-4 h-4 text-ink-tertiary shrink-0" />
                      <div>
                        <p className="text-[10px] text-ink-disabled">{t('inbox.allConvs')}</p>
                        <p className="text-sm font-semibold text-ink">{contactInfo.convCount ?? 1}</p>
                      </div>
                    </div>

                    {contactInfo.conv?.assignedTo?.name && (
                      <div className="flex items-center gap-2.5 py-2.5 border-b border-surface-100">
                        <User className="w-4 h-4 text-ink-tertiary shrink-0" />
                        <div>
                          <p className="text-[10px] text-ink-disabled">{t('inbox.assignedAgent')}</p>
                          <p className="text-sm font-medium text-ink">{contactInfo.conv.assignedTo.name}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 py-2.5 border-b border-surface-100">
                      <ChevronRight className="w-4 h-4 text-ink-tertiary shrink-0" />
                      <div>
                        <p className="text-[10px] text-ink-disabled">Status</p>
                        <p className={`text-sm font-medium ${
                          contactInfo.conv?.status === 'unanswered' ? 'text-orange-600' :
                          contactInfo.conv?.status === 'accepted'   ? 'text-emerald-600' :
                          contactInfo.conv?.status === 'closed'     ? 'text-ink-tertiary' : 'text-ink-tertiary'
                        }`}>
                          {contactInfo.conv?.status === 'unanswered' ? t('inbox.tabUnanswered') :
                           contactInfo.conv?.status === 'accepted'   ? t('inbox.tabAccepted')  :
                           contactInfo.conv?.status === 'closed'     ? t('inbox.tabClosed')     : contactInfo.conv?.status}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Linked contact or create button */}
                  {contactInfo.conv?.contact ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">{t('inbox.linkedContact')}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink">{contactInfo.conv.contact.name}</p>
                      {contactInfo.conv.contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-ink-tertiary" />
                          <span className="text-xs text-ink-secondary">{contactInfo.conv.contact.phone}</span>
                        </div>
                      )}
                      {contactInfo.conv.contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-ink-tertiary" />
                          <span className="text-xs text-ink-secondary">{contactInfo.conv.contact.email}</span>
                        </div>
                      )}
                    </div>
                  ) : showContactForm ? (
                    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-ink mb-1">{t('inbox.createContact')}</p>
                      <input
                        className="w-full border border-surface-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder={t('inbox.contactName')}
                        value={contactForm.name}
                        onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      />
                      <input
                        className="w-full border border-surface-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="Telefon"
                        value={contactForm.phone}
                        onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                      />
                      <input
                        className="w-full border border-surface-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="Email"
                        value={contactForm.email}
                        onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowContactForm(false)}
                          className="flex-1 py-1.5 text-xs rounded-xl bg-surface-100 text-ink-secondary hover:bg-surface-200 transition-colors"
                        >
                          {t('inbox.cancel')}
                        </button>
                        <button
                          onClick={handleCreateContact}
                          disabled={!contactForm.name.trim() || savingContact}
                          className="flex-1 py-1.5 text-xs rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                        >
                          {savingContact ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          {t('inbox.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-surface-300 text-xs text-ink-tertiary hover:border-primary-400 hover:text-primary-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {t('inbox.createContact')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-ink-tertiary">{t('inbox.noData')}</div>
              )}
            </div>
          )}

          {/* ── Sticker panel (right side) ── */}
          {showStickers && (
            <div className="w-64 shrink-0 flex flex-col border-l border-surface-200 bg-white">
              {/* Tabs */}
              <div className="shrink-0 flex items-center border-b border-surface-200 overflow-x-auto">
                {orgPacks.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => setActivePackIdx(i)}
                    className={`shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activePackIdx === i
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-ink-tertiary hover:text-ink'
                    }`}
                  >
                    {name}
                  </button>
                ))}
                <button
                  onClick={() => setShowStickers(false)}
                  className="ml-auto shrink-0 px-2 py-2.5 text-ink-disabled hover:text-ink"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sticker grid */}
              <div className="flex-1 overflow-y-auto p-2">
                {loadingPack ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                  </div>
                ) : !orgPacks[activePackIdx] ? (
                  <p className="text-center text-xs text-ink-tertiary py-6">Pack yo'q</p>
                ) : (packStickers[orgPacks[activePackIdx]] || []).length === 0 ? (
                  <p className="text-center text-xs text-ink-tertiary py-6">
                    {packStickers[orgPacks[activePackIdx]] ? 'Sticker topilmadi' : 'Yuklanmoqda...'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(packStickers[orgPacks[activePackIdx]] || []).map(s => (
                      <button
                        key={s.fileId}
                        onClick={() => handleSendSticker(s.fileId)}
                        className="w-full aspect-square rounded-2xl hover:bg-primary-50 flex items-center justify-center p-2 transition-colors"
                        title={s.emoji}
                      >
                        {!s.url
                          ? <span className="text-5xl">{s.emoji}</span>
                          : s.ext === 'webm'
                            ? <video src={s.url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                            : <img src={s.url} alt={s.emoji} className="w-full h-full object-contain" />
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-ink-tertiary bg-surface-50">
          <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-base font-medium">Suhbat tanlang</p>
          <p className="text-sm mt-1">Chap tomondagi ro'yxatdan suhbatni oching</p>
        </div>
      )}
    </div>
  );
}
