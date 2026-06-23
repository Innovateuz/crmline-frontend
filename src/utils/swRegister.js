const API = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// ── Service Worker Registration ───────────────────────────────────────────────
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] registered:', reg.scope);
      })
      .catch(err => console.warn('[SW] registration failed:', err));
  });
}

// ── Push Subscription ─────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    // 1. Get VAPID public key from server
    const res = await fetch(`${API}/push/vapid-public-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    // 2. Get SW registration
    const reg = await navigator.serviceWorker.ready;

    // 3. Check existing subscription
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // 4. Save subscription to server
    await fetch(`${API}/push/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
        },
      }),
    });

    return true;
  } catch (e) {
    console.warn('[Push] subscribe failed:', e.message);
    return false;
  }
}

export async function unsubscribeFromPush(token) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch(`${API}/push/subscribe`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ endpoint }),
      });
    }
  } catch {}
}
