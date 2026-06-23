import { io } from 'socket.io-client';

const API_URL    = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';
const SOCKET_URL = API_URL.replace('/api', '');

let socket    = null;
let currentOrgId = null;

function onReconnect() {
  if (currentOrgId && socket) {
    socket.emit('join-org', currentOrgId);
  }
}

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      // Har ulanish/qayta-ulanishda fresh token yuboriladi
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });
    socket.on('connect', onReconnect);
  }
  return socket;
}

export function connectSocket(orgId) {
  currentOrgId = orgId;
  const s = getSocket();
  if (s.connected) {
    s.emit('join-org', orgId);
  } else {
    s.connect();
  }
  return s;
}

export function disconnectSocket(orgId) {
  const s = getSocket();
  if (orgId) s.emit('leave-org', orgId);
}
