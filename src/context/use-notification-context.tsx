'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: any;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: any) => void;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { preferences, updatePreferences } = useNotificationPreferences();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    playNotificationSound,
  } = useNotifications({
    enableSound: preferences.soundEnabled,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && preferences.pushNotifications) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [preferences.pushNotifications]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    playNotificationSound,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}
