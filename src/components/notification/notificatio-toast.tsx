'use client';

import { useEffect } from 'react';
import { useNotificationContext } from '@/context/use-notification-context';

export function NotificationToast() {
  const { notifications, preferences } = useNotificationContext();

  useEffect(() => {
    // Show browser notification for new unread notifications
    if (
      preferences.pushNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const latestNotification = notifications[0];

      if (latestNotification && latestNotification.status === 'UNREAD') {
        new Notification(latestNotification.title, {
          body: latestNotification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: latestNotification.id,
        });
      }
    }
  }, [notifications, preferences.pushNotifications]);

  return null; // This component doesn't render anything
}
