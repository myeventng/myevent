'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/actions/notification.actions';
import { toast } from 'sonner';
import Link from 'next/link';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        getUserNotifications(50, 0), // Get more notifications for the page
        getUnreadNotificationCount(),
      ]);

      if (notificationsRes.success && notificationsRes.data) {
        setNotifications(notificationsRes.data);
        setFilteredNotifications(notificationsRes.data);
      }

      if (countRes.success && typeof countRes.data === 'number') {
        setUnreadCount(countRes.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filter notifications based on search and filters
  useEffect(() => {
    let filtered = notifications;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(
        (notification) => notification.status.toLowerCase() === filterStatus
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(
        (notification) => notification.type === filterType
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterStatus, filterType]);

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: 'READ' } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Notification marked as read');
    }
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

  // Handle delete
  const handleDelete = async (notificationId: string) => {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification?.status === 'UNREAD') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    }
  };

  // Get notification icon
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

  // Get notification type label
  const getTypeLabel = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your events and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{unreadCount} unread</Badge>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} size="sm">
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EVENT_SUBMITTED">Event Submitted</SelectItem>
                <SelectItem value="EVENT_APPROVED">Event Approved</SelectItem>
                <SelectItem value="EVENT_REJECTED">Event Rejected</SelectItem>
                <SelectItem value="BLOG_SUBMITTED">Blog Submitted</SelectItem>
                <SelectItem value="TICKET_PURCHASED">
                  Ticket Purchased
                </SelectItem>
                <SelectItem value="VENUE_SUBMITTED">Venue Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No notifications found</p>
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your filters'
                    : "You're all caught up!"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                notification.status === 'UNREAD'
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-muted/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {notification.status === 'UNREAD' && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), 'PPp')}
                      </p>

                      <div className="flex items-center gap-1">
                        {notification.actionUrl && (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                          >
                            <Link
                              href={notification.actionUrl}
                              onClick={() => {
                                if (notification.status === 'UNREAD') {
                                  handleMarkAsRead(notification.id);
                                }
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        )}

                        {notification.status === 'UNREAD' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-8 px-2"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Read
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            className="h-8 px-2"
                          >
                            <EyeOff className="w-3 h-3 mr-1" />
                            Read
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete Notification
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this
                                notification? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(notification.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More Button (if you want to implement pagination) */}
      {filteredNotifications.length >= 50 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              // Implement load more functionality here
              toast.info('Load more functionality to be implemented');
            }}
          >
            Load More Notifications
          </Button>
        </div>
      )}
    </div>
  );
}
