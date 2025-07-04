'use client';

import { useEffect } from 'react';
import { pushNotificationService } from '@/lib/push-notifications';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

export function NotificationSetup() {
  const { preferences } = useNotificationPreferences();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Subscribe to push notifications if enabled
    if (preferences.pushNotifications) {
      pushNotificationService
        .requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            pushNotificationService.subscribe();
          }
        })
        .catch((error) => {
          console.error('Failed to setup push notifications:', error);
        });
    }
  }, [preferences.pushNotifications]);

  return null; // This component doesn't render anything
}
