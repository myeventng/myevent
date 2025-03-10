'use client';
import * as React from 'react';
import { getAllVenues } from '@/lib/actions/venue.actions';
import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  ArrowUpDown,
  Edit,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentRole } from '@/hooks/use-current-role';
import dynamic from 'next/dynamic';

const DeleteVenueButton = dynamic(
  () => import('@/components/shared/DeleteVenueButton'),
  {
    ssr: false,
  }
);

interface Venue {
  id: string;
  name: string;
  address: string;
  city: {
    name: string;
    state: string;
  };
  capacity: number | null;
  latitude: string;
  longitude: string;
}

export default function VenuesPage() {
  const [data, setData] = React.useState<Venue[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const role = useCurrentRole();
  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    redirect('/admin');
  }

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const venues = await getAllVenues();

        if (!Array.isArray(venues)) {
          throw new Error('Invalid data format');
        }

        const formattedData = venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          city: venue.city,
          address: venue.address,
          capacity: venue.capacity ?? 0,
          latitude: venue.latitude,
          longitude: venue.longitude,
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Error fetching venues:', error);
        toast.error('Failed to fetch venues');
      }
    };

    fetchData();
  }, []);

  const capacityFormatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
  });

  const columns: ColumnDef<Venue>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Venue
            <ArrowUpDown className="size-5 p-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: 'city',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            City/State
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) =>
        `${row.original.city.name}, ${row.original.city.state}`,
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) =>
        capacityFormatter.format(row.getValue('capacity') ?? 0),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex">
          <Link
            href={`/admin/venues/view/${row.original.id}`}
            className="text-green-600 hover:text-green-800  hover:bg-green-100 p-[10px] px-3 rounded-md"
            title="View Venue"
          >
            <Eye className="size-5" />
          </Link>
          <Link
            href={`/admin/venues/edit/${row.original.id}`}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-[10px] px-3 rounded-md"
            title="Edit Venue"
          >
            <Edit className="size-5" />
          </Link>
          <DeleteVenueButton id={row.original.id} />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Venue Management</h1>
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Filter venues..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Link
          href="/admin/venues/add"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Add New Venue
        </Link>
      </div>
      <div className="bg-white shadow-md rounded-lg">
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
                  No Venue found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px] text-black">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top" className="text-black">
                {[10, 15, 20].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
