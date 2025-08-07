'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Eye,
  Edit,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
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
  RowSelectionState,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { updateEventStatus } from '@/actions/event.actions';
import { toast } from 'sonner';
import { EventPreviewModal } from '../events/event-preview-modal';

interface PendingEventsTableProps {
  initialData: any[];
  userRole: string;
  userSubRole: string;
}

export function PendingEventsTable({
  initialData,
  userRole,
  userSubRole,
}: PendingEventsTableProps) {
  const [data, setData] = useState<any[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  // Handle single event status update
  const handleUpdateEventStatus = async (
    id: string,
    status: 'PUBLISHED' | 'REJECTED',
    rejectionReason?: string
  ) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const response = await updateEventStatus(id, status, rejectionReason);

      if (response.success) {
        // Remove from pending list since it's no longer pending
        setData((prevData) => prevData.filter((event) => event.id !== id));

        toast.success(
          status === 'PUBLISHED'
            ? 'Event approved and published successfully'
            : 'Event rejected successfully'
        );
      } else {
        toast.error(response.message || 'Failed to update event status');
      }
    } catch (error) {
      console.error('Error updating event status:', error);
      toast.error('Failed to update event status');
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle bulk approval
  const handleBulkApproval = async () => {
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );

    if (selectedIds.length === 0) {
      toast.error('Please select events to approve');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, bulk: true }));

      const promises = selectedIds.map((id) =>
        updateEventStatus(id, 'PUBLISHED')
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      // Remove successfully approved events from the list
      setData((prevData) =>
        prevData.filter((event) => !selectedIds.includes(event.id))
      );

      // Clear selection
      setRowSelection({});

      toast.success(`Successfully approved ${successful} events`);

      if (successful < selectedIds.length) {
        toast.error(
          `Failed to approve ${selectedIds.length - successful} events`
        );
      }
    } catch (error) {
      console.error('Error in bulk approval:', error);
      toast.error('Failed to approve events');
    } finally {
      setIsUpdating((prev) => ({ ...prev, bulk: false }));
    }
  };

  // Handle event preview
  const handlePreviewEvent = (event: any) => {
    setSelectedEvent(event);
    setShowPreviewModal(true);
  };

  // Table columns definition
  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'title',
      header: 'Event',
      accessorFn: (row) => row.title,
      cell: ({ row }) => {
        const event = row.original;

        return (
          <div className="max-w-[300px]">
            <div className="font-medium truncate">{event.title}</div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.startDateTime)}
            </div>
            <div className="mt-1">
              <Badge variant="outline" className="bg-amber-100 text-amber-800">
                Pending Review
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      accessorFn: (row) => row.category?.name || 'Uncategorized',
      cell: ({ row }) => {
        const category = row.original.category;
        return <div>{category ? category.name : 'Uncategorized'}</div>;
      },
    },
    {
      id: 'organizer',
      header: 'Organizer',
      accessorFn: (row) => row.user?.name || 'Unknown',
      cell: ({ row }) => {
        const user = row.original.user;
        const organizerProfile = user?.organizerProfile;
        return (
          <div>
            {organizerProfile ? (
              <>
                <div className="truncate max-w-[150px]">
                  {organizerProfile.organizationName}
                </div>
                <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {user.name}
                </div>
              </>
            ) : (
              <div className="truncate max-w-[150px]">
                {user?.name || 'Unknown'}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'submittedAt',
      header: 'Submitted',
      accessorFn: (row) => row.updatedAt,
      cell: ({ row }) => {
        return (
          <div className="text-sm">
            {formatDateTime(row.original.updatedAt)}
          </div>
        );
      },
    },
    {
      id: 'venue',
      header: 'Venue',
      accessorFn: (row) => row.venue.name,
      cell: ({ row }) => {
        const venue = row.original.venue;
        const city = venue.city;
        return (
          <div>
            <div className="truncate max-w-[150px]">{venue.name}</div>
            {city && (
              <div className="text-sm text-muted-foreground">{city.name}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const event = row.original;
        const isAdmin =
          userRole === 'ADMIN' &&
          ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewEvent(event)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button> */}

            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateEventStatus(event.id, 'PUBLISHED')}
                  disabled={isUpdating[event.id]}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateEventStatus(event.id, 'REJECTED')}
                  disabled={isUpdating[event.id]}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
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
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and bulk actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search pending events..."
            value={globalFilter ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGlobalFilter(e.target.value)
            }
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
              <Button
                onClick={handleBulkApproval}
                disabled={isUpdating.bulk}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating.bulk ? 'Approving...' : 'Bulk Approve'}
              </Button>
            </div>
          )}

          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value: string) => {
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
                  No pending events found.
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
          pending events
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

      {/* Event Preview Modal */}
      {selectedEvent && (
        <EventPreviewModal
          event={selectedEvent}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedEvent(null);
          }}
          onApprove={(id: string) => handleUpdateEventStatus(id, 'PUBLISHED')}
          onReject={(id: string) => handleUpdateEventStatus(id, 'REJECTED')}
          isUpdating={isUpdating[selectedEvent.id] || false}
          userRole={userRole}
          userSubRole={userSubRole}
        />
      )}
    </div>
  );
}
