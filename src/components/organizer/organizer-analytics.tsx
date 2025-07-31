'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Ticket,
  DollarSign,
  Users,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  getOrganizerStats,
  getEventTicketStats,
} from '@/actions/ticket.actions';
import { getPlatformFeePercentage } from '@/actions/platform-settings.actions';
import { toast } from 'sonner';

interface OrganizerAnalyticsProps {
  initialStats?: any;
  initialPlatformFee?: number;
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
  const [currentPlatformFee, setPlatformFee] = useState(initialPlatformFee);

  // Load organizer stats
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

  // Load event-specific stats
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

  // Load initial data
  useEffect(() => {
    if (!initialStats) {
      loadStats();
    }
  }, [initialStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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
          Start creating events to see your analytics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats} disabled={isLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          {/* <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button> */}
        </div>
      </div>

      {/* Overview Cards */}
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
              <span>
                Net: {formatCurrency(stats.overview.organizerEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overview.totalTicketsSold}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Across {stats.overview.totalEvents} events</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.overview.activeEvents}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>of {stats.overview.totalEvents} total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.overview.platformFee)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {/* edit this part to reflect the platform fee */}
              <span>
                {formatPercentage(currentPlatformFee ?? 0)} of net revenue
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Gross Revenue</span>
              <span className="font-medium">
                {formatCurrency(stats.overview.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span className="text-sm">Refunds</span>
              <span className="font-medium">
                -{formatCurrency(stats.overview.totalRefunded)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Net Revenue</span>
              <span className="font-medium">
                {formatCurrency(stats.overview.netRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center text-orange-600">
              <span className="text-sm">
                Platform Fee ({formatPercentage(currentPlatformFee ?? 0)})
              </span>
              <span className="font-medium">
                -{formatCurrency(stats.overview.platformFee)}
              </span>
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
                  {formatCurrency(
                    stats.overview.totalEvents > 0
                      ? stats.overview.totalRevenue / stats.overview.totalEvents
                      : 0
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Tickets per Event</span>
                <span className="font-medium">
                  {stats.overview.totalEvents > 0
                    ? Math.round(
                        stats.overview.totalTicketsSold /
                          stats.overview.totalEvents
                      )
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="font-medium text-green-600">
                  {stats.overview.totalEvents > 0
                    ? formatPercentage(
                        (stats.overview.activeEvents /
                          stats.overview.totalEvents) *
                          100
                      )
                    : '0%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Analysis */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Events Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Events Performance</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click on an event to view detailed analytics
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
                          <Badge
                            variant={
                              event.status === 'PUBLISHED'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDateTime).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">
                          {formatCurrency(event.revenue)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.ticketsSold} tickets sold
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-2 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {selectedEvent && eventStats ? (
            <div className="space-y-6">
              {/* Event Stats Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {stats.events.find((e: any) => e.id === selectedEvent)?.title}
                </h3>
                {isLoadingEvent && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Event Overview Cards */}
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
                      Revenue
                    </CardTitle>
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

              {/* Ticket Types Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Types Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventStats.ticketTypes.map((ticketType: any) => (
                      <div
                        key={ticketType.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{ticketType.name}</h4>
                          <span className="text-lg font-bold">
                            {formatCurrency(ticketType.price)}
                          </span>
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
                            <span className="text-muted-foreground">
                              Remaining
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
                        {/* Progress bar */}
                        <div className="mt-3">
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
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  ticketType.totalQuantity > 0
                                    ? (ticketType.sold /
                                        ticketType.totalQuantity) *
                                      100
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

              {/* Revenue Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Gross Revenue</span>
                      <span className="font-medium">
                        {formatCurrency(eventStats.revenue.totalRevenue)}
                      </span>
                    </div>
                    {eventStats.revenue.totalRefunded > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Refunds</span>
                        <span className="font-medium">
                          -{formatCurrency(eventStats.revenue.totalRefunded)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Net Revenue</span>
                      <span className="font-medium">
                        {formatCurrency(eventStats.revenue.netRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>
                        Platform Fee (
                        {formatPercentage(currentPlatformFee ?? 0)})
                      </span>
                      <span className="font-medium">
                        -{formatCurrency(eventStats.revenue.platformFee)}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Your Earnings</span>
                        <span>
                          {formatCurrency(eventStats.revenue.organizerRevenue)}
                        </span>
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
                  Choose an event from the Events Overview tab to see detailed
                  analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
