'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Eye,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  StarOff,
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
import { toggleEventFeatured } from '@/actions/event.actions';
import { toast } from 'sonner';
import { EventPreviewModal } from '../events/event-preview-modal';

interface FeaturedEventsTableProps {
  initialData: any[];
  userRole: string;
  userSubRole: string;
}

export function FeaturedEventsTable({
  initialData,
  userRole,
  userSubRole,
}: FeaturedEventsTableProps) {
  const [data, setData] = useState<any[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startDateTime', desc: false },
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

  // Get badge color based on publication status
  const getStatusBadge = (status: string, isCancelled: boolean) => {
    if (isCancelled) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          Cancelled
        </Badge>
      );
    }

    switch (status) {
      case 'PUBLISHED':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Published
          </Badge>
        );
      case 'PENDING_REVIEW':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Pending Review
          </Badge>
        );
      case 'DRAFT':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800">
            Draft
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Handle single event unfeature
  const handleToggleFeature = async (id: string, currentFeatured: boolean) => {
    if (
      userRole !== 'ADMIN' ||
      !['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
    ) {
      toast.error('Only admins can manage featured events');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      const response = await toggleEventFeatured(id);

      if (response.success) {
        if (currentFeatured) {
          // Remove from featured list since it's no longer featured
          setData((prevData) => prevData.filter((event) => event.id !== id));
          toast.success('Event removed from featured list');
        } else {
          // Update the event in the list
          setData((prevData) =>
            prevData.map((event) =>
              event.id === id ? { ...event, featured: true } : event
            )
          );
          toast.success('Event added to featured list');
        }
      } else {
        toast.error(
          response.message || 'Failed to toggle event featured status'
        );
      }
    } catch (error) {
      console.error('Error toggling event featured status:', error);
      toast.error('Failed to update event');
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle bulk unfeature
  const handleBulkUnfeature = async () => {
    const selectedIds = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );

    if (selectedIds.length === 0) {
      toast.error('Please select events to unfeature');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, bulk: true }));

      const promises = selectedIds.map((id) => toggleEventFeatured(id));

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      // Remove successfully unfeatured events from the list
      setData((prevData) =>
        prevData.filter((event) => !selectedIds.includes(event.id))
      );

      // Clear selection
      setRowSelection({});

      toast.success(`Successfully unfeatured ${successful} events`);

      if (successful < selectedIds.length) {
        toast.error(
          `Failed to unfeature ${selectedIds.length - successful} events`
        );
      }
    } catch (error) {
      console.error('Error in bulk unfeature:', error);
      toast.error('Failed to unfeature events');
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
        const isCancelled = event.isCancelled;

        return (
          <div className="max-w-[300px]">
            <div className="font-medium truncate">{event.title}</div>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.startDateTime)}
            </div>
            <div className="mt-1 flex gap-2">
              {getStatusBadge(event.publishedStatus, isCancelled)}
              <Badge
                variant="outline"
                className="bg-purple-100 text-purple-800"
              >
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
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
      id: 'tickets',
      header: 'Tickets',
      accessorFn: (row) => row.ticketTypes?.length || 0,
      cell: ({ row }) => {
        const ticketTypes = row.original.ticketTypes || [];
        const totalTickets = ticketTypes.reduce(
          (sum: number, type: any) => sum + type.quantity,
          0
        );

        return (
          <div>
            <div>
              {ticketTypes.length} type{ticketTypes.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-muted-foreground">
              {totalTickets} available
            </div>
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

            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/dashboard/events/${event.id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleFeature(event.id, event.featured)}
                disabled={isUpdating[event.id]}
                className="text-red-600 hover:text-red-700"
                title="Remove from featured"
              >
                <StarOff className="h-4 w-4" />
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
            placeholder="Search featured events..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
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
                onClick={handleBulkUnfeature}
                disabled={isUpdating.bulk}
                size="sm"
                variant="destructive"
              >
                {isUpdating.bulk ? 'Unfeaturing...' : 'Bulk Unfeature'}
              </Button>
            </div>
          )}

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
                  No featured events found.
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
          featured events
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
          onToggleFeature={(id) =>
            handleToggleFeature(id, selectedEvent.featured)
          }
          isUpdating={isUpdating[selectedEvent.id] || false}
          userRole={userRole}
          userSubRole={userSubRole}
          showFeatureActions={true}
        />
      )}
    </div>
  );
}
