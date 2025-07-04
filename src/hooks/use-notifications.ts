'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/actions/notification.actions';
import { toast } from 'sonner';

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  enableSound?: boolean;
}

interface NotificationHookReturn {
  notifications: any[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  playNotificationSound: () => void;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): NotificationHookReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    limit = 50,
    enableSound = true,
  } = options;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousUnreadCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio for notifications
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, [enableSound]);

  const playNotificationSound = useCallback(() => {
    if (enableSound && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors (user hasn't interacted with page)
      });
    }
  }, [enableSound]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [notificationsRes, countRes] = await Promise.all([
        getUserNotifications(limit, 0),
        getUnreadNotificationCount(),
      ]);

      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      } else {
        setError(notificationsRes.message || 'Failed to fetch notifications');
      }

      if (countRes.success && typeof countRes.data === 'number') {
        const newUnreadCount = countRes.data;

        // Play sound if new notifications arrived
        if (
          newUnreadCount > previousUnreadCountRef.current &&
          previousUnreadCountRef.current > 0
        ) {
          playNotificationSound();
          toast.info(
            `You have ${newUnreadCount - previousUnreadCountRef.current} new notification(s)`
          );
        }

        setUnreadCount(newUnreadCount);
        previousUnreadCountRef.current = newUnreadCount;
      } else {
        setError(countRes.message || 'Failed to fetch unread count');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, playNotificationSound]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await markNotificationAsRead(notificationId);

      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, status: 'read', readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        toast.error(result.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const result = await markAllNotificationsAsRead();

      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            status: 'read',
            readAt: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      } else {
        toast.error(
          result.message || 'Failed to mark all notifications as read'
        );
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  }, []);

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const result = await deleteNotification(notificationId);

        if (result.success) {
          const deletedNotification = notifications.find(
            (n) => n.id === notificationId
          );
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );

          if (deletedNotification?.status === 'UNREAD') {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }

          toast.success('Notification deleted');
        } else {
          toast.error(result.message || 'Failed to delete notification');
        }
      } catch (err) {
        console.error('Error deleting notification:', err);
        toast.error('Failed to delete notification');
      }
    },
    [notifications]
  );

  // Auto-refresh effect
  useEffect(() => {
    fetchNotifications();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchNotifications, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification: handleDeleteNotification,
    playNotificationSound,
  };
}
