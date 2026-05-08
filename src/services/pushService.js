const API_BASE = 'http://localhost:8083/api/webpush';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// ── Register service worker explicitly ───────────────────
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported in this browser');
  }

  try {
    // Unregister any existing service workers first
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      await reg.unregister();
      console.log('[SW] Unregistered old service worker');
    }

    // Register fresh
    const reg = await navigator.serviceWorker.register(
      `${process.env.PUBLIC_URL}/service-worker.js`,
      { scope: '/' }
    );
    console.log('[SW] Registered:', reg.scope);

    // Wait until active
    await waitForServiceWorker(reg);
    console.log('[SW] Active and ready');
    return reg;

  } catch (err) {
    console.error('[SW] Registration failed:', err);
    throw err;
  }
}

// Wait for service worker to become active
function waitForServiceWorker(registration) {
  return new Promise((resolve) => {
    if (registration.active) {
      resolve(registration);
      return;
    }
    const sw = registration.installing || registration.waiting;
    if (!sw) {
      resolve(registration);
      return;
    }
    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', handler);
        resolve(registration);
      }
    });
  });
}

// ── Subscribe to push notifications ──────────────────────
export async function subscribeToPush(ciNo) {
  try {
    // Get VAPID public key
    const keyRes = await fetch(`${API_BASE}/vapid-public-key`);
    if (!keyRes.ok) throw new Error('Failed to get VAPID public key');
    const { publicKey } = await keyRes.json();

    // Make sure service worker is registered and active
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg || !reg.active) {
      reg = await registerServiceWorker();
    }

    // Wait for service worker to be ready
    const readyReg = await navigator.serviceWorker.ready;
    console.log('[SW] Ready for subscription:', readyReg.scope);

    // Subscribe
    const subscription = await readyReg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const subJson = subscription.toJSON();
    const isMobile  = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'MOBILE' : 'BROWSER';
    const deviceName = getBrowserName();

    // Register with backend
    const res = await fetch(`${API_BASE}/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ciNo,
        endpoint:   subJson.endpoint,
        auth:       subJson.keys.auth,
        p256dh:     subJson.keys.p256dh,
        deviceType,
        deviceName
      })
    });

    if (!res.ok) throw new Error('Failed to register with backend');
    console.log('[Push] Subscribed successfully');
    return subscription;

  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    throw err;
  }
}

// ── Unsubscribe ───────────────────────────────────────────
export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await fetch(`${API_BASE}/unsubscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint })
    });

    await sub.unsubscribe();
    console.log('[Push] Unsubscribed');
  } catch (err) {
    console.error('[Push] Unsubscribe error:', err);
  }
}

// ── Check status ──────────────────────────────────────────
export async function getSubscriptionStatus() {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome'))  return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari'))  return 'Safari';
  if (ua.includes('Edge'))    return 'Edge';
  return 'Browser';
}