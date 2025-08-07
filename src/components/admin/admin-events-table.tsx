'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Eye,
  Edit,
  Star,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  BarChart3,
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
import {
  publishEvent,
  toggleEventFeatured,
  deleteEvent,
} from '@/actions/event.actions';
import { toast } from 'sonner';
import { PublishedStatus } from '@/generated/prisma';
import { EventPreviewModal } from '../events/event-preview-modal';
import { EventAnalyticsModal } from '@/components/events/event-analystics-modal';

interface AdminEventsTableProps {
  initialData: any[];
  userRole: string;
  userSubRole: string;
}

export function AdminEventsTable({
  initialData,
  userRole,
  userSubRole,
}: AdminEventsTableProps) {
  const [data, setData] = useState<any[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startDateTime', desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isUpdating, setIsUpdating] = useState<{ [key: string]: boolean }>({});
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'PPP p');
  };

  // Get badge color based on publication status
  const getStatusBadge = (status: PublishedStatus, isCancelled: boolean) => {
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

  // Handle event publication/approval
  const handlePublishEvent = async (
    id: string,
    currentStatus: PublishedStatus
  ) => {
    try {
      setIsUpdating((prev) => ({ ...prev, [id]: true }));

      if (['PENDING_REVIEW', 'DRAFT'].includes(currentStatus)) {
        const response = await publishEvent(id);

        if (response.success) {
          setData((prevData) =>
            prevData.map((event) =>
              event.id === id
                ? { ...event, publishedStatus: 'PUBLISHED' }
                : event
            )
          );

          toast.success('Event successfully published');
        } else {
          toast.error(response.message || 'Failed to publish event');
        }
      } else {
        toast.error(
          'Can only publish events that are in Draft or Pending Review status'
        );
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      toast.error('Failed to publish event');
    } finally {
      setIsUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Handle event featuring/unfeaturing
  const handleToggleFeature = async (id: string, currentFeatured: boolean) => {
    if (
      userRole !== 'ADMIN' ||
      !['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
    ) {
      toast.error('Only admins can feature events');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, [`feature-${id}`]: true }));

      const response = await toggleEventFeatured(id);

      if (response.success) {
        setData((prevData) =>
          prevData.map((event) =>
            event.id === id ? { ...event, featured: !currentFeatured } : event
          )
        );

        toast.success(
          currentFeatured ? 'Event unfeatured' : 'Event featured successfully'
        );
      } else {
        toast.error(
          response.message || 'Failed to toggle event featured status'
        );
      }
    } catch (error) {
      console.error('Error toggling event featured status:', error);
      toast.error('Failed to update event');
    } finally {
      setIsUpdating((prev) => ({ ...prev, [`feature-${id}`]: false }));
    }
  };

  // Handle event deletion (SUPER_ADMIN only)
  const handleDeleteEvent = async (id: string) => {
    if (userSubRole !== 'SUPER_ADMIN') {
      toast.error('Only Super Admins can delete events');
      return;
    }

    try {
      setIsUpdating((prev) => ({ ...prev, [`delete-${id}`]: true }));

      const response = await deleteEvent(id);

      if (response.success) {
        // Remove from list or mark as cancelled based on the response
        setData((prevData) => prevData.filter((event) => event.id !== id));
        toast.success('Event deleted successfully');
      } else {
        toast.error(response.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setIsUpdating((prev) => ({ ...prev, [`delete-${id}`]: false }));
    }
  };

  // Handle event preview
  const handlePreviewEvent = (event: any) => {
    setSelectedEvent(event);
    setShowPreviewModal(true);
  };

  // Handle event analytics
  const handleAnalyticsEvent = (event: any) => {
    setSelectedEvent(event);
    setShowAnalyticsModal(true);
  };

  // Table columns definition
  const columns: ColumnDef<any>[] = [
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
            <div className="mt-1">
              {getStatusBadge(event.publishedStatus, isCancelled)}
              {event.featured && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-purple-100 text-purple-800"
                >
                  Featured
                </Badge>
              )}
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
      id: 'publishedStatus',
      header: 'Status',
      accessorFn: (row) => row.publishedStatus,
      cell: ({ row }) =>
        getStatusBadge(row.original.publishedStatus, row.original.isCancelled),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const event = row.original;
        const isAdmin =
          userRole === 'ADMIN' &&
          ['STAFF', 'SUPER_ADMIN'].includes(userSubRole);
        const isSuperAdmin = userSubRole === 'SUPER_ADMIN';
        const isPendingOrDraft = ['PENDING_REVIEW', 'DRAFT'].includes(
          event.publishedStatus
        );
        const canPublish = isAdmin && isPendingOrDraft && !event.isCancelled;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewEvent(event)}
            >
              <Eye className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAnalyticsEvent(event)}
            >
              <BarChart3 className="h-4 w-4" />
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
                disabled={isUpdating[`feature-${event.id}`]}
              >
                <Star
                  className={`h-4 w-4 ${
                    event.featured ? 'fill-yellow-400 text-yellow-400' : ''
                  }`}
                />
              </Button>
            )}

            {canPublish && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handlePublishEvent(event.id, event.publishedStatus)
                }
                disabled={isUpdating[event.id]}
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            )}

            {isSuperAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating[`delete-${event.id}`]}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{event.title}&quot;?
                      This action cannot be undone. If the event has orders or
                      tickets, it will be cancelled instead of deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteEvent(event.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isUpdating[`delete-${event.id}`]}
                    >
                      {isUpdating[`delete-${event.id}`]
                        ? 'Deleting...'
                        : 'Delete'}
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

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search events..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <Select
            value={
              (table
                .getColumn('publishedStatus')
                ?.getFilterValue() as string) || ''
            }
            onValueChange={(value) => {
              table
                .getColumn('publishedStatus')
                ?.setFilterValue(value || undefined);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem disabled value="placeholder">
                All Statuses
              </SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
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
          <Button asChild>
            <Link href="/admin/dashboard/events/create">Create Event</Link>
          </Button>
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
                  No events found.
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
          events
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
          onApprove={
            ['PENDING_REVIEW', 'DRAFT'].includes(
              selectedEvent.publishedStatus
            ) && !selectedEvent.isCancelled
              ? (id: string) =>
                  handlePublishEvent(id, selectedEvent.publishedStatus)
              : undefined
          }
          onToggleFeature={
            userRole === 'ADMIN' &&
            ['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
              ? (id: string) => handleToggleFeature(id, selectedEvent.featured)
              : undefined
          }
          isUpdating={
            isUpdating[selectedEvent.id] ||
            isUpdating[`feature-${selectedEvent.id}`] ||
            false
          }
          userRole={userRole}
          userSubRole={userSubRole}
          showFeatureActions={
            userRole === 'ADMIN' &&
            ['STAFF', 'SUPER_ADMIN'].includes(userSubRole)
          }
        />
      )}

      {/* Event Analytics Modal */}
      {selectedEvent && (
        <EventAnalyticsModal
          event={selectedEvent}
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedEvent(null);
          }}
          userRole={userRole}
          userSubRole={userSubRole}
        />
      )}
    </div>
  );
}
