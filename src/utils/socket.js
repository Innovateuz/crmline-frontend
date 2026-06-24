import { io } from 'socket.io-client';

const API_URL    = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const SOCKET_URL = API_URL.replace('/api', '');

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      // Backend har ulanishda JWT token talab qiladi (server.js io.use).
      // Funksiya sifatida beramiz — qayta ulanishda ham yangi token o'qiladi.
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });
  }
  return socket;
}

export function connectSocket(orgId) {
  const s = getSocket();
  const joinOrg = () => { if (orgId) s.emit('join-org', orgId); };

  if (s.connected) {
    joinOrg();
  } else {
    s.once('connect', joinOrg);
    s.connect();
  }
  return s;
}

export function disconnectSocket(orgId) {
  const s = getSocket();
  if (orgId) s.emit('leave-org', orgId);
}
