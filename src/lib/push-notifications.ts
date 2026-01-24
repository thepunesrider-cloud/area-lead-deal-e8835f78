/**
 * Push Notifications Service
 * Handles browser push notifications registration and receiving
 */

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

/**
 * Request permission and subscribe to push notifications
 */
export const subscribeToPushNotifications = async (userId: string): Promise<PushSubscriptionData | null> => {
  try {
    // Check if browser supports service workers
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Check if push messaging is supported
    if (!('pushManager' in registration)) {
      console.log('Push messaging not supported');
      return null;
    }

    // Subscribe to push notifications
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
    const subscribeOptions: PushSubscriptionOptionsInit = {
      userVisibleOnly: true,
    };
    if (vapidKey) {
      const keyArray = urlBase64ToUint8Array(vapidKey);
      subscribeOptions.applicationServerKey = keyArray.buffer as ArrayBuffer;
    }
    const subscription = await registration.pushManager.subscribe(subscribeOptions);

    console.log('Subscribed to push notifications:', subscription);

    // Convert to our format
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys) {
      console.error('Invalid subscription format');
      return null;
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: json.endpoint,
      keys: {
        auth: json.keys.auth || '',
        p256dh: json.keys.p256dh || '',
      },
    };

    // Save subscription to database
    await savePushSubscription(userId, subscriptionData);

    return subscriptionData;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (userId: string): Promise<void> => {
  try {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removePushSubscription(userId);
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
  }
};

/**
 * Check if push notifications are supported and enabled
 */
export const isPushNotificationsEnabled = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
};

/**
 * Send local notification (for testing)
 */
export const sendLocalNotification = (title: string, options?: NotificationOptions): void => {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    });
  }
};

/**
 * Helper: Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Save push subscription to database
 */
async function savePushSubscription(userId: string, subscription: PushSubscriptionData): Promise<void> {
  try {
    const response = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription }),
    });

    if (!response.ok) {
      throw new Error('Failed to save push subscription');
    }
  } catch (error) {
    console.error('Error saving push subscription:', error);
  }
}

/**
 * Remove push subscription from database
 */
async function removePushSubscription(userId: string): Promise<void> {
  try {
    const response = await fetch('/api/push-unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove push subscription');
    }
  } catch (error) {
    console.error('Error removing push subscription:', error);
  }
}

/**
 * Show desktop notification
 */
export const showDesktopNotification = async (
  title: string,
  options: NotificationOptions & { tag?: string } = {}
): Promise<void> => {
  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: options.tag || 'default',
      requireInteraction: false,
      ...options,
    });
  } catch (error) {
    console.error('Error showing desktop notification:', error);
  }
};
