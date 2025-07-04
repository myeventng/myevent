'use client';

import { useState, useEffect } from 'react';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  eventReminders: boolean;
  ticketUpdates: boolean;
  paymentNotifications: boolean;
  marketingEmails: boolean;
  autoMarkAsRead: boolean;
  groupNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  soundEnabled: true,
  eventReminders: true,
  ticketUpdates: true,
  paymentNotifications: true,
  marketingEmails: false,
  autoMarkAsRead: false,
  groupNotifications: true,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences from localStorage or API
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Error parsing notification preferences:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const updatePreferences = (
    newPreferences: Partial<NotificationPreferences>
  ) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('notificationPreferences', JSON.stringify(updated));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.setItem(
      'notificationPreferences',
      JSON.stringify(defaultPreferences)
    );
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isLoading,
  };
}
