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
  AlertTriangle,
  Info,
  Star,
  RefreshCw,
  Filter,
  X,
  Archive,
  Settings,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/actions/notification.actions';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  getNotificationIcon,
  getNotificationPriority,
  getNotificationCategory,
  formatNotificationTime,
  groupNotificationsByDate,
  getNotificationsByCategory,
} from '@/utils/notification-helper';

interface NotificationsPagesProps {
  isAdmin?: boolean;
}

export function NotificationsPage({
  isAdmin = false,
}: NotificationsPagesProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const [notificationsRes, countRes] = await Promise.all([
        getUserNotifications(100, 0),
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

  // Auto-refresh setup
  useEffect(() => {
    fetchNotifications();

    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter notifications based on search, filters, and active tab
  useEffect(() => {
    let filtered = notifications;

    // Tab filter
    if (activeTab !== 'all') {
      filtered = getNotificationsByCategory(filtered, activeTab);
    }

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

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(
        (notification) =>
          getNotificationPriority(notification.type) === filterPriority
      );
    }

    setFilteredNotifications(filtered);
  }, [
    notifications,
    searchTerm,
    filterStatus,
    filterType,
    filterPriority,
    activeTab,
  ]);

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string) => {
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
      toast.success('Notification marked as read');
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
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
    }
  };

  // Handle delete
  const handleDelete = async (notificationId: string) => {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification?.status === 'UNREAD') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterPriority('all');
    setActiveTab('all');
  };

  // Get available notification types for filter
  const getAvailableNotificationTypes = () => {
    const uniqueTypes = [...new Set(notifications.map((n) => n.type))];
    interface NotificationTypeOption {
      value: string;
      label: string;
    }

    return uniqueTypes.map(
      (type: string): NotificationTypeOption => ({
        value: type,
        label: type
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase()),
      })
    );
  };

  // Get tab counts
  const getTabCounts = () => {
    const categories = [
      'all',
      'events',
      'tickets',
      'venues',
      'users',
      'payments',
      'system',
    ];
    return categories.reduce(
      (acc, category) => {
        const categoryNotifications =
          category === 'all'
            ? notifications
            : getNotificationsByCategory(notifications, category);

        acc[category] = {
          total: categoryNotifications.length,
          unread: categoryNotifications.filter((n) => n.status === 'UNREAD')
            .length,
        };
        return acc;
      },
      {} as Record<string, { total: number; unread: number }>
    );
  };

  const tabCounts = getTabCounts();

  // Render notification item
  const renderNotificationItem = (notification: any) => (
    <Card
      key={notification.id}
      className={`transition-all duration-200 ${
        notification.status === 'UNREAD'
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : 'hover:bg-muted/50'
      } ${
        getNotificationPriority(notification.type) === 'high'
          ? 'border-l-4 border-l-red-500'
          : getNotificationPriority(notification.type) === 'medium'
            ? 'border-l-4 border-l-yellow-500'
            : 'border-l-4 border-l-gray-300'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1 text-lg">
            {getNotificationIcon(notification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{notification.title}</h3>
                  {getNotificationPriority(notification.type) === 'high' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  {getNotificationPriority(notification.type) === 'medium' && (
                    <Star className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {notification.status === 'UNREAD' && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <Badge variant="outline" className="text-xs">
                  {getNotificationCategory(notification.type)}
                </Badge>
              </div>
            </div>

            {/* Metadata display for admin */}
            {isAdmin && notification.metadata && (
              <div className="text-xs text-muted-foreground mb-2 space-y-1 bg-gray-50 p-2 rounded">
                {notification.metadata.organizerName && (
                  <p>
                    <strong>Organizer:</strong>{' '}
                    {notification.metadata.organizerName}
                  </p>
                )}
                {notification.metadata.buyerName && (
                  <p>
                    <strong>Buyer:</strong> {notification.metadata.buyerName}
                  </p>
                )}
                {notification.metadata.totalAmount && (
                  <p>
                    <strong>Amount:</strong> ₦
                    {notification.metadata.totalAmount.toLocaleString()}
                  </p>
                )}
                {notification.metadata.eventTitle && (
                  <p>
                    <strong>Event:</strong> {notification.metadata.eventTitle}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {formatNotificationTime(notification.createdAt)}
                {notification.readAt && (
                  <span className="ml-2">
                    • Read {formatNotificationTime(notification.readAt)}
                  </span>
                )}
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
                    Mark Read
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    className="h-8 px-2 opacity-50"
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
                      className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this notification? This
                        action cannot be undone.
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
  );

  // Render grouped notifications
  const renderGroupedNotifications = () => {
    const groupedByDate = groupNotificationsByDate(filteredNotifications);
    const sortedDates = Object.keys(groupedByDate).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return (
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-2">
              {new Date(date).toDateString() === new Date().toDateString()
                ? 'Today'
                : format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="space-y-2">
              {groupedByDate[date].map(renderNotificationItem)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? 'Admin Notifications' : 'Notifications'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage system-wide notifications and alerts'
              : 'Stay updated with your events and activities'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Badge variant="secondary" className="text-sm">
            {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} size="sm">
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-refresh notifications</p>
                <p className="text-sm text-muted-foreground">
                  Automatically check for new notifications every 30 seconds
                </p>
              </div>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="font-medium">View mode</p>
                <p className="text-sm text-muted-foreground">
                  Choose how to display notifications
                </p>
              </div>
              <Select
                value={viewMode}
                onValueChange={(value: 'list' | 'grouped') =>
                  setViewMode(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="grouped">Grouped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {(searchTerm ||
              filterStatus !== 'all' ||
              filterType !== 'all' ||
              filterPriority !== 'all' ||
              activeTab !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
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
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="all" className="text-xs">
            All
            {tabCounts.all?.unread > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {tabCounts.all.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs">
            Events
            {tabCounts.events?.unread > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {tabCounts.events.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs">
            Tickets
            {tabCounts.tickets?.unread > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {tabCounts.tickets.unread}
              </Badge>
            )}
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="venues" className="text-xs">
                Venues
                {tabCounts.venues?.unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {tabCounts.venues.unread}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs">
                Users
                {tabCounts.users?.unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {tabCounts.users.unread}
                  </Badge>
                )}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="payments" className="text-xs">
            Payments
            {tabCounts.payments?.unread > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {tabCounts.payments.unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs">
            System
            {tabCounts.system?.unread > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {tabCounts.system.unread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Summary Statistics */}
          {activeTab !== 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">
                        {tabCounts[activeTab]?.total || 0}
                      </p>
                    </div>
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unread</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {tabCounts[activeTab]?.unread || 0}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Read</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(tabCounts[activeTab]?.total || 0) -
                          (tabCounts[activeTab]?.unread || 0)}
                      </p>
                    </div>
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                    <p className="text-lg font-medium">
                      No notifications found
                    </p>
                    <p className="text-muted-foreground">
                      {searchTerm ||
                      filterStatus !== 'all' ||
                      filterType !== 'all' ||
                      filterPriority !== 'all' ||
                      activeTab !== 'all'
                        ? 'Try adjusting your filters'
                        : "You're all caught up! 🎉"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'grouped' ? (
              renderGroupedNotifications()
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map(renderNotificationItem)}
              </div>
            )}
          </div>

          {/* Load More Button */}
          {filteredNotifications.length >= 100 && (
            <div className="flex justify-center mt-6">
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
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  You have {unreadCount} unread notifications
                </p>
                <p className="text-sm text-muted-foreground">
                  Stay on top of important updates and actions required
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterStatus('unread');
                    setActiveTab('all');
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Unread
                </Button>
                <Button size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Mark All Read
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
