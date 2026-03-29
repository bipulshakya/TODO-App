export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function sendBrowserNotification(title, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico', // fallback
      ...options
    });
  }
}

export function checkAndMarkNotified(taskId, type) {
  // type should be '24h' or '1h'
  const key = `notified_${type}_${taskId}`;
  const hasBeenNotified = localStorage.getItem(key);
  
  if (hasBeenNotified) {
    return true; // Already notified
  }

  // Not notified yet, mark it now
  localStorage.setItem(key, new Date().toISOString());
  return false;
}
