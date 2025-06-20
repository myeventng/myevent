'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Calendar,
  FileText,
  Ticket,
  DollarSign,
  MapPin,
  User,
  UserPlus,
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
        getUserNotifications(50, 0),
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

  // Get notification icon with proper icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVENT_SUBMITTED':
        return <Calendar className="w-5 h-5 text-yellow-600" />;
      case 'EVENT_APPROVED':
        return <Calendar className="w-5 h-5 text-green-600" />;
      case 'EVENT_REJECTED':
        return <Calendar className="w-5 h-5 text-red-600" />;
      case 'BLOG_SUBMITTED':
        return <FileText className="w-5 h-5 text-yellow-600" />;
      case 'BLOG_APPROVED':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'BLOG_REJECTED':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'TICKET_PURCHASED':
        return <Ticket className="w-5 h-5 text-blue-600" />;
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'VENUE_SUBMITTED':
        return <MapPin className="w-5 h-5 text-yellow-600" />;
      case 'VENUE_APPROVED':
        return <MapPin className="w-5 h-5 text-green-600" />;
      case 'VENUE_REJECTED':
        return <MapPin className="w-5 h-5 text-red-600" />;
      case 'USER_REGISTERED':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'USER_UPGRADED_TO_ORGANIZER':
        return <UserPlus className="w-5 h-5 text-purple-600" />;
      case 'EVENT_CANCELLED':
        return <Calendar className="w-5 h-5 text-red-600" />;
      case 'REFUND_PROCESSED':
        return <DollarSign className="w-5 h-5 text-orange-600" />;
      case 'SYSTEM_UPDATE':
        return <Bell className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get notification type label
  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      EVENT_SUBMITTED: 'Event Submitted',
      EVENT_APPROVED: 'Event Approved',
      EVENT_REJECTED: 'Event Rejected',
      BLOG_SUBMITTED: 'Blog Submitted',
      BLOG_APPROVED: 'Blog Approved',
      BLOG_REJECTED: 'Blog Rejected',
      TICKET_PURCHASED: 'Ticket Purchased',
      PAYMENT_RECEIVED: 'Payment Received',
      VENUE_SUBMITTED: 'Venue Submitted',
      VENUE_APPROVED: 'Venue Approved',
      VENUE_REJECTED: 'Venue Rejected',
      USER_REGISTERED: 'User Registered',
      USER_UPGRADED_TO_ORGANIZER: 'New Organizer',
      EVENT_CANCELLED: 'Event Cancelled',
      REFUND_PROCESSED: 'Refund Processed',
      SYSTEM_UPDATE: 'System Update',
    };

    return (
      labels[type] ||
      type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Get notification color based on type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'EVENT_APPROVED':
      case 'BLOG_APPROVED':
      case 'VENUE_APPROVED':
      case 'PAYMENT_RECEIVED':
        return 'border-l-4 border-l-green-500';
      case 'EVENT_REJECTED':
      case 'BLOG_REJECTED':
      case 'VENUE_REJECTED':
      case 'EVENT_CANCELLED':
        return 'border-l-4 border-l-red-500';
      case 'EVENT_SUBMITTED':
      case 'BLOG_SUBMITTED':
      case 'VENUE_SUBMITTED':
        return 'border-l-4 border-l-yellow-500';
      case 'USER_UPGRADED_TO_ORGANIZER':
        return 'border-l-4 border-l-purple-500';
      case 'TICKET_PURCHASED':
      case 'USER_REGISTERED':
        return 'border-l-4 border-l-blue-500';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  // Get available notification types for filter (role-based)
  const getAvailableNotificationTypes = () => {
    const uniqueTypes = [...new Set(notifications.map((n) => n.type))];
    return uniqueTypes.map((type) => ({
      value: type,
      label: getTypeLabel(type),
    }));
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
                {getAvailableNotificationTypes().map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
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
              className={`transition-colors ${getNotificationColor(
                notification.type
              )} ${
                notification.status === 'UNREAD'
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-muted/50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
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

      {/* Load More Button */}
      {filteredNotifications.length >= 50 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
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
