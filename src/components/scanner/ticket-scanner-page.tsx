'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
} from 'lucide-react';
import { TicketScanner } from '@/components/scanner/ticket-scanner';
import {
  getEventTicketStats,
  getTicketValidations,
} from '@/actions/ticket.actions';
import { toast } from 'sonner';

interface ScannerPageProps {
  eventId: string;
  eventTitle: string;
}

export function TicketScannerPage({ eventId, eventTitle }: ScannerPageProps) {
  const [stats, setStats] = useState<any>(null);
  const [validations, setValidations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scanner');

  // Load event stats and validations
  const loadData = async () => {
    try {
      setIsLoading(true);

      const [statsResponse, validationsResponse] = await Promise.all([
        getEventTicketStats(eventId),
        getTicketValidations(eventId, 1, 50),
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (validationsResponse.success) {
        setValidations(validationsResponse.data.validations);
      }
    } catch (error) {
      toast.error('Failed to load scanner data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Listen for custom scan events from TicketScanner
  useEffect(() => {
    const handleScanComplete = (event: CustomEvent) => {
      const result = event.detail;

      if (result.success) {
        // Refresh data after successful scan
        loadData();

        // Add to validations list for immediate feedback
        setValidations((prev) => [
          {
            id: Date.now().toString(),
            ticketId: result.data?.id || result.ticket?.id,
            validatedAt: new Date().toISOString(),
            ticket: {
              ticketId: result.data?.ticketId || result.ticket?.ticketId,
              user: result.data?.user || result.ticket?.user,
              ticketType: result.data?.ticketType || result.ticket?.ticketType,
            },
            validator: {
              name: 'You',
            },
          },
          ...prev,
        ]);

        // Show success notification in this component
        toast.success(
          `✓ Ticket validated for ${result.ticket?.user?.name || 'attendee'}`
        );
      }
    };

    // Listen for the custom event
    window.addEventListener(
      'ticketScanned',
      handleScanComplete as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        'ticketScanned',
        handleScanComplete as EventListener
      );
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading scanner...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tickets
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.overview.totalTickets}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.usedTickets} used
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scanned Today
              </CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.recentValidations}
              </div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Attendance Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.overview.attendanceRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.usedTickets} of {stats.overview.totalTickets}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.revenue.netRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Net revenue</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="validations">Recent Scans</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          {/* No onScanComplete prop needed - using custom events instead */}
          <TicketScanner eventId={eventId} eventTitle={eventTitle} />
        </TabsContent>

        <TabsContent value="validations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Ticket Validations</CardTitle>
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {validations.length === 0 ? (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No Scans Yet</h3>
                  <p className="text-muted-foreground">
                    Start scanning tickets to see validation history
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validations.map((validation) => (
                    <div
                      key={validation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">
                            {validation.ticket.user.name}
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(
                              validation.validatedAt
                            ).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {validation.validator.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {stats && (
            <div className="space-y-6">
              {/* Ticket Types Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Types Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.ticketTypes.map((ticketType: any) => (
                      <div
                        key={ticketType.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{ticketType.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(ticketType.price)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {ticketType.sold} sold
                          </Badge>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
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
                                    ? (ticketType.sold /
                                        ticketType.totalQuantity) *
                                      100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Attendance rate for this ticket type */}
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Used</span>
                            <div className="font-medium">{ticketType.used}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Unused
                            </span>
                            <div className="font-medium">
                              {ticketType.sold - ticketType.used}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rate</span>
                            <div className="font-medium">
                              {ticketType.sold > 0
                                ? Math.round(
                                    (ticketType.used / ticketType.sold) * 100
                                  )
                                : 0}
                              %
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Gross Revenue
                          </span>
                          <span className="font-bold text-lg">
                            {formatCurrency(stats.revenue.totalRevenue)}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Your Earnings
                          </span>
                          <span className="font-bold text-lg text-green-600">
                            {formatCurrency(stats.revenue.organizerRevenue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {stats.revenue.totalRefunded > 0 && (
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-red-700">
                            Total Refunded
                          </span>
                          <span className="font-bold text-red-700">
                            -{formatCurrency(stats.revenue.totalRefunded)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          Platform Fee (5%)
                        </span>
                        <span className="font-medium text-gray-700">
                          -{formatCurrency(stats.revenue.platformFee)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Platform fee is deducted from net revenue
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
