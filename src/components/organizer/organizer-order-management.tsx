// src/components/organizer/organizer-order-management.tsx - Complete Rewrite with Guest Support
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Receipt,
  Users,
  Ticket as TicketIcon,
} from 'lucide-react';
import { PaymentStatus, RefundStatus } from '@/generated/prisma';
import { getOrganizerOrders, initiateRefund } from '@/actions/order.actions';
import { OrderDetailModal } from './order-detail-modal';
import { resendOrderTickets } from '@/actions/order.actions';

interface OrganizerOrderManagementProps {
  initialOrders: any[];
  organizerId: string;
}

// Helper function to extract guest information from order
const getGuestInfo = (order: any) => {
  if (order.buyer) {
    return null; // Not a guest purchase
  }

  try {
    const purchaseData = JSON.parse(order.purchaseNotes || '{}');
    if (purchaseData.isGuestPurchase) {
      return {
        name: purchaseData.guestName || 'Guest User',
        email: purchaseData.guestEmail || 'No email',
        phone: purchaseData.guestPhone || null,
      };
    }
  } catch (error) {
    console.error('Failed to parse guest info:', error);
  }

  return null;
};

// Helper function to get customer info (guest or registered)
const getCustomerInfo = (order: any) => {
  const guestInfo = getGuestInfo(order);

  if (guestInfo) {
    return {
      name: guestInfo.name,
      email: guestInfo.email,
      phone: guestInfo.phone,
      isGuest: true,
    };
  }

  return {
    name: order.buyer?.name || 'Unknown',
    email: order.buyer?.email || 'Unknown',
    phone: order.buyer?.phone || null,
    isGuest: false,
  };
};

export function OrganizerOrderManagement({
  initialOrders,
  organizerId,
}: OrganizerOrderManagementProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<any[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Get unique events for filter
  const events = Array.from(
    new Set(orders.map((order) => JSON.stringify({
      id: order.event.id,
      title: order.event.title,
    })))
  ).map((str) => JSON.parse(str));

  // Calculate summary statistics
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((order) => order.paymentStatus === 'COMPLETED')
      .reduce((sum, order) => sum + order.totalAmount, 0),
    completedOrders: orders.filter(
      (order) => order.paymentStatus === 'COMPLETED'
    ).length,
    totalTicketsSold: orders
      .filter((order) => order.paymentStatus === 'COMPLETED')
      .reduce((sum, order) => sum + order.quantity, 0),
    pendingRefunds: orders.filter((order) => order.refundStatus === 'INITIATED')
      .length,
    guestPurchases: orders.filter((order) => !order.buyer).length,
    authenticatedPurchases: orders.filter((order) => order.buyer).length,
    platformFees: orders
      .filter((order) => order.paymentStatus === 'COMPLETED')
      .reduce((sum, order) => sum + (order.platformFee || 0), 0),
  };

  // Calculate net revenue (total - platform fees)
  const netRevenue = stats.totalRevenue - stats.platformFees;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Export filtered orders to CSV
  const exportToCSV = () => {
    setIsExporting(true);

    try {
      // Create CSV data from filtered orders
      const csvData = filteredOrders.map((order) => {
        const customerInfo = getCustomerInfo(order);

        return {
          'Order ID': order.id,
          'Paystack ID': order.paystackId,
          'Customer Type': customerInfo.isGuest ? 'Guest' : 'Registered',
          'Customer Name': customerInfo.name,
          'Customer Email': customerInfo.email,
          'Customer Phone': customerInfo.phone || '',
          'Event Title': order.event.title,
          'Event Start Date': format(
            new Date(order.event.startDateTime),
            'yyyy-MM-dd'
          ),
          'Event Start Time': format(
            new Date(order.event.startDateTime),
            'HH:mm:ss'
          ),
          'Event Location': order.event.location || '',
          'Event City': order.event.City?.name || '',
          'Event Venue': order.event.venue?.name || '',
          Quantity: order.quantity,
          'Total Amount (NGN)': order.totalAmount,
          'Platform Fee (NGN)': order.platformFee || 0,
          'Net Amount (NGN)': order.totalAmount - (order.platformFee || 0),
          'Payment Status': order.paymentStatus,
          'Refund Status': order.refundStatus || 'None',
          'Payment Method': order.paymentMethod || 'Unknown',
          Currency: order.currency || 'NGN',
          'Order Date': format(new Date(order.createdAt), 'yyyy-MM-dd'),
          'Order Time': format(new Date(order.createdAt), 'HH:mm:ss'),
          'Order DateTime': format(
            new Date(order.createdAt),
            'yyyy-MM-dd HH:mm:ss'
          ),
          'Ticket Types':
            order.tickets?.map((t: any) => t.ticketType?.name).join('; ') || '',
          'Ticket IDs':
            order.tickets?.map((t: any) => t.id).join('; ') || '',
          'Is Free Event': order.event.isFree ? 'Yes' : 'No',
          'Event Category': order.event.category?.name || '',
        };
      });

      if (csvData.length === 0) {
        toast.error('No orders to export');
        return;
      }

      // Convert to CSV format
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              const stringValue = String(value || '');
              // Escape values containing commas, quotes, or newlines
              if (
                stringValue.includes(',') ||
                stringValue.includes('"') ||
                stringValue.includes('\n')
              ) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(',')
        ),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Generate filename with current date and filter info
      const now = new Date();
      const dateStr = format(now, 'yyyy-MM-dd_HHmm');
      let filename = `organizer_orders_${dateStr}`;

      if (eventFilter !== 'all') {
        const eventName = events.find((e) => e.id === eventFilter)?.title || 'event';
        filename += `_${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      }
      if (statusFilter !== 'all') {
        filename += `_${statusFilter}`;
      }
      if (customerTypeFilter !== 'all') {
        filename += `_${customerTypeFilter}`;
      }
      if (dateRange !== 'all') {
        filename += `_${dateRange}days`;
      }
      if (searchTerm) {
        filename += '_filtered';
      }

      link.href = url;
      link.download = `${filename}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${csvData.length} orders to CSV`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV file');
    } finally {
      setIsExporting(false);
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, text: 'Pending', icon: Clock },
      COMPLETED: {
        variant: 'default' as const,
        text: 'Completed',
        icon: CheckCircle,
      },
      FAILED: {
        variant: 'destructive' as const,
        text: 'Failed',
        icon: XCircle,
      },
      REFUNDED: {
        variant: 'outline' as const,
        text: 'Refunded',
        icon: AlertCircle,
      },
    };

    const config = variants[status] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  // Get refund status badge
  const getRefundStatusBadge = (status: RefundStatus | null) => {
    if (!status) return null;

    const variants = {
      INITIATED: {
        variant: 'secondary' as const,
        text: 'Pending',
        icon: Clock,
      },
      PROCESSED: {
        variant: 'default' as const,
        text: 'Processed',
        icon: CheckCircle,
      },
      FAILED: {
        variant: 'destructive' as const,
        text: 'Failed',
        icon: XCircle,
      },
      REJECTED: {
        variant: 'destructive' as const,
        text: 'Rejected',
        icon: XCircle,
      },
    };

    const config = variants[status] || variants.INITIATED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        Refund {config.text}
      </Badge>
    );
  };

  // Fetch orders
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await getOrganizerOrders(organizerId);
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter orders based on search and filters
  useEffect(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((order) => {
        const customerInfo = getCustomerInfo(order);
        const searchLower = searchTerm.toLowerCase();

        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.paystackId.toLowerCase().includes(searchLower) ||
          customerInfo.name.toLowerCase().includes(searchLower) ||
          customerInfo.email.toLowerCase().includes(searchLower) ||
          order.event.title.toLowerCase().includes(searchLower)
        );
      });
    }

    // Event filter
    if (eventFilter !== 'all') {
      filtered = filtered.filter((order) => order.event.id === eventFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'refund_pending') {
        filtered = filtered.filter(
          (order) => order.refundStatus === 'INITIATED'
        );
      } else {
        filtered = filtered.filter(
          (order) => order.paymentStatus === statusFilter
        );
      }
    }

    // Customer type filter
    if (customerTypeFilter !== 'all') {
      if (customerTypeFilter === 'guest') {
        filtered = filtered.filter((order) => !order.buyer);
      } else if (customerTypeFilter === 'registered') {
        filtered = filtered.filter((order) => order.buyer);
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const days = parseInt(dateRange);
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (order) => new Date(order.createdAt) >= cutoffDate
      );
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, customerTypeFilter, eventFilter, dateRange]);

  // Handle refund request
  const handleRefundRequest = async (orderId: string, reason: string) => {
    try {
      const response = await initiateRefund(orderId, reason);
      if (response.success) {
        toast.success(response.message);
        fetchOrders(); // Refresh orders
      } else {
        toast.error(response.message || 'Failed to initiate refund');
      }
    } catch (error) {
      console.error('Error initiating refund:', error);
      toast.error('Failed to initiate refund');
    }
  };

  // View order details
  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage your event orders and ticket sales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchOrders} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={isExporting || filteredOrders.length === 0}
          >
            <Download
              className={`w-4 h-4 mr-1 ${isExporting ? 'animate-spin' : ''}`}
            />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Orders
                </p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <div className="flex items-center text-xs text-blue-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stats.completedOrders} completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(netRevenue)}
                </p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  After platform fees
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <TicketIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Tickets Sold
                </p>
                <p className="text-2xl font-bold">{stats.totalTicketsSold}</p>
                <div className="flex items-center text-xs text-purple-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed sales
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-full">
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Guest Purchases
                </p>
                <p className="text-2xl font-bold">{stats.guestPurchases}</p>
                <div className="flex items-center text-xs text-indigo-600">
                  <User className="w-3 h-3 mr-1" />
                  {stats.authenticatedPurchases} registered
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown Card */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of your earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                Gross Revenue
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total from completed orders
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">
                Platform Fees
              </p>
              <p className="text-2xl font-bold text-orange-600">
                -{formatCurrency(stats.platformFees)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.platformFees > 0
                  ? `${((stats.platformFees / stats.totalRevenue) * 100).toFixed(1)}% of gross`
                  : 'No fees charged'}
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-green-50">
              <p className="text-sm font-medium text-muted-foreground">
                Net Revenue
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(netRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your actual earnings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders by ID, customer, event..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Select
                value={customerTypeFilter}
                onValueChange={setCustomerTypeFilter}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="guest">Guest Only</SelectItem>
                  <SelectItem value="registered">Registered Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                  <SelectItem value="refund_pending">Pending Refunds</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredOrders.length} of {orders.length} orders
            {stats.guestPurchases > 0 && (
              <span className="ml-2 text-indigo-600">
                ({stats.guestPurchases} guest purchases)
              </span>
            )}
          </span>
          <span>Export will include all filtered results</span>
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            View and manage your event ticket orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Refund Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-muted-foreground">
                        Orders will appear here as customers purchase tickets
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const customerInfo = getCustomerInfo(order);

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium font-mono text-sm">
                              {order.id.slice(-8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.paystackId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {customerInfo.isGuest ? (
                              <>
                                <div className="flex items-center gap-1 mb-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Guest
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm">
                                  {customerInfo.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {customerInfo.email}
                                </p>
                                {customerInfo.phone && (
                                  <p className="text-xs text-muted-foreground">
                                    {customerInfo.phone}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-sm">
                                  {customerInfo.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {customerInfo.email}
                                </p>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-48">
                            <p className="font-medium text-sm truncate">
                              {order.event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(order.event.startDateTime),
                                'MMM d, yyyy'
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.quantity}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.quantity === 1 ? 'ticket' : 'tickets'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(order.totalAmount)}
                            </p>
                            {order.platformFee > 0 && (
                              <>
                                <p className="text-xs text-orange-600">
                                  Fee: {formatCurrency(order.platformFee)}
                                </p>
                                <p className="text-xs text-green-600 font-medium">
                                  Net: {formatCurrency(order.totalAmount - order.platformFee)}
                                </p>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          {getRefundStatusBadge(order.refundStatus)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {format(new Date(order.createdAt), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), 'h:mm a')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => viewOrderDetails(order)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              {order.paymentStatus === 'COMPLETED' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(
                                        `/api/orders/${order.id}/tickets`,
                                        '_blank'
                                      )
                                    }
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Tickets (PDF)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const res = await resendOrderTickets(
                                        order.id
                                      );
                                      if (res.success)
                                        toast.success('Tickets email sent');
                                      else
                                        toast.error(
                                          res.message ||
                                          'Failed to send tickets email'
                                        );
                                    }}
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Resend Tickets Email
                                  </DropdownMenuItem>
                                </>
                              )}

                              {customerInfo.email && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(
                                        `mailto:${customerInfo.email}`,
                                        '_blank'
                                      )
                                    }
                                  >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Customer
                                  </DropdownMenuItem>
                                </>
                              )}

                              {order.paymentStatus === 'COMPLETED' &&
                                !order.refundStatus && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const reason = prompt(
                                          'Enter refund reason:'
                                        );
                                        if (reason) {
                                          handleRefundRequest(order.id, reason);
                                        }
                                      }}
                                      className="text-orange-600"
                                    >
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Request Refund
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={showOrderDetail}
          onClose={() => setShowOrderDetail(false)}
          onRefundRequest={handleRefundRequest}
          isOrganizer={true}
        />
      )}
    </div>
  );
}