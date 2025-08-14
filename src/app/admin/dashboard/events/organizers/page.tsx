'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Eye,
  Edit,
  MoreHorizontal,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  UserCheck,
} from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface OrganizerPreviewModalProps {
  organizer: any;
  isOpen: boolean;
  onClose: () => void;
}

function OrganizerPreviewModal({
  organizer,
  isOpen,
  onClose,
}: OrganizerPreviewModalProps) {
  if (!organizer) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building className="w-5 h-5" />
            {organizer.organizerProfile?.organizationName || organizer.name}
          </DialogTitle>
          <DialogDescription>
            Organizer details, analytics, and performance metrics
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Organization Name
                      </label>
                      <p className="font-medium">
                        {organizer.organizerProfile?.organizationName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Contact Person
                      </label>
                      <p className="font-medium">{organizer.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Email
                      </label>
                      <p className="font-medium">{organizer.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Registration Date
                      </label>
                      <p className="font-medium">
                        {format(new Date(organizer.createdAt), 'PPP')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Verification Status
                      </label>
                      <div className="mt-1">
                        {getVerificationBadge(
                          organizer.organizerProfile?.verificationStatus ||
                            'PENDING'
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Organization Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Organization Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Organization Type
                      </label>
                      <p className="font-medium">
                        {organizer.organizerProfile?.organizationType?.replace(
                          /_/g,
                          ' '
                        ) || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Website
                      </label>
                      <p className="font-medium">
                        {organizer.organizerProfile?.website ? (
                          <a
                            href={organizer.organizerProfile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            {organizer.organizerProfile.website}
                          </a>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Business Registration
                      </label>
                      <p className="font-medium">
                        {organizer.organizerProfile
                          ?.businessRegistrationNumber || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Tax ID
                      </label>
                      <p className="font-medium">
                        {organizer.organizerProfile?.taxIdentificationNumber ||
                          'Not provided'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Bio */}
                {organizer.organizerProfile?.bio && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {organizer.organizerProfile.bio}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Events
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {organizer.analytics?.totalEvents || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {organizer.analytics?.publishedEvents || 0} published
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Tickets Sold
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {organizer.analytics?.totalTicketsSold || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all events
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(organizer.analytics?.totalRevenue || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gross earnings
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg. Event Rating
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {organizer.analytics?.averageRating?.toFixed(1) || '0.0'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Based on {organizer.analytics?.totalRatings || 0} reviews
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">
                        Event Status Breakdown
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Published</span>
                          <span className="font-medium">
                            {organizer.analytics?.publishedEvents || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Pending Review</span>
                          <span className="font-medium">
                            {organizer.analytics?.pendingEvents || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Draft</span>
                          <span className="font-medium">
                            {organizer.analytics?.draftEvents || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Rejected</span>
                          <span className="font-medium">
                            {organizer.analytics?.rejectedEvents || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Recent Activity</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Events This Month</span>
                          <span className="font-medium">
                            {organizer.analytics?.eventsThisMonth || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Tickets Sold (30d)</span>
                          <span className="font-medium">
                            {organizer.analytics?.ticketsLast30Days || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Revenue (30d)</span>
                          <span className="font-medium">
                            {formatCurrency(
                              organizer.analytics?.revenueLast30Days || 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Last Event</span>
                          <span className="font-medium">
                            {organizer.analytics?.lastEventDate
                              ? format(
                                  new Date(organizer.analytics.lastEventDate),
                                  'MMM d'
                                )
                              : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Recent Events</h3>
                <Button variant="outline" size="sm">
                  View All Events
                </Button>
              </div>

              <div className="space-y-3">
                {organizer.recentEvents?.length > 0 ? (
                  organizer.recentEvents.map((event: any) => (
                    <Card key={event.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.startDateTime), 'PPP')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                event.publishedStatus === 'PUBLISHED'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {event.publishedStatus.replace('_', ' ')}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.ticketsSold || 0} tickets sold
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No events found</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Revenue</span>
                      <span className="font-medium">
                        {formatCurrency(organizer.revenue?.grossRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Platform Fees</span>
                      <span className="font-medium text-orange-600">
                        -{formatCurrency(organizer.revenue?.platformFees || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Refunds</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(organizer.revenue?.refunds || 0)}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Net Earnings</span>
                        <span>
                          {formatCurrency(organizer.revenue?.netEarnings || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payout Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Payouts</span>
                      <span className="font-medium">
                        {formatCurrency(organizer.revenue?.totalPayouts || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending Payout</span>
                      <span className="font-medium">
                        {formatCurrency(organizer.revenue?.pendingPayout || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Payout</span>
                      <span className="font-medium">
                        {organizer.revenue?.lastPayoutDate
                          ? format(
                              new Date(organizer.revenue.lastPayoutDate),
                              'PPP'
                            )
                          : 'Never'}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground">
                        Bank Account
                      </div>
                      <div className="font-medium">
                        {organizer.organizerProfile?.bankAccount
                          ? `****${organizer.organizerProfile.bankAccount.slice(-4)}`
                          : 'Not configured'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Revenue chart would be displayed here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminOrganizersPage() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrganizer, setSelectedOrganizer] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchOrganizers = async () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockOrganizers = [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@eventcompany.com',
            createdAt: new Date('2024-01-15'),
            organizerProfile: {
              organizationName: 'Event Masters Ltd',
              organizationType: 'COMPANY',
              verificationStatus: 'VERIFIED',
              bio: 'Professional event management company with 10+ years experience.',
              website: 'https://eventmasters.com',
              businessRegistrationNumber: 'RC123456',
              taxIdentificationNumber: 'TIN789012',
              bankAccount: '1234567890',
            },
            analytics: {
              totalEvents: 15,
              publishedEvents: 12,
              pendingEvents: 2,
              draftEvents: 1,
              rejectedEvents: 0,
              totalTicketsSold: 2456,
              totalRevenue: 15500000,
              averageRating: 4.7,
              totalRatings: 89,
              eventsThisMonth: 3,
              ticketsLast30Days: 145,
              revenueLast30Days: 850000,
              lastEventDate: new Date('2024-12-10'),
            },
            revenue: {
              grossRevenue: 15500000,
              platformFees: 775000,
              refunds: 250000,
              netEarnings: 14475000,
              totalPayouts: 12000000,
              pendingPayout: 2475000,
              lastPayoutDate: new Date('2024-11-30'),
            },
            recentEvents: [
              {
                id: '1',
                title: 'Tech Conference 2024',
                startDateTime: new Date('2024-12-15'),
                publishedStatus: 'PUBLISHED',
                ticketsSold: 245,
              },
              {
                id: '2',
                title: 'Music Festival Lagos',
                startDateTime: new Date('2024-12-22'),
                publishedStatus: 'PUBLISHED',
                ticketsSold: 1250,
              },
            ],
          },
          // Add more mock organizers...
        ];
        setOrganizers(mockOrganizers);
        setIsLoading(false);
      }, 1000);
    };

    fetchOrganizers();
  }, []);

  const handlePreviewOrganizer = (organizer: any) => {
    setSelectedOrganizer(organizer);
    setShowPreviewModal(true);
  };

  const handleVerifyOrganizer = async (organizerId: string) => {
    // Implement verification logic
    toast.success('Organizer verified successfully');
  };

  const handleSuspendOrganizer = async (organizerId: string) => {
    // Implement suspension logic
    toast.success('Organizer suspended successfully');
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'organization',
      header: 'Organization',
      accessorFn: (row) => row.organizerProfile?.organizationName || row.name,
      cell: ({ row }) => {
        const organizer = row.original;
        return (
          <div>
            <div className="font-medium">
              {organizer.organizerProfile?.organizationName || organizer.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {organizer.email}
            </div>
          </div>
        );
      },
    },
    {
      id: 'verification',
      header: 'Status',
      accessorFn: (row) =>
        row.organizerProfile?.verificationStatus || 'PENDING',
      cell: ({ row }) => {
        const status =
          row.original.organizerProfile?.verificationStatus || 'PENDING';
        switch (status) {
          case 'VERIFIED':
            return (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            );
          case 'REJECTED':
            return (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Rejected
              </Badge>
            );
          default:
            return (
              <Badge variant="secondary">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            );
        }
      },
    },
    {
      id: 'events',
      header: 'Events',
      accessorFn: (row) => row.analytics?.totalEvents || 0,
      cell: ({ row }) => {
        const analytics = row.original.analytics;
        return (
          <div>
            <div className="font-medium">{analytics?.totalEvents || 0}</div>
            <div className="text-sm text-muted-foreground">
              {analytics?.publishedEvents || 0} published
            </div>
          </div>
        );
      },
    },
    {
      id: 'revenue',
      header: 'Revenue',
      accessorFn: (row) => row.analytics?.totalRevenue || 0,
      cell: ({ row }) => {
        const analytics = row.original.analytics;
        return (
          <div>
            <div className="font-medium">
              ₦{((analytics?.totalRevenue || 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-muted-foreground">Total gross</div>
          </div>
        );
      },
    },
    {
      id: 'joined',
      header: 'Joined',
      accessorFn: (row) => row.createdAt,
      cell: ({ row }) => {
        return format(new Date(row.original.createdAt), 'MMM d, yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const organizer = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewOrganizer(organizer)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleVerifyOrganizer(organizer.id)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Verify Organizer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSuspendOrganizer(organizer.id)}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: organizers,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span>Loading organizers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organizer Management
        </h1>
        <p className="text-muted-foreground">
          Manage organizer accounts, verify organizations, and monitor
          performance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                organizers.filter(
                  (o) => o.organizerProfile?.verificationStatus === 'VERIFIED'
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                organizers.filter(
                  (o) => o.organizerProfile?.verificationStatus === 'PENDING'
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦
              {(
                organizers.reduce(
                  (sum, o) => sum + (o.analytics?.totalRevenue || 0),
                  0
                ) / 1000000
              ).toFixed(1)}
              M
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search organizers..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No organizers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preview Modal */}
      <OrganizerPreviewModal
        organizer={selectedOrganizer}
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedOrganizer(null);
        }}
      />
    </div>
  );
}
