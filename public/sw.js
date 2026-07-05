/* CRM Line Service Worker */
const CACHE = 'crm-line-v1';
const STATIC = ['/'];

// ── Install: cache shell ──────────────────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API; cache-first + fallback for assets ───────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Faqat http(s) so'rovlarini keshlaymiz — chrome-extension:// va boshqa
  // sxemalarni Cache API rad etadi ("unsupported scheme" xatosi).
  if (!url.protocol.startsWith('http')) return;

  // API: always network, no caching
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (HTML): network, fallback to cached '/'
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/').then(r => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Static JS/CSS/fonts: stale-while-revalidate
  if (/\.(js|css|woff2?|ttf|svg|png|jpg|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const network = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
          return cached || network;
        })
      )
    );
  }
});

// ── Push notification ─────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'CRM Line', body: 'Yangi xabar', url: '/inbox', icon: '/icon-192.png' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     'crm-inbox',
      renotify: true,
      data:    { url: data.url || '/inbox' },
      vibrate: [200, 100, 200],
      actions: [{ action: 'open', title: "Ko'rish" }],
    })
  );
});

// ── Notification click: focus / open app ─────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || '/inbox';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
      } else {
        self.clients.openWindow(targetUrl);
      }
    })
  );
});
