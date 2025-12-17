'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Download,
  Mail,
  ChevronLeft,
  Search,
  RefreshCw,
  Ticket,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  MapPin,
  Trash2,
  UserX,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { TicketStatus } from '@/generated/prisma';
import { generateTicketPDF } from '@/utils/pdf-ticket-generator';
import { toast } from 'sonner';
import { TicketPreviewModal } from '@/components/tickets/ticket-preview-modal';
import {
  resendTicketEmail,
  resendBulkTicketEmails,
} from '@/actions/email-ticket-actions';
import { deleteTicket } from '@/actions/ticket.actions';

interface AdminTicketsTableProps {
  initialData: any[];
  userRole: string;
  userSubRole: string;
}

export function AdminTicketsTable({
  initialData,
  userRole,
  userSubRole,
}: AdminTicketsTableProps) {
  const [data, setData] = useState<any[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'purchasedAt', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const isSuperAdmin = userRole === 'ADMIN' && userSubRole === 'SUPER_ADMIN';

  // Calculate statistics
  const stats = {
    totalTickets: data.length,
    unusedTickets: data.filter((t) => t.status === 'UNUSED').length,
    usedTickets: data.filter((t) => t.status === 'USED').length,
    refundedTickets: data.filter((t) => t.status === 'REFUNDED').length,
    cancelledTickets: data.filter((t) => t.status === 'CANCELLED').length,
    guestTickets: data.filter((t) => !t.userId).length,
    totalRevenue: data
      .filter((t) => t.status !== 'REFUNDED' && t.status !== 'CANCELLED')
      .reduce((total, ticket) => total + ticket.ticketType.price, 0),
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  // Get status badge with icons
  const getStatusBadge = (status: TicketStatus) => {
    const variants = {
      USED: {
        variant: 'default' as const,
        text: 'Used',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800',
      },
      UNUSED: {
        variant: 'outline' as const,
        text: 'Unused',
        icon: Clock,
        className: 'bg-blue-100 text-blue-800',
      },
      REFUNDED: {
        variant: 'outline' as const,
        text: 'Refunded',
        icon: AlertCircle,
        className: 'bg-amber-100 text-amber-800',
      },
      CANCELLED: {
        variant: 'outline' as const,
        text: 'Cancelled',
        icon: XCircle,
        className: 'bg-red-100 text-red-800',
      },
    };

    const config = variants[status] || {
      variant: 'outline' as const,
      text: 'Unknown',
      icon: AlertCircle,
      className: '',
    };
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`flex items-center gap-1 ${config.className}`}
      >
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  // Download individual ticket
  const downloadTicket = (ticket: any) => {
    try {
      generateTicketPDF(ticket);
      toast.success('Ticket PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading ticket PDF:', error);
      toast.error('Failed to download ticket PDF');
    }
  };

  const resendAllTicketEmails = async () => {
    try {
      const ticketsWithEmails = data.filter((ticket) => ticket.user?.email);

      if (ticketsWithEmails.length === 0) {
        toast.error('No tickets with valid customer emails found');
        return;
      }

      const ticketIds = ticketsWithEmails.map((ticket) => ticket.id);
      const result = await resendBulkTicketEmails(ticketIds);

      if (result.success) {
        toast.success(result.message || 'Bulk ticket emails sent successfully');
      } else {
        toast.error(result.message || 'Failed to send bulk ticket emails');
      }
    } catch (error) {
      console.error('Error sending bulk ticket emails:', error);
      toast.error('Failed to send bulk ticket emails');
    }
  };

  const resendSingleTicketEmail = async (ticket: any) => {
    if (!ticket.user?.email) {
      toast.error('No email address found for this customer');
      return;
    }

    try {
      const result = await resendTicketEmail(ticket.id);

      if (result.success) {
        toast.success(result.message || 'Ticket email sent successfully');
      } else {
        toast.error(result.message || 'Failed to send ticket email');
      }
    } catch (error) {
      console.error('Error sending ticket email:', error);
      toast.error('Failed to send ticket email');
    }
  };

  // Delete ticket function
  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingTicketId(ticketId);
    try {
      const result = await deleteTicket(ticketId);

      if (result.success) {
        setData(data.filter((t) => t.id !== ticketId));
        toast.success(result.message || 'Ticket deleted successfully');
      } else {
        toast.error(result.message || 'Failed to delete ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    } finally {
      setDeletingTicketId(null);
    }
  };

  // Refresh tickets data
  const refreshTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/tickets');

      if (response.ok) {
        const freshData = await response.json();
        setData(freshData.tickets || freshData);
        toast.success('Tickets refreshed successfully');
      } else {
        throw new Error('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error refreshing tickets:', error);
      toast.error('Failed to refresh tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Export to CSV function
  const exportAllTicketsPDF = () => {
    try {
      if (data.length === 0) {
        toast.error('No tickets to export');
        return;
      }

      data.forEach((ticket, index) => {
        setTimeout(() => {
          generateTicketPDF(
            ticket,
            `ticket_${index + 1}_${ticket.ticketId}.pdf`
          );
        }, index * 100);
      });

      toast.success(`Started download of ${data.length} ticket PDFs`);
    } catch (error) {
      console.error('Error exporting tickets to PDF:', error);
      toast.error('Failed to export tickets to PDF');
    }
  };

  // Table columns definition
  const columns: ColumnDef<any>[] = [
    {
      id: 'ticketId',
      header: 'Ticket ID',
      accessorFn: (row) => row.ticketId,
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div>
            <div className="font-medium font-mono text-sm">
              {ticket.ticketId}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(ticket.purchasedAt)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'event',
      header: 'Event',
      accessorFn: (row) => row.ticketType.event.title,
      cell: ({ row }) => {
        const event = row.original.ticketType.event;
        return (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{event.title}</div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.startDateTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              {event.venue.name}, {event.venue.city?.name}
            </div>
          </div>
        );
      },
    },
    {
      id: 'ticketType',
      header: 'Ticket Type',
      accessorFn: (row) => row.ticketType.name,
      cell: ({ row }) => {
        const ticketType = row.original.ticketType;
        return (
          <div>
            <div className="font-medium">{ticketType.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatPrice(ticketType.price)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'user',
      header: 'Customer',
      accessorFn: (row) => row.user?.name || 'Guest User',
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div>
            {user ? (
              <>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <UserX className="h-4 w-4" />
                <span>Guest User</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const ticket = row.original;
        const isDeleting = deletingTicketId === ticket.id;

        return (
          <div className="flex items-center gap-2">
            <TicketPreviewModal
              ticket={ticket}
              trigger={
                <Button variant="ghost" size="sm" title="View Ticket">
                  <Eye className="h-4 w-4" />
                </Button>
              }
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadTicket(ticket)}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>

            {ticket.user?.email && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resendSingleTicketEmail(ticket)}
                title="Resend Email"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}

            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting || ticket.status === 'USED'}
                    title={
                      ticket.status === 'USED'
                        ? 'Cannot delete used tickets'
                        : 'Delete Ticket'
                    }
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Delete Ticket - Permanent Action
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="font-semibold text-red-900 mb-2">
                          ⚠️ Warning: This action cannot be undone!
                        </p>
                        <p className="text-red-800 text-sm">
                          You are about to permanently delete this ticket from
                          the system. This will:
                        </p>
                        <ul className="list-disc list-inside text-red-800 text-sm mt-2 space-y-1">
                          <li>Remove all ticket data permanently</li>
                          <li>Delete validation history</li>
                          <li>Cannot be recovered after deletion</li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <p className="font-medium text-gray-900">
                          Ticket Details:
                        </p>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Ticket ID:</span>{' '}
                            {ticket.ticketId}
                          </p>
                          <p>
                            <span className="font-medium">Event:</span>{' '}
                            {ticket.ticketType.event.title}
                          </p>
                          <p>
                            <span className="font-medium">Customer:</span>{' '}
                            {ticket.user?.name || 'Guest User'}
                          </p>
                          <p>
                            <span className="font-medium">Status:</span>{' '}
                            {ticket.status}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        Are you absolutely sure you want to delete this ticket?
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Ticket'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
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

  // Card component for individual tickets
  const TicketCard = ({ ticket }: { ticket: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-4 h-4 text-blue-600" />
              <span className="font-mono text-sm font-medium">
                {ticket.ticketId}
              </span>
            </div>
            {getStatusBadge(ticket.status)}
          </div>
          <div className="flex items-center gap-1">
            <TicketPreviewModal
              ticket={ticket}
              trigger={
                <Button variant="ghost" size="sm" title="View Ticket">
                  <Eye className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadTicket(ticket)}
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
            {ticket.user?.email && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resendSingleTicketEmail(ticket)}
                title="Resend Email"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={ticket.status === 'USED'}
                    title={
                      ticket.status === 'USED'
                        ? 'Cannot delete used tickets'
                        : 'Delete Ticket'
                    }
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Delete Ticket
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ticket {ticket.ticketId}.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-lg mb-1">
              {ticket.ticketType.event.title}
            </h4>
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDateTime(ticket.ticketType.event.startDateTime)}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-1" />
              {ticket.ticketType.event.venue.name},{' '}
              {ticket.ticketType.event.venue.city?.name}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{ticket.ticketType.name}</p>
              <p className="text-sm text-muted-foreground">Ticket Type</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                {formatPrice(ticket.ticketType.price)}
              </p>
            </div>
          </div>

          {ticket.user ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Users className="w-4 h-4 text-gray-600" />
              <div>
                <p className="font-medium text-sm">{ticket.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.user.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <UserX className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Guest User</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3">
            Purchased on {formatDateTime(ticket.purchasedAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ticket Management</h1>
          <p className="text-muted-foreground">
            Manage all platform tickets and customer communications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refreshTickets} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportAllTicketsPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export All PDFs
          </Button>
          <Button variant="outline" onClick={resendAllTicketEmails}>
            <Mail className="h-4 w-4 mr-2" />
            Resend All Emails
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-full">
                <Ticket className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tickets
                </p>
                <p className="text-2xl font-bold">{stats.totalTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Used
                </p>
                <p className="text-2xl font-bold">{stats.usedTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-full">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Unused
                </p>
                <p className="text-2xl font-bold">{stats.unusedTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full">
                <UserX className="w-4 h-4 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Guests
                </p>
                <p className="text-2xl font-bold">{stats.guestTickets}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-full">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Revenue
                </p>
                <p className="text-xl font-bold">
                  {formatPrice(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets by ID, customer, event..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={
                (table.getColumn('status')?.getFilterValue() as string) || 'all'
              }
              onValueChange={(value) => {
                table
                  .getColumn('status')
                  ?.setFilterValue(value === 'all' ? undefined : value);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="UNUSED">Unused</SelectItem>
                <SelectItem value="USED">Used</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length}{' '}
          tickets
        </div>
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'table' | 'cards')}
        >
          <TabsList>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {table.getRowModel().rows?.length ? (
            table
              .getRowModel()
              .rows.map((row) => (
                <TicketCard key={row.id} ticket={row.original} />
              ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Ticket className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No tickets found
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Tickets will appear here as customers make purchases
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Tickets ({table.getFilteredRowModel().rows.length})
            </CardTitle>
            <CardDescription>
              Detailed table view of all tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        No tickets found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length}{' '}
          tickets
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}