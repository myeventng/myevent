'use client';

import { useState } from 'react';
import { City } from '@/generated/prisma';
// Import the VenueWithCity type as well
import { VenueWithCityAndUser, VenueWithCity } from '@/types';
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
} from 'lucide-react';
import Image from 'next/image';
import { CreateVenueModal } from './create-venue-modal';
import { UpdateVenueModal } from './update-venue-modal';
import { DeleteVenueDialog } from './delete-venue-dialog';
import { ViewVenueModal } from './view-venue-modal';

interface UserVenuesTableProps {
  initialData: VenueWithCityAndUser[];
  cities: City[];
  onVenueCreated?: (venue: VenueWithCityAndUser) => void;
  onVenueUpdated?: (venue: VenueWithCityAndUser) => void;
  onVenueDeleted?: (venueId: string) => void;
}

// Type for basic venue data that comes from the modal
type BasicVenueData = {
  id: string;
  name: string;
  address: string;
  cityId: string;
  userId: string;
  description: string | null;
  contactInfo: string | null;
  capacity: number | null;
  venueImageUrl: string | null;
  latitude: string | null;
  longitude: string | null;
};

export const UserVenuesTable = ({
  initialData,
  cities,
  onVenueCreated,
  onVenueUpdated,
  onVenueDeleted,
}: UserVenuesTableProps) => {
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

  // Helper function to transform basic venue data to VenueWithCityAndUser
  const transformBasicVenueToVenueWithCityAndUser = (
    basicVenue: BasicVenueData
  ): VenueWithCityAndUser => {
    // Find the city for this venue
    const city = cities.find((c) => c.id === basicVenue.cityId);

    return {
      ...basicVenue,
      city: city
        ? {
            id: city.id,
            name: city.name,
            state: city.state,
            population: city.population || null,
          }
        : null,
      user: null, // New venues typically don't have user data populated yet in this context
    };
  };

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

  // Wrapper function for CreateVenueModal callback
  const handleCreateVenueModalCallback = (basicVenue: BasicVenueData) => {
    // Transform basic venue to VenueWithCityAndUser
    const venueWithCityAndUser =
      transformBasicVenueToVenueWithCityAndUser(basicVenue);

    // Update local state
    setData((prev) => [...prev, venueWithCityAndUser]);

    // Call parent callback if provided
    onVenueCreated?.(venueWithCityAndUser);
  };

  // Wrapper function for UpdateVenueModal callback
  const handleUpdateVenueModalCallback = (
    updatedVenue: VenueWithCityAndUser | VenueWithCity
  ) => {
    // Ensure the venue has user property (transform VenueWithCity to VenueWithCityAndUser if needed)
    const venueWithCityAndUser: VenueWithCityAndUser =
      'user' in updatedVenue
        ? (updatedVenue as VenueWithCityAndUser)
        : ({ ...updatedVenue, user: null } as VenueWithCityAndUser);

    // Update local state
    setData((prev) =>
      prev.map((venue) =>
        venue.id === venueWithCityAndUser.id ? venueWithCityAndUser : venue
      )
    );

    // Call parent callback if provided
    onVenueUpdated?.(venueWithCityAndUser);
  };

  const handleVenueDeleted = (deletedVenueId: string) => {
    setData((prev) => prev.filter((venue) => venue.id !== deletedVenueId));
    onVenueDeleted?.(deletedVenueId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search your venues..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
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
                  {data.length === 0 ? (
                    <div className="py-8">
                      <p className="text-muted-foreground mb-2">
                        You haven&apos;t created any venues yet
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setCreateModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Venue
                      </Button>
                    </div>
                  ) : (
                    'No venues found matching your search.'
                  )}
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
            {table.getPageCount() || 1}
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
        onVenueCreated={handleCreateVenueModalCallback}
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
            onVenueUpdated={handleUpdateVenueModalCallback}
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
