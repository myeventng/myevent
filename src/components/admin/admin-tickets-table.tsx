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
import { TicketStatus } from '@/generated/prisma';
import { generateTicketPDF } from '@/utils/pdf-ticket-generator';
import { toast } from 'sonner';
import { TicketPreviewModal } from '@/components/tickets/ticket-preview-modal';
import {
  resendTicketEmail,
  resendBulkTicketEmails,
} from '@/actions/email-ticket-actions';

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

  // Get status badge
  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'USED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Used
          </Badge>
        );
      case 'UNUSED':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Unused
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Refunded
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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

  // Add this function for individual email resending from table
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

  // Export to CSV function
  const exportAllTicketsPDF = () => {
    try {
      if (data.length === 0) {
        toast.error('No tickets to export');
        return;
      }

      // Generate PDFs for multiple tickets (you can modify this to create a single PDF with all tickets)
      data.forEach((ticket, index) => {
        setTimeout(() => {
          generateTicketPDF(
            ticket,
            `ticket_${index + 1}_${ticket.ticketId}.pdf`
          );
        }, index * 100); // Small delay to prevent browser overload
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
      accessorFn: (row) => row.user?.name || 'Unknown',
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
              <div className="text-muted-foreground">Unknown User</div>
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

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search tickets..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={
              (table.getColumn('status')?.getFilterValue() as string) || ''
            }
            onValueChange={(value) => {
              table.getColumn('status')?.setFilterValue(value || undefined);
            }}
          >
            <SelectTrigger className="w-[180px]">
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
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAllTicketsPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportAllTicketsPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export All PDFs
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {data.filter((t) => t.status === 'UNUSED').length}
          </div>
          <div className="text-sm text-blue-800">Unused Tickets</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {data.filter((t) => t.status === 'USED').length}
          </div>
          <div className="text-sm text-green-800">Used Tickets</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">
            {data.filter((t) => t.status === 'REFUNDED').length}
          </div>
          <div className="text-sm text-amber-800">Refunded Tickets</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">
            ₦
            {data
              .reduce((total, ticket) => {
                if (
                  ticket.status !== 'REFUNDED' &&
                  ticket.status !== 'CANCELLED'
                ) {
                  return total + ticket.ticketType.price;
                }
                return total;
              }, 0)
              .toLocaleString()}
          </div>
          <div className="text-sm text-gray-800">Total Revenue</div>
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
                  No tickets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
