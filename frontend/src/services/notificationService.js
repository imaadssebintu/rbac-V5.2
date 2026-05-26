/**
 * Helper to convert VAPID string to the required Uint8Array for the browser.
 * Includes multiple layers of safety to prevent the 'atob' crash.
 */
const urlBase64ToUint8Array = (base64String) => {
  // 1. Basic type check
  if (!base64String || typeof base64String !== 'string' || base64String === "undefined") {
    console.error("VAPID Key is missing or undefined. Ensure REACT_APP_VAPID_PUBLIC_KEY is set.");
    return null;
  }

  try {
    // 2. Clean the string of any accidental quotes or whitespace
    const sanitizedKey = base64String.trim().replace(/['"]+/g, '');

    // 3. Add necessary padding and replace URL-safe characters
    const padding = '='.repeat((4 - (sanitizedKey.length % 4)) % 4);
    const base64 = (sanitizedKey + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // 4. Decode
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error("Failed to decode VAPID key. The string is likely not valid Base64:", error);
    return null;
  }
};

/**
 * Requests browser permission to show notifications
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Subscribes the user to the Push Service
 */
export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn("Push messaging is not supported in this browser.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) return existingSubscription;

    // Attempt to get the VAPID key from environment variables
    let vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;

    // Fallback: If Env is missing, try to fetch from your backend (Port 5000)
    if (!vapidKey || vapidKey === "undefined") {
      console.log("VAPID key not found in Env, attempting to fetch from API...");
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/vapid-public-key`);
      vapidKey = await response.text();
    }

    // Safety: Check if we got an HTML error page instead of a key
    if (!vapidKey || vapidKey.includes("<!DOCTYPE") || vapidKey.length < 20) {
      console.error("Push Error: Invalid VAPID key received (likely a 404 or 500 HTML error).");
      return null;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
    if (!convertedVapidKey) return null;

    // Subscribe to the push service
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // Send the subscription object to your backend to store in DB
    await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });

    console.log("User successfully subscribed to Push Notifications");
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

/**
 * Helper to trigger a local browser notification
 */
export const sendNotification = (title, options) => {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notifications.");
    return;
  }
  if (Notification.permission === 'granted') {
    return new Notification(title, options);
  }
  console.warn("Cannot send notification: Permission not granted.");
};

const notificationService = {
  requestPermission: requestNotificationPermission,
  sendNotification,
  subscribeToPush
};

export default notificationService;
