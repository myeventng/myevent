'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  BarChart3,
  TrendingUp,
  Ticket,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { getEventTicketStats } from '@/actions/ticket.actions';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';
import { toast } from 'sonner';

interface EventAnalyticsModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userSubRole: string;
}

export function EventAnalyticsModal({
  event,
  isOpen,
  onClose,
  userRole,
  userSubRole,
}: EventAnalyticsModalProps) {
  const [eventStats, setEventStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [platformFee, setPlatformFee] = useState<number>(5);

  // Load event analytics
  const loadEventAnalytics = async () => {
    if (!event?.id) return;

    setIsLoading(true);
    try {
      const [statsResponse, feeResponse] = await Promise.all([
        getEventTicketStats(event.id),
        getPlatformFeePercentage(),
      ]);

      if (statsResponse.success) {
        setEventStats(statsResponse.data);
      } else {
        toast.error(statsResponse.message || 'Failed to load event analytics');
      }

      if (typeof feeResponse === 'number') {
        setPlatformFee(feeResponse);
      }
    } catch (error) {
      console.error('Error loading event analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && event?.id) {
      loadEventAnalytics();
    }
  }, [isOpen, event?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; text: string; icon: any }> =
      {
        PUBLISHED: { variant: 'default', text: 'Published', icon: CheckCircle },
        PENDING_REVIEW: {
          variant: 'secondary',
          text: 'Pending Review',
          icon: Clock,
        },
        DRAFT: { variant: 'outline', text: 'Draft', icon: AlertCircle },
        REJECTED: {
          variant: 'destructive',
          text: 'Rejected',
          icon: AlertCircle,
        },
      };

    const config = variants[status] || variants.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {event.title}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{format(new Date(event.startDateTime), 'PPP p')}</span>
                {getStatusBadge(event.publishedStatus)}
                {event.featured && (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-800"
                  >
                    Featured
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadEventAnalytics}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading && !eventStats ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading analytics...</span>
            </div>
          </div>
        ) : eventStats ? (
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sales">Sales & Revenue</TabsTrigger>
                <TabsTrigger value="tickets">Ticket Performance</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Tickets
                      </CardTitle>
                      <Ticket className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {eventStats.overview.totalTickets}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>{eventStats.overview.usedTickets} used</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Attendance Rate
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {eventStats.overview.attendanceRate}%
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>
                          {eventStats.overview.usedTickets} of{' '}
                          {eventStats.overview.totalTickets}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Gross Revenue
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(eventStats.revenue.totalRevenue)}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>Before deductions</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Your Earnings
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(eventStats.revenue.organizerRevenue)}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>After platform fee</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Event Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Event Status</span>
                          {getStatusBadge(event.publishedStatus)}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Event Date</span>
                          <span className="font-medium">
                            {format(
                              new Date(event.startDateTime),
                              'MMM d, yyyy'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Venue</span>
                          <span className="font-medium">
                            {event.venue?.name || 'TBD'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Event Type</span>
                          <span className="font-medium">
                            {event.isFree ? 'Free Event' : 'Paid Event'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            Recent Check-ins (24h)
                          </span>
                          <span className="font-medium">
                            {eventStats.recentValidations}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Refunded Tickets</span>
                          <span className="font-medium">
                            {eventStats.overview.refundedTickets}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ticket Types</span>
                          <span className="font-medium">
                            {eventStats.ticketTypes.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Category</span>
                          <span className="font-medium">
                            {event.category?.name || 'Uncategorized'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sales & Revenue Tab */}
              <TabsContent value="sales" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Gross Revenue</span>
                        <span className="font-medium">
                          {formatCurrency(eventStats.revenue.totalRevenue)}
                        </span>
                      </div>
                      {eventStats.revenue.totalRefunded > 0 && (
                        <div className="flex justify-between items-center text-red-600">
                          <span className="text-sm">Refunds</span>
                          <span className="font-medium">
                            -{formatCurrency(eventStats.revenue.totalRefunded)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Net Revenue</span>
                        <span className="font-medium">
                          {formatCurrency(eventStats.revenue.netRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-orange-600">
                        <span className="text-sm">
                          Platform Fee ({formatPercentage(platformFee)})
                        </span>
                        <span className="font-medium">
                          -{formatCurrency(eventStats.revenue.platformFee)}
                        </span>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center font-bold text-green-600 text-lg">
                          <span>Your Earnings</span>
                          <span>
                            {formatCurrency(
                              eventStats.revenue.organizerRevenue
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Sales Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Revenue Progress</span>
                          <span className="font-medium">
                            {eventStats.revenue.totalRevenue > 0
                              ? '100%'
                              : '0%'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Sales</p>
                          <p className="font-medium">
                            {eventStats.overview.totalTickets}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Avg. Ticket Price
                          </p>
                          <p className="font-medium">
                            {eventStats.overview.totalTickets > 0
                              ? formatCurrency(
                                  eventStats.revenue.totalRevenue /
                                    eventStats.overview.totalTickets
                                )
                              : formatCurrency(0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Fee Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Platform Fee Rate</span>
                          <span className="font-medium">
                            {formatPercentage(platformFee)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Fee Amount</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(eventStats.revenue.platformFee)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Your Retention</span>
                          <span className="font-medium text-green-600">
                            {formatPercentage(100 - platformFee)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Ticket Performance Tab */}
              <TabsContent value="tickets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Types Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {eventStats.ticketTypes.length > 0 ? (
                        eventStats.ticketTypes.map((ticketType: any) => (
                          <div
                            key={ticketType.id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{ticketType.name}</h4>
                              <span className="text-lg font-bold">
                                {event.isFree
                                  ? 'Free'
                                  : formatCurrency(ticketType.price)}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-muted-foreground">
                                  Sold
                                </span>
                                <div className="font-medium">
                                  {ticketType.sold}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Used
                                </span>
                                <div className="font-medium">
                                  {ticketType.used}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Available
                                </span>
                                <div className="font-medium">
                                  {ticketType.remaining}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Revenue
                                </span>
                                <div className="font-medium">
                                  {formatCurrency(ticketType.revenue)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Sales Progress</span>
                                <span>
                                  {ticketType.totalQuantity > 0
                                    ? Math.round(
                                        (ticketType.sold /
                                          ticketType.totalQuantity) *
                                          100
                                      )
                                    : 0}
                                  %
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      ticketType.totalQuantity > 0
                                        ? Math.min(
                                            (ticketType.sold /
                                              ticketType.totalQuantity) *
                                              100,
                                            100
                                          )
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-lg font-medium">
                            No ticket types found
                          </p>
                          <p className="text-muted-foreground">
                            Create ticket types to start selling tickets
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Analytics Available</h3>
              <p className="text-muted-foreground">
                Analytics data is not available for this event yet.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
