'use client';

import { useState, useEffect } from 'react';
import { TicketScanner } from './ticket-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTicketValidations, getEventTicketStats } from '@/actions/ticket.actions';
import { CheckCircle, XCircle, Users, TrendingUp, Clock } from 'lucide-react';

interface TicketScannerPageProps {
  eventId: string;
  eventTitle: string;
}

interface ValidationRecord {
  id: string;
  ticketId: string;
  validatedAt: string;
  ticket: {
    ticketId: string;
    user: {
      id: string | null;
      name: string;
      email: string;
    } | null;
    ticketType: {
      name: string;
      price: number;
    };
  };
  validator: {
    name: string;
  };
}

interface StatsData {
  overview: {
    totalTickets: number;
    usedTickets: number;
    unusedTickets: number;
    attendanceRate: number;
  };
}

export function TicketScannerPage({ eventId, eventTitle }: TicketScannerPageProps) {
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [validationsRes, statsRes] = await Promise.all([
        getTicketValidations(eventId, 1, 10),
        getEventTicketStats(eventId),
      ]);

      if (validationsRes.success && validationsRes.data) {
        setValidations(validationsRes.data.validations || []);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Error loading scanner data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    const handleScanComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      const result = customEvent.detail;

      if (result.success) {
        loadData();

        // Extract user info (works for both authenticated and guest users)
        const userName =
          result.data?.user?.name || result.ticket?.user?.name || 'Guest User';
        const userEmail = result.data?.user?.email || result.ticket?.user?.email || 'N/A';

        // Add to validations list for immediate feedback
        setValidations((prev) => [
          {
            id: Date.now().toString(),
            ticketId: result.data?.id || result.ticket?.id,
            validatedAt: new Date().toISOString(),
            ticket: {
              ticketId: result.data?.ticketId || result.ticket?.ticketId,
              user: {
                id: result.data?.user?.id || result.ticket?.user?.id || null,
                name: userName,
                email: userEmail,
              },
              ticketType: result.data?.ticketType || result.ticket?.ticketType,
            },
            validator: {
              name: 'You',
            },
          },
          ...prev,
        ]);
      }
    };

    window.addEventListener('ticketScanned', handleScanComplete);

    return () => {
      window.removeEventListener('ticketScanned', handleScanComplete);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overview.totalTickets}</div>
                  <div className="text-sm text-muted-foreground">Total Tickets</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overview.usedTickets}</div>
                  <div className="text-sm text-muted-foreground">Validated</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overview.unusedTickets}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.overview.attendanceRate}%</div>
                  <div className="text-sm text-muted-foreground">Attendance</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner Component */}
      <TicketScanner eventId={eventId} eventTitle={eventTitle} />

      {/* Recent Validations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Validations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading validations...</p>
          ) : validations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No validations yet</p>
          ) : (
            <div className="space-y-3">
              {validations.map((validation) => (
                <div
                  key={validation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">
                        {validation.ticket.user?.name || 'Guest User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {validation.ticket.ticketType.name} •{' '}
                        {new Date(validation.validatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{validation.validator.name}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}