self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png',
        },
      ],
      data: {
        url: data.url || '/',
        notificationId: data.notificationId,
      },
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }

  // Mark notification as read
  if (event.notification.data.notificationId) {
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
      }),
    });
  }
});
