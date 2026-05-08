import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus
} from '../services/pushService';

export function usePushNotifications(ciNo, onPushReceived) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [swReady,    setSwReady]    = useState(false);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker()
      .then(() => {
        setSwReady(true);
        console.log('[Hook] Service worker ready');
      })
      .catch((err) => {
        console.error('[Hook] SW registration failed:', err);
        setError('Service worker registration failed: ' + err.message);
      });
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (swReady) {
      getSubscriptionStatus().then(setSubscribed);
    }
  }, [swReady]);

  // Listen for push messages from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event) => {
      if (event.data?.type === 'PUSH_RECEIVED' && onPushReceived) {
        console.log('[Hook] Push received in UI:', event.data.data);
        onPushReceived(event.data.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [onPushReceived]);

  const subscribe = useCallback(async () => {
    if (!ciNo) { setError('Please enter your CI Number first'); return; }
    if (!swReady) { setError('Service worker not ready yet, please wait'); return; }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setError('Please allow notifications in your browser settings');
        return;
      }

      await subscribeToPush(ciNo);
      setSubscribed(true);
      console.log('[Hook] Push subscription successful');

    } catch (err) {
      console.error('[Hook] Subscribe error:', err);
      setError(err.message || 'Failed to subscribe to push notifications');
    } finally {
      setLoading(false);
    }
  }, [ciNo, swReady]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { subscribed, loading, error, swReady, subscribe, unsubscribe };
}