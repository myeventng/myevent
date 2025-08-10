'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  X,
  ExternalLink,
  Clock,
  User,
  Calendar,
  CreditCard,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Star,
  Ticket,
  MapPin,
  Mail,
  FileText,
  DollarSign,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface NotificationPreviewModalProps {
  notification: any | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationPreviewModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}: NotificationPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!notification) return null;

  // Get notification type icon and color
  const getNotificationIcon = (type: string) => {
    const iconProps = { className: 'w-5 h-5' };

    switch (type) {
      case 'EVENT_SUBMITTED':
      case 'EVENT_APPROVED':
      case 'EVENT_REJECTED':
        return <Calendar {...iconProps} />;
      case 'BLOG_SUBMITTED':
      case 'BLOG_APPROVED':
      case 'BLOG_REJECTED':
        return <FileText {...iconProps} />;
      case 'TICKET_PURCHASED':
      case 'TICKET_AVAILABLE':
        return <Ticket {...iconProps} />;
      case 'PAYMENT_RECEIVED':
      case 'PAYOUT_PROCESSED':
        return <DollarSign {...iconProps} />;
      case 'VENUE_SUBMITTED':
      case 'VENUE_APPROVED':
      case 'VENUE_REJECTED':
        return <MapPin {...iconProps} />;
      case 'USER_REGISTERED':
      case 'USER_UPGRADED_TO_ORGANIZER':
        return <User {...iconProps} />;
      case 'SYSTEM_UPDATE':
        return <Settings {...iconProps} />;
      case 'EVENT_CANCELLED':
        return <AlertCircle {...iconProps} />;
      case 'REFUND_REQUESTED':
      case 'REFUND_PROCESSED':
        return <RefreshCw {...iconProps} />;
      case 'ORDER_CONFIRMATION':
        return <CheckCircle {...iconProps} />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'EVENT_APPROVED':
      case 'BLOG_APPROVED':
      case 'VENUE_APPROVED':
      case 'PAYMENT_RECEIVED':
      case 'PAYOUT_PROCESSED':
      case 'ORDER_CONFIRMATION':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'EVENT_REJECTED':
      case 'BLOG_REJECTED':
      case 'VENUE_REJECTED':
      case 'EVENT_CANCELLED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'EVENT_SUBMITTED':
      case 'BLOG_SUBMITTED':
      case 'VENUE_SUBMITTED':
      case 'REFUND_REQUESTED':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'TICKET_PURCHASED':
      case 'TICKET_AVAILABLE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'USER_REGISTERED':
      case 'USER_UPGRADED_TO_ORGANIZER':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'SYSTEM_UPDATE':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getNotificationPriority = (type: string) => {
    const highPriority = [
      'EVENT_CANCELLED',
      'REFUND_PROCESSED',
      'PAYMENT_RECEIVED',
      'PAYOUT_PROCESSED',
    ];
    const mediumPriority = [
      'EVENT_APPROVED',
      'EVENT_REJECTED',
      'TICKET_PURCHASED',
      'REFUND_REQUESTED',
    ];

    if (highPriority.includes(type)) return 'High';
    if (mediumPriority.includes(type)) return 'Medium';
    return 'Low';
  };

  const handleMarkAsRead = async () => {
    if (onMarkAsRead && notification.status === 'UNREAD') {
      setIsLoading(true);
      try {
        await onMarkAsRead(notification.id);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsLoading(true);
      try {
        await onDelete(notification.id);
        onClose();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderMetadata = () => {
    if (!notification.metadata) return null;

    const metadata = notification.metadata;
    const items = [];

    // Event-related metadata
    if (metadata.eventTitle) {
      items.push({
        label: 'Event',
        value: metadata.eventTitle,
        icon: <Calendar className="w-4 h-4" />,
      });
    }

    if (metadata.eventDate) {
      items.push({
        label: 'Event Date',
        value: format(new Date(metadata.eventDate), 'PPP p'),
        icon: <Clock className="w-4 h-4" />,
      });
    }

    // Order-related metadata
    if (metadata.quantity) {
      items.push({
        label: 'Quantity',
        value: `${metadata.quantity} ticket${metadata.quantity > 1 ? 's' : ''}`,
        icon: <Ticket className="w-4 h-4" />,
      });
    }

    if (
      metadata.totalAmount ||
      metadata.refundAmount ||
      metadata.payoutAmount
    ) {
      const amount =
        metadata.totalAmount || metadata.refundAmount || metadata.payoutAmount;
      items.push({
        label: metadata.totalAmount
          ? 'Total Amount'
          : metadata.refundAmount
            ? 'Refund Amount'
            : 'Payout Amount',
        value: `₦${amount.toLocaleString()}`,
        icon: <DollarSign className="w-4 h-4" />,
      });
    }

    // User-related metadata
    if (metadata.buyerName || metadata.organizerName || metadata.userName) {
      const name =
        metadata.buyerName || metadata.organizerName || metadata.userName;
      items.push({
        label: 'User',
        value: name,
        icon: <User className="w-4 h-4" />,
      });
    }

    if (metadata.organizationName) {
      items.push({
        label: 'Organization',
        value: metadata.organizationName,
        icon: <Users className="w-4 h-4" />,
      });
    }

    // Dates
    if (metadata.purchasedAt) {
      items.push({
        label: 'Purchased',
        value: format(new Date(metadata.purchasedAt), 'PPP p'),
        icon: <Clock className="w-4 h-4" />,
      });
    }

    if (metadata.processedAt) {
      items.push({
        label: 'Processed',
        value: format(new Date(metadata.processedAt), 'PPP p'),
        icon: <Clock className="w-4 h-4" />,
      });
    }

    return items.length > 0 ? (
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-3">Details</h4>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="text-muted-foreground min-w-0 flex-shrink-0">
                  {item.label}:
                </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ) : null;
  };

  const priority = getNotificationPriority(notification.type);
  const colorClasses = getNotificationColor(notification.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${colorClasses}`}>
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate">{notification.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    notification.status === 'UNREAD' ? 'default' : 'secondary'
                  }
                  className="text-xs"
                >
                  {notification.status === 'UNREAD' ? 'Unread' : 'Read'}
                </Badge>
                <Badge
                  variant={
                    priority === 'High'
                      ? 'destructive'
                      : priority === 'Medium'
                        ? 'default'
                        : 'secondary'
                  }
                  className="text-xs"
                >
                  {priority} Priority
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
              <span>•</span>
              <span>{format(new Date(notification.createdAt), 'PPP p')}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Notification Message */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {notification.message}
                </p>
              </CardContent>
            </Card>

            {/* Action URL */}
            {notification.actionUrl && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Quick Action</h4>
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      href={notification.actionUrl}
                      className="flex items-center justify-center gap-2"
                      onClick={() => {
                        handleMarkAsRead();
                        onClose();
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Go to related page
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            {renderMetadata()}

            {/* Type Information */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Notification Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">
                      {notification.type
                        .replace(/_/g, ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{notification.id}</span>
                  </div>
                  {notification.readAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Read at:</span>
                      <span>
                        {format(new Date(notification.readAt), 'PPP p')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {notification.status === 'UNREAD' && onMarkAsRead && (
              <Button
                onClick={handleMarkAsRead}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isLoading ? 'Marking...' : 'Mark as Read'}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {onDelete && (
              <Button
                onClick={handleDelete}
                disabled={isLoading}
                variant="destructive"
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                {isLoading ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
