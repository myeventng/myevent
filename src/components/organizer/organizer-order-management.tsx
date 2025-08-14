// src/components/organizer/organizer-order-management.tsx
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download,
  RefreshCw,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  Clock,
  Receipt,
  Users,
  BarChart3,
  Mail,
  Filter,
} from 'lucide-react';
import { PaymentStatus, RefundStatus } from '@/generated/prisma';
import { getOrganizerOrders, initiateRefund } from '@/actions/order.actions';
import { OrderDetailModal } from '../admin/order-detail-modal';

interface OrganizerOrderManagementProps {
  initialOrders: any[];
  userRole: string;
  userSubRole: string;
}

export function OrganizerOrderManagement({
  initialOrders,
  userRole,
  userSubRole,
}: OrganizerOrderManagementProps) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<any[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Get unique events for filtering
  const uniqueEvents = orders.reduce((acc, order) => {
    if (!acc.find((e: any) => e.id === order.event.id)) {
      acc.push({
        id: order.event.id,
        title: order.event.title,
      });
    }
    return acc;
  }, []);

  // Calculate summary statistics
  const stats = {
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((order) => order.paymentStatus === 'COMPLETED')
      .reduce((sum, order) => sum + order.totalAmount, 0),
    completedOrders: orders.filter(
      (order) => order.paymentStatus === 'COMPLETED'
    ).length,
    pendingOrders: orders.filter((order) => order.paymentStatus === 'PENDING')
      .length,
    totalCustomers: new Set(orders.map((order) => order.buyer.id)).size,
    platformFees: orders
      .filter((order) => order.paymentStatus === 'COMPLETED')
      .reduce((sum, order) => sum + (order.platformFee || 0), 0),
  };

  // Calculate net revenue (after platform fees)
  const netRevenue = stats.totalRevenue - stats.platformFees;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
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
      const response = await getOrganizerOrders();
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
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.paystackId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.event.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (order) => order.paymentStatus === statusFilter
      );
    }

    // Event filter
    if (eventFilter !== 'all') {
      filtered = filtered.filter((order) => order.event.id === eventFilter);
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
  }, [orders, searchTerm, statusFilter, eventFilter, dateRange]);

  // Handle refund initiation
  const handleInitiateRefund = async (orderId: string, reason: string) => {
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

  // Export orders to CSV
  const exportToCSV = () => {
    const csvData = filteredOrders.map((order) => ({
      OrderID: order.id,
      PaystackID: order.paystackId,
      CustomerName: order.buyer.name,
      CustomerEmail: order.buyer.email,
      EventTitle: order.event.title,
      Quantity: order.quantity,
      TotalAmount: order.totalAmount,
      PlatformFee: order.platformFee || 0,
      PaymentStatus: order.paymentStatus,
      RefundStatus: order.refundStatus || 'None',
      OrderDate: format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage your event orders and track sales performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchOrders} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
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
                  <CheckCircle className="w-3 h-3 mr-1" />
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
                  Gross Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  From ticket sales
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <Receipt className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Net Revenue
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(netRevenue)}
                </p>
                <div className="flex items-center text-xs text-purple-600">
                  <CreditCard className="w-3 h-3 mr-1" />
                  After platform fees
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Unique Customers
                </p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                <div className="flex items-center text-xs text-orange-600">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Across all events
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of your earnings and platform fees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Gross Revenue</span>
              <span className="font-medium">
                {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-orange-600">
              <span className="text-sm">Platform Fees</span>
              <span className="font-medium">
                -{formatCurrency(stats.platformFees)}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between items-center text-green-600 font-bold">
                <span>Your Net Earnings</span>
                <span>{formatCurrency(netRevenue)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {uniqueEvents.map((event: any) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>View and manage your event orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
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
                        for your events
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
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
                          <p className="font-medium">{order.buyer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.buyer.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-48">
                          <p className="font-medium truncate">
                            {order.event.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.quantity} ticket(s)
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {formatCurrency(order.totalAmount)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-orange-600">
                          {formatCurrency(order.platformFee || 0)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-green-600">
                          {formatCurrency(
                            order.totalAmount - (order.platformFee || 0)
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getPaymentStatusBadge(order.paymentStatus)}
                          {getRefundStatusBadge(order.refundStatus)}
                        </div>
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
                            {order.paymentStatus === 'COMPLETED' &&
                              !order.refundStatus && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleInitiateRefund(
                                        order.id,
                                        'Customer request'
                                      )
                                    }
                                    className="text-orange-600"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Initiate Refund
                                  </DropdownMenuItem>
                                </>
                              )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `mailto:${order.buyer.email}`,
                                  '_blank'
                                )
                              }
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Email Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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
          onRefundAction={(orderId, approve, notes) => {
            if (approve) {
              handleInitiateRefund(
                orderId,
                notes || 'Organizer initiated refund'
              );
            }
          }}
          userRole={userRole}
          userSubRole={userSubRole}
          isOrganizerView={true}
        />
      )}
    </div>
  );
}
