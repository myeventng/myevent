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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  DollarSign,
  Gift,
  Mail,
  UserPlus,
  TrendingUp,
  Info,
  RefreshCw,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calendar,
  Shield,
  Armchair,
} from 'lucide-react';
import { getEventInvitations, getEventDonations } from '@/actions/invite-only.action';
import { toast } from 'sonner';
import { SeatingAnalyticsTab } from './seating-analytics-tab';

interface InviteOnlyAnalyticsModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userSubRole: string;
}

interface InvitationStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  attended: number;
  totalPlusOnes: number;
}

interface DonationStats {
  totalDonations: number;
  totalFees: number;
  netTotal: number;
  donorCount: number;
}

export function InviteOnlyAnalyticsModal({
  event,
  isOpen,
  onClose,
  userRole,
  userSubRole,
}: InviteOnlyAnalyticsModalProps) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationStats, setInvitationStats] = useState<InvitationStats | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [donationStats, setDonationStats] = useState<DonationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load invitation data
  const loadInvitationData = async () => {
    if (!event?.inviteOnlyEvent?.id) return;

    setIsLoading(true);
    try {
      const invitationResponse = await getEventInvitations(event.inviteOnlyEvent.id);

      if (invitationResponse.success && invitationResponse.data) {
        setInvitations(invitationResponse.data.invitations);
        setInvitationStats(invitationResponse.data.stats);
      } else {
        toast.error('Failed to load invitation data');
      }

      // Load donation data if enabled
      if (event.inviteOnlyEvent.acceptDonations) {
        const donationResponse = await getEventDonations(event.id);
        if (donationResponse.success && donationResponse.data) {
          setDonations(donationResponse.data.donations);
          setDonationStats({
            totalDonations: donationResponse.data.totalDonations,
            totalFees: donationResponse.data.totalFees,
            netTotal: donationResponse.data.netTotal,
            donorCount: donationResponse.data.donorCount,
          });
        }
      }
    } catch (error) {
      console.error('Error loading invite data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (isOpen && invitationStats) {
      const interval = setInterval(() => {
        if (!isLoading) {
          loadInvitationData();
        }
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);
      return () => {
        clearInterval(interval);
        setRefreshInterval(null);
      };
    }
  }, [isOpen, invitationStats, isLoading]);

  useEffect(() => {
    if (isOpen) {
      loadInvitationData();
    }
  }, [isOpen, event?.inviteOnlyEvent?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDateTime = (date: string | Date) => {
    return format(new Date(date), 'PPP p');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'DECLINED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'ATTENDED':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Attended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRSVPBadge = (rsvpResponse: string | null) => {
    if (!rsvpResponse) return null;

    switch (rsvpResponse) {
      case 'ATTENDING':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Attending
          </Badge>
        );
      case 'NOT_ATTENDING':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Not Attending
          </Badge>
        );
      case 'MAYBE':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Maybe
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!event || !event.inviteOnlyEvent) return null;

  // Check if seating arrangement is enabled
  const seatingEnabled = event.inviteOnlyEvent.enableSeatingArrangement;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {event.title} - Invite-Only Analytics
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{formatDateTime(event.startDateTime)}</span>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  <Users className="w-3 h-3 mr-1" />
                  Invite Only
                </Badge>
                {event.inviteOnlyEvent.isPrivate && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {seatingEnabled && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    <Armchair className="w-3 h-3 mr-1" />
                    Seating Arranged
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadInvitationData}
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

        {/* Auto-refresh indicator */}
        {refreshInterval && invitationStats && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analytics refresh automatically every 30 seconds
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !invitationStats ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading invite analytics...</span>
            </div>
          </div>
        ) : invitationStats ? (
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="guests">Guest List</TabsTrigger>
                {seatingEnabled && (
                  <TabsTrigger value="seating">
                    <Armchair className="h-4 w-4 mr-2" />
                    Seating
                  </TabsTrigger>
                )}
                {event.inviteOnlyEvent.acceptDonations && (
                  <TabsTrigger value="donations">Donations</TabsTrigger>
                )}
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Invited
                      </CardTitle>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {invitationStats.total}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total invitations sent
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Accepted
                      </CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {invitationStats.accepted}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {invitationStats.total > 0
                          ? `${((invitationStats.accepted / invitationStats.total) * 100).toFixed(1)}% acceptance rate`
                          : '0% acceptance rate'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Plus Ones
                      </CardTitle>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {invitationStats.totalPlusOnes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Additional guests
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Expected
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {invitationStats.accepted + invitationStats.totalPlusOnes}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Including plus ones
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* RSVP Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>RSVP Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Accepted */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Accepted</span>
                          </div>
                          <span className="text-sm font-bold">
                            {invitationStats.accepted} (
                            {invitationStats.total > 0
                              ? ((invitationStats.accepted / invitationStats.total) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.accepted / invitationStats.total) * 100
                              : 0
                          }
                          className="h-2 bg-green-100"
                        />
                      </div>

                      {/* Declined */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Declined</span>
                          </div>
                          <span className="text-sm font-bold">
                            {invitationStats.declined} (
                            {invitationStats.total > 0
                              ? ((invitationStats.declined / invitationStats.total) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.declined / invitationStats.total) * 100
                              : 0
                          }
                          className="h-2 bg-red-100"
                        />
                      </div>

                      {/* Pending */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <span className="text-sm font-bold">
                            {invitationStats.pending} (
                            {invitationStats.total > 0
                              ? ((invitationStats.pending / invitationStats.total) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.pending / invitationStats.total) * 100
                              : 0
                          }
                          className="h-2 bg-yellow-100"
                        />
                      </div>

                      {/* Attended (if event has started) */}
                      {invitationStats.attended > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">Attended</span>
                            </div>
                            <span className="text-sm font-bold">
                              {invitationStats.attended} (
                              {invitationStats.accepted > 0
                                ? ((invitationStats.attended / invitationStats.accepted) * 100).toFixed(1)
                                : 0}
                              % of accepted)
                            </span>
                          </div>
                          <Progress
                            value={
                              invitationStats.accepted > 0
                                ? (invitationStats.attended / invitationStats.accepted) * 100
                                : 0
                            }
                            className="h-2 bg-blue-100"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Donation Summary (if enabled) */}
                {event.inviteOnlyEvent.acceptDonations && donationStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Donations
                        </CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(donationStats.totalDonations)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          From {donationStats.donorCount} donors
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Platform Fee
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(donationStats.totalFees)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Processing fees
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Your Total
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(donationStats.netTotal)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Net donations
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Guest List Tab */}
              <TabsContent value="guests" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Complete Guest List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>RSVP</TableHead>
                          <TableHead>Plus Ones</TableHead>
                          {seatingEnabled && <TableHead>Seating</TableHead>}
                          <TableHead>Invited</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">
                              {invitation.guestName}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{invitation.guestEmail}</div>
                                {invitation.guestPhone && (
                                  <div className="text-muted-foreground">
                                    {invitation.guestPhone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                            <TableCell>
                              {getRSVPBadge(invitation.rsvpResponse)}
                            </TableCell>
                            <TableCell>
                              {invitation.plusOnesConfirmed > 0 ? (
                                <span>
                                  {invitation.plusOnesConfirmed} of{' '}
                                  {invitation.plusOnesAllowed}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  0 / {invitation.plusOnesAllowed}
                                </span>
                              )}
                            </TableCell>
                            {seatingEnabled && (
                              <TableCell>
                                {invitation.seat ? (
                                  <div className="text-sm">
                                    <div className="font-medium">
                                      Table {invitation.seat.table.tableNumber}
                                    </div>
                                    <div className="text-muted-foreground">
                                      Seat {invitation.seat.seatNumber}
                                    </div>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Not Assigned
                                  </Badge>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(invitation.createdAt), 'MMM dd')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Seating Arrangement Tab */}
              {seatingEnabled && (
                <TabsContent value="seating" className="space-y-6">
                  <SeatingAnalyticsTab inviteOnlyEventId={event.inviteOnlyEvent.id} />
                </TabsContent>
              )}

              {/* Donations Tab */}
              {event.inviteOnlyEvent.acceptDonations && (
                <TabsContent value="donations" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Donation Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {donations.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Donor</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Platform Fee</TableHead>
                              <TableHead>Net Amount</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {donations.map((donation) => (
                              <TableRow key={donation.id}>
                                <TableCell>
                                  {donation.isAnonymous
                                    ? 'Anonymous'
                                    : donation.donorName || 'Unknown'}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(donation.amount)}
                                </TableCell>
                                <TableCell className="text-orange-600">
                                  {formatCurrency(donation.platformFee)}
                                </TableCell>
                                <TableCell className="font-medium text-green-600">
                                  {formatCurrency(donation.netAmount)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(donation.createdAt), 'PPP')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8">
                          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-lg font-medium">No donations yet</p>
                          <p className="text-muted-foreground">
                            Donations will appear here once guests contribute.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {event.inviteOnlyEvent.donationDescription && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Donation Message</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{event.inviteOnlyEvent.donationDescription}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Event Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Privacy</span>
                          <Badge variant={event.inviteOnlyEvent.isPrivate ? 'secondary' : 'default'}>
                            {event.inviteOnlyEvent.isPrivate ? 'Private' : 'Public'}
                          </Badge>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">RSVP Required</span>
                          <span className="font-medium">
                            {event.inviteOnlyEvent.requireRSVP ? 'Yes' : 'No'}
                          </span>
                        </div>

                        {event.inviteOnlyEvent.rsvpDeadline && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">RSVP Deadline</span>
                            <span className="font-medium">
                              {format(new Date(event.inviteOnlyEvent.rsvpDeadline), 'PPP')}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Plus Ones</span>
                          <span className="font-medium">
                            {event.inviteOnlyEvent.allowPlusOnes ? 'Allowed' : 'Not Allowed'}
                          </span>
                        </div>

                        {event.inviteOnlyEvent.maxPlusOnes && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Max Plus Ones</span>
                            <span className="font-medium">
                              {event.inviteOnlyEvent.maxPlusOnes}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Seating Arrangement</span>
                          <span className="font-medium">
                            {seatingEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {event.inviteOnlyEvent.maxInvitations && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Max Invitations</span>
                            <span className="font-medium">
                              {event.inviteOnlyEvent.maxInvitations}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Auto Reminders</span>
                          <span className="font-medium">
                            {event.inviteOnlyEvent.sendAutoReminders ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        {event.inviteOnlyEvent.reminderDaysBefore && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Reminder Timing</span>
                            <span className="font-medium">
                              {event.inviteOnlyEvent.reminderDaysBefore} days before
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Require Approval</span>
                          <span className="font-medium">
                            {event.inviteOnlyEvent.requireApproval ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Donation Settings */}
                    {event.inviteOnlyEvent.acceptDonations && (
                      <>
                        <div className="border-t pt-4 mt-4">
                          <h3 className="font-medium mb-3">Donation Settings</h3>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              {event.inviteOnlyEvent.suggestedDonation && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Suggested Amount</span>
                                  <span className="font-medium">
                                    {formatCurrency(event.inviteOnlyEvent.suggestedDonation)}
                                  </span>
                                </div>
                              )}

                              {event.inviteOnlyEvent.minimumDonation && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Minimum Amount</span>
                                  <span className="font-medium">
                                    {formatCurrency(event.inviteOnlyEvent.minimumDonation)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Show Donor Names</span>
                                <span className="font-medium">
                                  {event.inviteOnlyEvent.showDonorNames ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Invitation Data Available</h3>
              <p className="text-muted-foreground">
                Invitation analytics data is not available for this event yet.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}