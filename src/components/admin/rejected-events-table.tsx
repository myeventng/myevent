'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Eye,
  Edit,
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  AlertCircle,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { updateEventStatus } from '@/actions/event.actions';
import { toast } from 'sonner';
import { EventPreviewModal } from './event-preview-modal';

interface RejectedEventsTableProps {
  initialData: any[];
  userRole: string;
  userSubRole: string;
}

export function RejectedEventsTable({
  initialData,
  userRole,
  userSubRole,
}: RejectedEventsTableProps) {
  const [data, setData] = useState<any[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
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
    status: 'PUBLISHED' | 'REJECTED'
  ) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const response = await updateEventStatus(id, status);

      if (response.success) {
        // Remove from rejected list since it's no longer rejected
        setData((prevData) => prevData.filter((event) => event.id !== id));

        toast.success(
          status === 'PUBLISHED'
            ? 'Event published successfully'
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

  // Handle bulk actions
  const handleBulkAction = async (action: 'PUBLISHED' | 'REJECTED') => {
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );

    if (selectedIds.length === 0) {
      toast.error('Please select events to update');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, bulk: true }));

      const promises = selectedIds.map((id) => updateEventStatus(id, action));

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      // Remove successfully updated events from the list
      setData((prevData) =>
        prevData.filter((event) => !selectedIds.includes(event.id))
      );

      // Clear selection
      setRowSelection({});

      const actionText = action === 'PUBLISHED' ? 'published' : 'rejected';
      toast.success(`Successfully ${actionText} ${successful} events`);

      if (successful < selectedIds.length) {
        toast.error(
          `Failed to update ${selectedIds.length - successful} events`
        );
      }
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Failed to update events');
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
              <Badge variant="outline" className="bg-red-100 text-red-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rejected
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
      id: 'rejectedAt',
      header: 'Rejected',
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
      id: 'rejectionReason',
      header: 'Reason',
      accessorFn: (row) => row.rejectionReason || 'No reason provided',
      cell: ({ row }) => {
        const reason = row.original.rejectionReason || 'No reason provided';
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[150px] truncate cursor-help">
                  {reason}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{reason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

            {/* <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/dashboard/events/${event.id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button> */}

            {isAdmin && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleUpdateEventStatus(event.id, 'REJECTED')
                        }
                        disabled={isUpdating[event.id]}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reject Event</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleUpdateEventStatus(event.id, 'PUBLISHED')
                        }
                        disabled={isUpdating[event.id]}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Publish Directly</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
            placeholder="Search rejected events..."
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
                onClick={() => handleBulkAction('REJECTED')}
                disabled={isUpdating.bulk}
                size="sm"
                variant="outline"
                className="text-amber-600 hover:text-amber-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {isUpdating.bulk ? 'Rejecting...' : 'Bulk Reject'}
              </Button>
              <Button
                onClick={() => handleBulkAction('PUBLISHED')}
                disabled={isUpdating.bulk}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {isUpdating.bulk ? 'Publishing...' : 'Bulk Publish'}
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
            {table
              .getHeaderGroups()
              .map((headerGroup: { id: string; headers: any[] }) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => (
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
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell: any) => (
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
                  No rejected events found.
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
          rejected events
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
          onMoveToPending={(id: string) =>
            handleUpdateEventStatus(id, 'REJECTED')
          }
          isUpdating={isUpdating[selectedEvent.id] || false}
          userRole={userRole}
          userSubRole={userSubRole}
          showRejectedActions={true}
        />
      )}
    </div>
  );
}
