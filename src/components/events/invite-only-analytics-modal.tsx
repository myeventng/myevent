"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import {
  getEventInvitations,
  getEventDonations,
} from "@/actions/invite-only.action";
import { toast } from "sonner";
import { SeatingAnalyticsTab } from "./seating-analytics-tab";

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
  const [invitationStats, setInvitationStats] =
    useState<InvitationStats | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [donationStats, setDonationStats] = useState<DonationStats | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Load invitation data
  const loadInvitationData = async () => {
    if (!event?.inviteOnlyEvent?.id) return;

    setIsLoading(true);
    try {
      const invitationResponse = await getEventInvitations(
        event.inviteOnlyEvent.id,
      );

      if (invitationResponse.success && invitationResponse.data) {
        setInvitations(invitationResponse.data.invitations);
        setInvitationStats(invitationResponse.data.stats);
      } else {
        toast.error("Failed to load invitation data");
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
      console.error("Error loading invite data:", error);
      toast.error("Failed to load analytics");
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
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const formatDateTime = (date: string | Date) => {
    return format(new Date(date), "PPP p");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "DECLINED":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "ATTENDED":
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
      case "ATTENDING":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Attending
          </Badge>
        );
      case "NOT_ATTENDING":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Not Attending
          </Badge>
        );
      case "MAYBE":
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Shield className="h-6 w-6 text-purple-600" />
                {event.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.startDateTime), "PPP p")}
                </div>
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Invite Only
                </Badge>
                {event.inviteOnlyEvent.isPrivate && (
                  <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-800"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {seatingEnabled && (
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-800"
                  >
                    <Armchair className="w-3 h-3 mr-1" />
                    Seating Arranged
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvitationData}
              disabled={isLoading}
              className="ml-4"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Auto-refresh indicator */}
        {refreshInterval && invitationStats && (
          <Alert className="mx-6 mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analytics refresh automatically every 30 seconds
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !invitationStats ? (
          <div className="flex items-center justify-center flex-1 py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
              <span className="text-lg">Loading invite analytics...</span>
            </div>
          </div>
        ) : invitationStats ? (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList
                className="grid w-full mb-6"
                style={{
                  gridTemplateColumns:
                    seatingEnabled && event.inviteOnlyEvent.acceptDonations
                      ? "repeat(5, 1fr)"
                      : seatingEnabled || event.inviteOnlyEvent.acceptDonations
                        ? "repeat(4, 1fr)"
                        : "repeat(3, 1fr)",
                }}
              >
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="guests">
                  <Users className="h-4 w-4 mr-2" />
                  Guest List ({invitations.length})
                </TabsTrigger>
                {seatingEnabled && (
                  <TabsTrigger value="seating">
                    <Armchair className="h-4 w-4 mr-2" />
                    Seating
                  </TabsTrigger>
                )}
                {event.inviteOnlyEvent.acceptDonations && (
                  <TabsTrigger value="donations">
                    <Gift className="h-4 w-4 mr-2" />
                    Donations ({donations.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings">
                  <Info className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Invited
                      </CardTitle>
                      <Mail className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">
                        {invitationStats.total}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Invitations sent
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Accepted
                      </CardTitle>
                      <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {invitationStats.accepted}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {invitationStats.total > 0
                          ? `${((invitationStats.accepted / invitationStats.total) * 100).toFixed(1)}% acceptance rate`
                          : "0% acceptance rate"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Plus Ones
                      </CardTitle>
                      <UserPlus className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {invitationStats.totalPlusOnes}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Additional guests
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-indigo-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Expected
                      </CardTitle>
                      <Users className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-indigo-600">
                        {invitationStats.accepted +
                          invitationStats.totalPlusOnes}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Including plus ones
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* RSVP Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      RSVP Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Accepted */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">
                              Accepted
                            </span>
                          </div>
                          <span className="text-sm font-bold text-green-600">
                            {invitationStats.accepted} (
                            {invitationStats.total > 0
                              ? (
                                  (invitationStats.accepted /
                                    invitationStats.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.accepted /
                                  invitationStats.total) *
                                100
                              : 0
                          }
                          className="h-3 [&>div]:bg-green-600"
                        />
                      </div>

                      {/* Declined */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">
                              Declined
                            </span>
                          </div>
                          <span className="text-sm font-bold text-red-600">
                            {invitationStats.declined} (
                            {invitationStats.total > 0
                              ? (
                                  (invitationStats.declined /
                                    invitationStats.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.declined /
                                  invitationStats.total) *
                                100
                              : 0
                          }
                          className="h-3 [&>div]:bg-red-600"
                        />
                      </div>

                      {/* Pending */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          <span className="text-sm font-bold text-yellow-600">
                            {invitationStats.pending} (
                            {invitationStats.total > 0
                              ? (
                                  (invitationStats.pending /
                                    invitationStats.total) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            invitationStats.total > 0
                              ? (invitationStats.pending /
                                  invitationStats.total) *
                                100
                              : 0
                          }
                          className="h-3 [&>div]:bg-yellow-600"
                        />
                      </div>

                      {/* Attended (if event has started) */}
                      {invitationStats.attended > 0 && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">
                                Attended
                              </span>
                            </div>
                            <span className="text-sm font-bold text-blue-600">
                              {invitationStats.attended} (
                              {invitationStats.accepted > 0
                                ? (
                                    (invitationStats.attended /
                                      invitationStats.accepted) *
                                    100
                                  ).toFixed(1)
                                : 0}
                              % of accepted)
                            </span>
                          </div>
                          <Progress
                            value={
                              invitationStats.accepted > 0
                                ? (invitationStats.attended /
                                    invitationStats.accepted) *
                                  100
                                : 0
                            }
                            className="h-3 [&>div]:bg-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Donation Summary (if enabled) */}
                {event.inviteOnlyEvent.acceptDonations && donationStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Donations
                        </CardTitle>
                        <Gift className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(donationStats.totalDonations)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          From {donationStats.donorCount} donors
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Platform Fee
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-orange-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                          {formatCurrency(donationStats.totalFees)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Processing fees
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-emerald-200 bg-emerald-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Your Total
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(donationStats.netTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Net donations
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* Guest List Tab */}
              <TabsContent value="guests" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Complete Guest List</span>
                      <Badge variant="secondary" className="text-base">
                        {invitations.length} Guests
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold">
                              Guest Name
                            </TableHead>
                            <TableHead className="font-semibold">
                              Contact Info
                            </TableHead>
                            <TableHead className="font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="font-semibold">
                              RSVP
                            </TableHead>
                            <TableHead className="font-semibold">
                              Plus Ones
                            </TableHead>
                            {seatingEnabled && (
                              <TableHead className="font-semibold">
                                Seating
                              </TableHead>
                            )}
                            <TableHead className="font-semibold">
                              Invited Date
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((invitation) => (
                            <TableRow key={invitation.id}>
                              <TableCell className="font-medium">
                                {invitation.guestName}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    {invitation.guestEmail}
                                  </div>
                                  {invitation.guestPhone && (
                                    <div className="text-sm text-muted-foreground">
                                      {invitation.guestPhone}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(invitation.status)}
                              </TableCell>
                              <TableCell>
                                {getRSVPBadge(invitation.rsvpResponse) || (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {invitation.plusOnesConfirmed > 0 ? (
                                  <span className="font-medium">
                                    {invitation.plusOnesConfirmed} /{" "}
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
                                        Table{" "}
                                        {invitation.seat.table.tableNumber}
                                      </div>
                                      {invitation.seat.table.tableName && (
                                        <div className="text-muted-foreground">
                                          {invitation.seat.table.tableName}
                                        </div>
                                      )}
                                      <div className="text-muted-foreground">
                                        Seat {invitation.seat.seatNumber}
                                      </div>
                                    </div>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Not Assigned
                                    </Badge>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-sm text-muted-foreground">
                                {format(
                                  new Date(invitation.createdAt),
                                  "MMM dd, yyyy",
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Seating Arrangement Tab */}
              {seatingEnabled && (
                <TabsContent value="seating" className="space-y-4">
                  <SeatingAnalyticsTab
                    inviteOnlyEventId={event.inviteOnlyEvent.id}
                  />
                </TabsContent>
              )}

              {/* Donations Tab */}
              {event.inviteOnlyEvent.acceptDonations && (
                <TabsContent value="donations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Donation Details</span>
                        {donationStats && (
                          <Badge variant="secondary" className="text-base">
                            {donationStats.donorCount} Donors
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {donations.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-semibold">
                                  Donor Name
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Amount
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Platform Fee
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Net Amount
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Date
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {donations.map((donation) => (
                                <TableRow key={donation.id}>
                                  <TableCell className="font-medium">
                                    {donation.isAnonymous
                                      ? "🎭 Anonymous"
                                      : donation.donorName || "Unknown"}
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
                                    {format(
                                      new Date(donation.createdAt),
                                      "PPP",
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Gift className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">
                            No donations yet
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Donations will appear here once guests contribute.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {event.inviteOnlyEvent.donationDescription && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-600" />
                          Donation Message to Guests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">
                          {event.inviteOnlyEvent.donationDescription}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-purple-600" />
                      Event Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Privacy & Access
                        </h3>
                        <div className="space-y-3 pl-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Privacy
                            </span>
                            <Badge
                              variant={
                                event.inviteOnlyEvent.isPrivate
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {event.inviteOnlyEvent.isPrivate
                                ? "Private"
                                : "Public"}
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Require Approval
                            </span>
                            <span className="font-medium text-sm">
                              {event.inviteOnlyEvent.requireApproval
                                ? "Yes"
                                : "No"}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-semibold text-base mb-3 mt-6 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Guest Settings
                        </h3>
                        <div className="space-y-3 pl-6">
                          {event.inviteOnlyEvent.maxInvitations && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Max Invitations
                              </span>
                              <span className="font-medium text-sm">
                                {event.inviteOnlyEvent.maxInvitations}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Plus Ones
                            </span>
                            <span className="font-medium text-sm">
                              {event.inviteOnlyEvent.allowPlusOnes
                                ? "Allowed"
                                : "Not Allowed"}
                            </span>
                          </div>

                          {event.inviteOnlyEvent.maxPlusOnes && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Max Plus Ones
                              </span>
                              <span className="font-medium text-sm">
                                {event.inviteOnlyEvent.maxPlusOnes}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Seating Arrangement
                            </span>
                            <Badge
                              variant={seatingEnabled ? "default" : "outline"}
                            >
                              {seatingEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          RSVP Settings
                        </h3>
                        <div className="space-y-3 pl-6">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              RSVP Required
                            </span>
                            <span className="font-medium text-sm">
                              {event.inviteOnlyEvent.requireRSVP ? "Yes" : "No"}
                            </span>
                          </div>

                          {event.inviteOnlyEvent.rsvpDeadline && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                RSVP Deadline
                              </span>
                              <span className="font-medium text-sm">
                                {format(
                                  new Date(event.inviteOnlyEvent.rsvpDeadline),
                                  "PPP",
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Auto Reminders
                            </span>
                            <Badge
                              variant={
                                event.inviteOnlyEvent.sendAutoReminders
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {event.inviteOnlyEvent.sendAutoReminders
                                ? "Enabled"
                                : "Disabled"}
                            </Badge>
                          </div>

                          {event.inviteOnlyEvent.reminderDaysBefore && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Reminder Timing
                              </span>
                              <span className="font-medium text-sm">
                                {event.inviteOnlyEvent.reminderDaysBefore} days
                                before
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Donation Settings */}
                        {event.inviteOnlyEvent.acceptDonations && (
                          <>
                            <h3 className="font-semibold text-base mb-3 mt-6 flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              Donation Settings
                            </h3>
                            <div className="space-y-3 pl-6">
                              {event.inviteOnlyEvent.suggestedDonation && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">
                                    Suggested Amount
                                  </span>
                                  <span className="font-medium text-sm">
                                    {formatCurrency(
                                      event.inviteOnlyEvent.suggestedDonation,
                                    )}
                                  </span>
                                </div>
                              )}

                              {event.inviteOnlyEvent.minimumDonation && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-muted-foreground">
                                    Minimum Amount
                                  </span>
                                  <span className="font-medium text-sm">
                                    {formatCurrency(
                                      event.inviteOnlyEvent.minimumDonation,
                                    )}
                                  </span>
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Show Donor Names
                                </span>
                                <span className="font-medium text-sm">
                                  {event.inviteOnlyEvent.showDonorNames
                                    ? "Yes"
                                    : "No"}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 py-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Invitation Data Available
              </h3>
              <p className="text-muted-foreground text-sm">
                Invitation analytics data is not available for this event yet.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
