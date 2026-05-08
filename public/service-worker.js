/* eslint-disable no-restricted-globals */

self.addEventListener('install', () => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

// ── Handle push notification from server ──────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push received', event);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Bank ABC',
      body: event.data ? event.data.text() : 'New notification'
    };
  }

  const title = data.title || '🏦 Bank ABC';
  const options = {
    body:    data.body || 'You have a new notification',
    icon:    '/logo192.png',   // use React default icon
    badge:   '/logo192.png',
    data:    data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  // Show browser notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Send data to open browser tabs for real-time UI update
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            data: data.data || {}
          });
        });
      })
  );
});

// ── Handle notification click ─────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});