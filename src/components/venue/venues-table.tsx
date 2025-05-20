'use client';

import { useState } from 'react';
import { Venue, City } from '@/generated/prisma';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Eye,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { CreateVenueModal } from './create-venue-modal';
import { UpdateVenueModal } from './update-venue-modal';
import { DeleteVenueDialog } from './delete-venue-dialog';
import { ViewVenueModal } from './view-venue-modal';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VenueWithCityAndUser extends Venue {
  city: City | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
}

interface AdminVenuesTableProps {
  initialData: VenueWithCityAndUser[];
  cities: City[];
  userCanCreate: boolean;
}

export const AdminVenuesTable = ({
  initialData,
  cities,
  userCanCreate,
}: AdminVenuesTableProps) => {
  const [data, setData] = useState<VenueWithCityAndUser[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] =
    useState<VenueWithCityAndUser | null>(null);

  // Table column definitions
  const columns: ColumnDef<VenueWithCityAndUser>[] = [
    {
      accessorKey: 'venueImageUrl',
      header: 'Image',
      cell: ({ row }) => {
        const imageUrl = row.getValue('venueImageUrl') as string | undefined;
        return imageUrl ? (
          <div className="relative w-12 h-12 rounded-md overflow-hidden">
            <Image
              src={imageUrl}
              alt={row.getValue('name') as string}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-gray-400" />
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Venue Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'city.name',
      header: 'City',
      cell: ({ row }) => {
        const venue = row.original;
        return (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {venue.city?.name || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => {
        const capacity = row.getValue('capacity') as number;
        return capacity ? capacity.toLocaleString() : 'N/A';
      },
    },
    {
      accessorKey: 'user',
      header: 'Organizer',
      cell: ({ row }) => {
        const user = row.original.user;
        if (!user)
          return <span className="text-muted-foreground">Unknown</span>;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {user.image ? (
                      <AvatarImage src={user.image} alt={user.name || 'User'} />
                    ) : null}
                    <AvatarFallback>
                      {user.name
                        ? user.name.substring(0, 2).toUpperCase()
                        : 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate max-w-[120px]">{user.name}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const venue = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedVenue(venue);
                setViewModalOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedVenue(venue);
                setUpdateModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedVenue(venue);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
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
  });

  // Handlers for updating the table data after CRUD operations
  const handleVenueCreated = (newVenue: VenueWithCityAndUser) => {
    setData((prev) => [...prev, newVenue]);
  };

  const handleVenueUpdated = (updatedVenue: VenueWithCityAndUser) => {
    setData((prev) =>
      prev.map((venue) => (venue.id === updatedVenue.id ? updatedVenue : venue))
    );
  };

  const handleVenueDeleted = (deletedVenueId: string) => {
    setData((prev) => prev.filter((venue) => venue.id !== deletedVenueId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search venues..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {userCanCreate && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Venue
          </Button>
        )}
      </div>

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
                  No venues found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getFilteredRowModel().rows.length} of {data.length}{' '}
          venues
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

      {/* Modals */}
      <CreateVenueModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onVenueCreated={handleVenueCreated}
        cities={cities}
      />

      {selectedVenue && (
        <>
          <ViewVenueModal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedVenue(null);
            }}
            venue={selectedVenue}
          />

          <UpdateVenueModal
            isOpen={updateModalOpen}
            onClose={() => {
              setUpdateModalOpen(false);
              setSelectedVenue(null);
            }}
            venue={selectedVenue}
            cities={cities}
            onVenueUpdated={handleVenueUpdated}
          />

          <DeleteVenueDialog
            isOpen={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setSelectedVenue(null);
            }}
            venue={selectedVenue}
            onVenueDeleted={handleVenueDeleted}
          />
        </>
      )}
    </div>
  );
};
