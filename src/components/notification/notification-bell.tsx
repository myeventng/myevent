'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X, ExternalLink, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/actions/notification.actions';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { NotificationPreviewModal } from './notification-preview-modal';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        getUserNotifications(10, 0),
        getUnreadNotificationCount(),
      ]);

      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
      }

      if (countRes.success && typeof countRes.data === 'number') {
        setUnreadCount(countRes.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle notification click
  const handleNotificationClick = async (
    notification: any,
    event: React.MouseEvent
  ) => {
    // Prevent the click if it's on a button
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    if (notification.status === 'UNREAD') {
      const result = await markNotificationAsRead(notification.id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, status: 'READ' } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
      setIsOpen(false);
    }
  };

  // Handle preview click
  const handlePreviewClick = (notification: any, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setSelectedNotification(notification);
    setIsPreviewOpen(true);
    setIsOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (
    notificationId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    event.preventDefault();

    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification?.status === 'UNREAD') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    }
  };

  // Handle mark as read from preview modal
  const handleMarkAsReadFromModal = async (notificationId: string) => {
    const result = await markNotificationAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'read' } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setSelectedNotification((prev: any) =>
        prev ? { ...prev, status: 'read' } : prev
      );
    }
  };

  // Handle delete from preview modal
  const handleDeleteFromModal = async (notificationId: string) => {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification?.status === 'UNREAD') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setSelectedNotification(null);
      setIsPreviewOpen(false);
      toast.success('Notification deleted');
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_SUBMITTED':
      case 'EVENT_APPROVED':
      case 'EVENT_REJECTED':
        return '📅';
      case 'BLOG_SUBMITTED':
      case 'BLOG_APPROVED':
      case 'BLOG_REJECTED':
        return '📝';
      case 'TICKET_PURCHASED':
        return '🎟️';
      case 'PAYMENT_RECEIVED':
        return '💰';
      case 'VENUE_SUBMITTED':
      case 'VENUE_APPROVED':
      case 'VENUE_REJECTED':
        return '📍';
      case 'USER_REGISTERED':
        return '👤';
      default:
        return '🔔';
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      notification.status === 'UNREAD' ? 'bg-blue-50' : ''
                    }`}
                    onClick={(e) => handleNotificationClick(notification, e)}
                  >
                    <NotificationItem
                      notification={notification}
                      onDelete={(e) =>
                        handleDeleteNotification(notification.id, e)
                      }
                      onPreview={(e) => handlePreviewClick(notification, e)}
                      getIcon={getNotificationIcon}
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Link href="/admin/dashboard/notifications">
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    View all notifications
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview Modal */}
      <NotificationPreviewModal
        notification={selectedNotification}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedNotification(null);
        }}
        onMarkAsRead={handleMarkAsReadFromModal}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
}

// Separate component for notification item
function NotificationItem({
  notification,
  onDelete,
  onPreview,
  getIcon,
}: {
  notification: any;
  onDelete: (e: React.MouseEvent) => void;
  onPreview: (e: React.MouseEvent) => void;
  getIcon: (type: string) => string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-lg flex-shrink-0 mt-0.5">
        {getIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{notification.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {notification.message}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.status === 'UNREAD' && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreview}
              className="h-6 w-6 p-0 hover:bg-blue-100"
              title="Preview notification"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
              title="Delete notification"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  );
}
