import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket';
import {
  Send, MessageSquare, Search, Loader2,
  CheckCheck, Clock, User, X, ChevronDown, Smile,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

/* ─── Channel icons ──────────────────────────────────────── */
const CHANNEL_ICON = {
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

/* ─── Conversation List Item ────────────────────────────── */
function ConvItem({ conv, active, onClick }) {
  const Icon = CHANNEL_ICON[conv.channel] || CHANNEL_ICON.telegram;
  const iconCls = CHANNEL_COLOR[conv.channel] || CHANNEL_COLOR.telegram;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-surface-100 ${
        active ? 'bg-primary-50' : 'hover:bg-surface-50'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
          {initials(conv.title)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${iconCls}`}>
          <Icon />
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink truncate">{conv.title || 'Anonim'}</span>
          <span className="text-[10px] text-ink-disabled shrink-0">{fmtTime(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-ink-tertiary truncate">{conv.lastMessage || '...'}</span>
          {conv.unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
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

/* ─── Chat Bubble ───────────────────────────────────────── */
function Bubble({ msg }) {
  const isOut    = msg.direction === 'out';
  const isSticker = msg.mediaType === 'sticker';

  if (isSticker) {
    return (
      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
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

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isOut
            ? 'bg-primary-600 text-white rounded-br-sm'
            : 'bg-white border border-surface-200 text-ink rounded-bl-sm'
        }`}
      >
        {msg.mediaType && msg.mediaType !== 'sticker' && !msg.text && (
          <span className="italic text-xs opacity-70">[{msg.mediaType}]</span>
        )}
        {msg.text && <span>{msg.text}</span>}
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
  const orgId = useSelector(s => s.auth.user?.organization?.id || s.auth.user?.organization?._id);

  const [conversations, setConversations]   = useState([]);
  const [activeConvId,  setActiveConvId]    = useState(null);
  const [messages,      setMessages]        = useState([]);
  const [search,        setSearch]          = useState('');
  const [text,          setText]            = useState('');
  const [loadingConvs,  setLoadingConvs]    = useState(true);
  const [loadingMsgs,   setLoadingMsgs]     = useState(false);
  const [sending,       setSending]         = useState(false);
  const [showStickers,  setShowStickers]    = useState(false);
  const [orgPacks,      setOrgPacks]        = useState([]);   // pack names from settings
  const [activePackIdx, setActivePackIdx]   = useState(0);
  const [packStickers,  setPackStickers]    = useState({});   // { packName: [stickers] }
  const [loadingPack,   setLoadingPack]     = useState(false);

  const messagesEndRef = useRef(null);
  const activeConv = conversations.find(c => c._id === activeConvId);

  const loadConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/inbox`);
      setConversations(res.data.conversations || []);
    } catch {
      toast.error('Yuklanishda xato');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // activeConvId ref — closure muammosiz listener ichida ishlaydi
  const activeConvIdRef = useRef(activeConvId);
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
      setConversations(prev => prev.map(c =>
        String(c._id) === String(conversationId)
          ? { ...c, lastMessage: message.text || `[${message.mediaType || 'media'}]`, lastMessageAt: message.createdAt, unreadCount: isOpen ? 0 : (c.unreadCount || 0) + 1 }
          : c
      ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
    };

    const onConvUpdated = () => loadConversations();

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
    try {
      const res = await axios.get(`${API_URL}/inbox/${conv._id}/messages`);
      setMessages(res.data.messages || []);
      // Mark as read locally
      setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));
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
    try {
      const res = await axios.post(`${API_URL}/inbox/${activeConvId}/send`, { text: draft });
      setMessages(prev => prev.some(m => String(m._id) === String(res.data.message._id)) ? prev : [...prev, res.data.message]);
      setConversations(prev => prev.map(c =>
        c._id === activeConvId ? { ...c, lastMessage: draft, lastMessageAt: new Date() } : c
      ));
    } catch (e) {
      setText(draft);
      toast.error(e.response?.data?.message || 'Yuborishda xato');
    } finally {
      setSending(false);
    }
  };

  // Load org sticker packs from settings
  useEffect(() => {
    axios.get(`${API_URL.replace('/api', '')}/api/organization/sticker-packs`)
      .then(r => setOrgPacks(r.data.stickerPacks || []))
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
      toast.error(e.response?.data?.message || 'Yuborishda xato');
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: conversation list ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-surface-200 bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <span className="font-bold text-ink">Inbox</span>
            {totalUnread > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-primary-600 text-white rounded-full px-1.5 py-0.5">
                {totalUnread}
              </span>
            )}
          </div>
          {/* Search */}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="py-12 text-center text-ink-tertiary">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Xabarlar yo'q</p>
              <p className="text-xs mt-1 px-4">Telegram botingizni ulang va foydalanuvchilar yozishni boshlashsin</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConvItem
                key={conv._id}
                conv={conv}
                active={conv._id === activeConvId}
                onClick={() => openConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* Chat column */}
          <div className="flex-1 flex flex-col bg-surface-50 min-w-0 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-5 py-3 bg-white border-b border-surface-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                {initials(activeConv.title)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{activeConv.title || 'Anonim'}</p>
                {activeConv.username && <p className="text-xs text-ink-tertiary">@{activeConv.username}</p>}
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLOR[activeConv.channel] || ''}`}>
                {(() => { const I = CHANNEL_ICON[activeConv.channel]; return I ? <I /> : null; })()}
                <span className="ml-1 capitalize">{activeConv.channel}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-ink-tertiary">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Xabarlar yo'q</p>
                </div>
              ) : (
                messages.map(msg => <Bubble key={msg._id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 bg-white border-t border-surface-200 px-4 py-3 flex items-end gap-2">
              <button
                onClick={() => setShowStickers(v => !v)}
                disabled={orgPacks.length === 0}
                title={orgPacks.length === 0 ? 'Sozlamalarda sticker pack qo\'shing' : 'Sticker'}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  showStickers ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-ink-secondary hover:bg-surface-200 disabled:opacity-30'
                }`}
              >
                <Smile className="w-5 h-5" />
              </button>
              <textarea
                className="flex-1 resize-none rounded-xl border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 max-h-32 min-h-[40px]"
                placeholder="Xabar yozing..."
                rows={1}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="shrink-0 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

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
        <div className="flex-1 flex flex-col items-center justify-center text-ink-tertiary bg-surface-50">
          <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-base font-medium">Suhbat tanlang</p>
          <p className="text-sm mt-1">Chap tomondagi ro'yxatdan suhbatni oching</p>
        </div>
      )}
    </div>
  );
}
