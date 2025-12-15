
// src/components/organizer/organizer-analytics.tsx ok
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Ticket,
  DollarSign,
  Users,
  Calendar,
  Eye,
  RefreshCw,
  ArrowUpRight,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  getOrganizerStats,
  getEventTicketStats,
} from '@/actions/ticket.actions';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';
import {
  getOrganizerRevenueAnalytics,
  requestPayout,
  getOrganizerPayouts,
} from '@/actions/payout.actions';
import { toast } from 'sonner';
import { BankDetailsForm } from './bank-details-form';

interface OrganizerAnalyticsProps {
  initialStats?: any;
  initialPlatformFee?: number;
}

// Helper function to extract buyer info from order (handles both auth and guest orders)
function getBuyerInfo(order: any) {
  if (order.buyer) {
    return {
      name: order.buyer.name,
      email: order.buyer.email,
      isGuest: false,
    };
  }

  // Guest order - extract from purchaseNotes
  try {
    const purchaseData = JSON.parse(order.purchaseNotes || '{}');
    return {
      name: purchaseData.guestName || 'Guest',
      email: purchaseData.guestEmail || '',
      isGuest: true,
    };
  } catch (error) {
    return {
      name: 'Guest',
      email: '',
      isGuest: true,
    };
  }
}

export function OrganizerAnalytics({
  initialStats,
  initialPlatformFee,
}: OrganizerAnalyticsProps) {
  const [stats, setStats] = useState(initialStats);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventStats, setEventStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [currentPlatformFee, setPlatformFee] = useState(initialPlatformFee || 5);
  const [revenueAnalytics, setRevenueAnalytics] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await getOrganizerStats();
      if (response.success) {
        setStats(response.data);
      } else {
        toast.error(response.message || 'Failed to load statistics');
      }
    } catch (error) {
      toast.error('Error loading statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventStats = async (eventId: string) => {
    setIsLoadingEvent(true);
    try {
      const response = await getEventTicketStats(eventId);
      if (response.success) {
        setEventStats(response.data);
        setSelectedEvent(eventId);
      } else {
        toast.error(response.message || 'Failed to load event statistics');
      }
    } catch (error) {
      toast.error('Error loading event statistics');
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const loadPlatformFee = async () => {
    try {
      const feePercentage = await getPlatformFeePercentage();
      setPlatformFee(feePercentage);
    } catch (error) {
      console.error('Error loading platform fee:', error);
    }
  };

  const fetchPayoutAnalytics = async () => {
    setIsLoadingPayouts(true);
    try {
      const [analyticsRes, payoutsRes] = await Promise.all([
        getOrganizerRevenueAnalytics(),
        getOrganizerPayouts(),
      ]);

      if (analyticsRes.success && analyticsRes.data) {
        setRevenueAnalytics(analyticsRes.data);
      }

      if (payoutsRes.success && payoutsRes.data) {
        setPayouts(payoutsRes.data);
      }
    } catch (error) {
      console.error('Error fetching payout analytics:', error);
      toast.error('Failed to fetch payout data');
    } finally {
      setIsLoadingPayouts(false);
    }
  };

  const handleRequestPayout = async () => {
    setIsRequestingPayout(true);
    try {
      const response = await requestPayout();
      if (response.success) {
        toast.success(response.message);
        fetchPayoutAnalytics();
      } else {
        if (response.message?.includes('bank details')) {
          setShowBankForm(true);
        }
        toast.error(response.message);
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    const variants = {
      PENDING: { variant: 'secondary' as const, text: 'Pending', icon: Clock },
      PROCESSING: { variant: 'default' as const, text: 'Processing', icon: RefreshCw },
      COMPLETED: { variant: 'default' as const, text: 'Completed', icon: CheckCircle },
      FAILED: { variant: 'destructive' as const, text: 'Failed', icon: AlertCircle },
    };

    const config = variants[status as keyof typeof variants] || variants.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const refreshAllData = async () => {
    await Promise.all([loadStats(), loadPlatformFee(), fetchPayoutAnalytics()]);
  };

  useEffect(() => {
    const initializeData = async () => {
      if (!initialStats) {
        await loadStats();
      }
      await Promise.all([loadPlatformFee(), fetchPayoutAnalytics()]);
    };
    initializeData();
  }, [initialStats]);

  useEffect(() => {
    if (stats && currentPlatformFee) {
      const updatedStats = {
        ...stats,
        overview: {
          ...stats.overview,
          platformFee: Math.round(stats.overview.netRevenue * (currentPlatformFee / 100)),
          organizerEarnings: stats.overview.netRevenue - Math.round(stats.overview.netRevenue * (currentPlatformFee / 100)),
        },
      };
      setStats(updatedStats);
    }
  }, [currentPlatformFee]);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No Analytics Data</h3>
        <p className="text-muted-foreground">
          Track your events, revenue, and payout management
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshAllData}
            disabled={isLoading || isLoadingPayouts}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingPayouts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="revenue">Revenue & Payouts</TabsTrigger>
          <TabsTrigger value="detailed">Event Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.overview.totalRevenue)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>Net: {formatCurrency(stats.overview.organizerEarnings)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.totalTicketsSold}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>Across {stats.overview.totalEvents} events</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Payout</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(revenueAnalytics?.pendingPayout?.amount || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>From {revenueAnalytics?.pendingPayout?.orderCount || 0} orders</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overview.activeEvents}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>of {stats.overview.totalEvents} total</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Revenue Breakdown
                  <Badge variant="outline" className="text-xs">
                    Platform Fee: {formatPercentage(currentPlatformFee)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Gross Revenue</span>
                  <span className="font-medium">{formatCurrency(stats.overview.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span className="text-sm">Refunds</span>
                  <span className="font-medium">-{formatCurrency(stats.overview.totalRefunded)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Net Revenue</span>
                  <span className="font-medium">{formatCurrency(stats.overview.netRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-orange-600">
                  <span className="text-sm">Platform Fee ({formatPercentage(currentPlatformFee)})</span>
                  <span className="font-medium">-{formatCurrency(stats.overview.platformFee)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center text-green-600 font-bold">
                    <span>Your Earnings</span>
                    <span>{formatCurrency(stats.overview.organizerEarnings)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Revenue per Event</span>
                    <span className="font-medium">
                      {formatCurrency(stats.overview.totalEvents > 0 ? stats.overview.totalRevenue / stats.overview.totalEvents : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Tickets per Event</span>
                    <span className="font-medium">
                      {stats.overview.totalEvents > 0 ? Math.round(stats.overview.totalTicketsSold / stats.overview.totalEvents) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Platform Fee Rate</span>
                    <span className="font-medium text-orange-600">
                      {formatPercentage(currentPlatformFee)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Completed Payouts</span>
                    <span className="font-medium text-green-600">
                      {payouts.filter((p) => p.status === 'COMPLETED').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Events Performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on an event to view detailed analytics in the Event Details tab
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.events.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No events found</p>
                  </div>
                ) : (
                  stats.events.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => loadEventStats(event.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant={event.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDateTime).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">{formatCurrency(event.revenue)}</div>
                        <div className="text-sm text-muted-foreground">{event.ticketsSold} tickets sold</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-2 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Available for Payout</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(revenueAnalytics?.pendingPayout?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From {revenueAnalytics?.pendingPayout?.orderCount || 0} orders
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(revenueAnalytics?.totalEarnings || 0)}</p>
                    <p className="text-xs text-muted-foreground">All-time net earnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Completed Payouts</p>
                    <p className="text-2xl font-bold">
                      {payouts.filter((p) => p.status === 'COMPLETED').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Historical payouts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
                    <p className="text-2xl font-bold">
                      {payouts.filter((p) => ['PENDING', 'PROCESSING'].includes(p.status)).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Awaiting processing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Platform Fee Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Current platform fee rate and its impact on your earnings
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Current Platform Fee Rate</span>
                    <span className="font-medium text-orange-600">
                      {formatPercentage(currentPlatformFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Your Retention Rate</span>
                    <span className="font-medium text-green-600">
                      {formatPercentage(100 - currentPlatformFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Fees Paid (All Time)</span>
                    <span className="font-medium">{formatCurrency(stats.overview.platformFee)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Fee Calculation</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Platform fee is calculated as {formatPercentage(currentPlatformFee)} of your net revenue
                      (after refunds). This helps maintain and improve the platform services.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Request Payout
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Request a payout of your available earnings. Payouts are processed every 14 days.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Available Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(revenueAnalytics?.pendingPayout?.amount || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Net amount after platform fees ({formatPercentage(currentPlatformFee)})
                  </p>
                </div>
                <div className="text-right">
                  {revenueAnalytics?.pendingPayout?.canRequest ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={isRequestingPayout}>
                          {isRequestingPayout ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4 mr-1" />
                          )}
                          Request Payout
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Request Payout</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to request a payout of{' '}
                            {formatCurrency(revenueAnalytics?.pendingPayout?.amount || 0)}?
                            The payout will be processed within 24 hours and transferred to your registered bank account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRequestPayout}>
                            Request Payout
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {(revenueAnalytics?.pendingPayout?.amount || 0) > 0
                          ? 'You can request payouts every 14 days'
                          : 'No funds available for payout'}
                      </p>
                      <Button disabled variant="outline">
                        <Clock className="w-4 h-4 mr-1" />
                        Not Available
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Bank Account Required</p>
                    <p className="text-sm text-blue-700">
                      Make sure your bank details are updated in your profile before requesting a payout.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-blue-600 hover:text-blue-700 p-0 h-auto"
                      onClick={() => setShowBankForm(true)}
                    >
                      Update Bank Details →
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest ticket sales contributing to your earnings
              </p>
            </CardHeader>
            <CardContent>
              {revenueAnalytics?.recentOrders?.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Platform Fee</TableHead>
                        <TableHead>Net Earnings</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueAnalytics.recentOrders.map((order: any) => {
                        const calculatedPlatformFee = order.platformFee || order.totalAmount * (currentPlatformFee / 100);
                        const buyerInfo = getBuyerInfo(order);

                        return (
                          <TableRow key={order.id}>
                            <TableCell>
                              <span className="font-medium text-green-600">
                                {formatCurrency(order.totalAmount - calculatedPlatformFee)}
                              </span>
                            </TableCell>
                            <TableCell>{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No recent orders</p>
                  <p className="text-muted-foreground">Orders will appear here as customers purchase tickets</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <p className="text-sm text-muted-foreground">Track your payout requests and their status</p>
            </CardHeader>
            <CardContent>
              {payouts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Net Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>{formatCurrency(payout.amount)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(payout.netAmount)}</p>
                              <p className="text-xs text-muted-foreground">
                                Fee: {formatCurrency(payout.platformFee)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                          <TableCell>{format(new Date(payout.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {payout.processedAt ? format(new Date(payout.processedAt), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(payout.periodStart), 'MMM d')}</p>
                              <p className="text-muted-foreground">
                                to {format(new Date(payout.periodEnd), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No payout history</p>
                  <p className="text-muted-foreground">Your payout requests will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {selectedEvent && eventStats ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {stats.events.find((e: any) => e.id === selectedEvent)?.title}
                </h3>
                {isLoadingEvent && <RefreshCw className="h-4 w-4 animate-spin" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{eventStats.overview.totalTickets}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>{eventStats.overview.usedTickets} used</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{eventStats.overview.attendanceRate}%</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>
                        {eventStats.overview.usedTickets} of {eventStats.overview.totalTickets}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(eventStats.revenue.netRevenue)}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>Net of refunds</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Your Earnings</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(eventStats.revenue.organizerRevenue)}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>After {formatPercentage(currentPlatformFee)} platform fee</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket Types Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventStats.ticketTypes.map((ticketType: any) => (
                      <div key={ticketType.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{ticketType.name}</h4>
                          <span className="text-lg font-bold">{formatCurrency(ticketType.price)}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sold</span>
                            <div className="font-medium">{ticketType.sold}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Used</span>
                            <div className="font-medium">{ticketType.used}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Remaining</span>
                            <div className="font-medium">{ticketType.remaining}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Revenue</span>
                            <div className="font-medium">{formatCurrency(ticketType.revenue)}</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Sales Progress</span>
                            <span>
                              {ticketType.totalQuantity > 0
                                ? Math.round((ticketType.sold / ticketType.totalQuantity) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${ticketType.totalQuantity > 0
                                  ? (ticketType.sold / ticketType.totalQuantity) * 100
                                  : 0
                                  }%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Details</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Platform fee calculated at {formatPercentage(currentPlatformFee)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Gross Revenue</span>
                      <span className="font-medium">{formatCurrency(eventStats.revenue.totalRevenue)}</span>
                    </div>
                    {eventStats.revenue.totalRefunded > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Refunds</span>
                        <span className="font-medium">-{formatCurrency(eventStats.revenue.totalRefunded)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Net Revenue</span>
                      <span className="font-medium">{formatCurrency(eventStats.revenue.netRevenue)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Platform Fee ({formatPercentage(currentPlatformFee)})</span>
                      <span className="font-medium">-{formatCurrency(eventStats.revenue.platformFee)}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Your Earnings</span>
                        <span>{formatCurrency(eventStats.revenue.organizerRevenue)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select an Event</h3>
                <p className="text-muted-foreground">
                  Choose an event from the Events tab to see detailed analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {showBankForm && (
        <BankDetailsForm
          onClose={() => setShowBankForm(false)}
          onSuccess={() => {
            setShowBankForm(false);
            fetchPayoutAnalytics();
            toast.success('Bank details updated successfully');
          }}
        />
      )}
    </div>
  );
}