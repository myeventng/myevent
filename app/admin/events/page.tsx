'use client';

import * as React from 'react';
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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const data: Events[] = [
  {
    _id: '1',
    title: 'Lagos Tech Summit',
    venue: 'Landmark Event Center',
    city: 'Lagos',
    createdAt: new Date(),
    startDateTime: new Date('2025-03-15T09:00:00'),
    endDateTime: new Date('2025-03-15T17:00:00'),
    isFree: false,
    category: 'Technology',
    organizer: 'John',
    featured: true,
    publishedStatus: 'draft',
  },
  {
    _id: '2',
    title: 'Abuja Startup Fair',
    venue: 'Abuja International Conference Center',
    city: 'Abuja',
    createdAt: new Date(),
    startDateTime: new Date('2025-04-10T10:00:00'),
    endDateTime: new Date('2025-04-10T16:00:00'),
    isFree: true,
    category: 'Business',
    organizer: 'Dico',
    featured: false,
    publishedStatus: 'pending review',
  },
  {
    _id: '3',
    title: 'Port Harcourt Music Festival',
    venue: 'Port Harcourt Stadium',
    city: 'Port Harcourt',
    createdAt: new Date(),
    startDateTime: new Date('2025-05-01T18:00:00'),
    endDateTime: new Date('2025-05-01T23:59:00'),
    isFree: false,
    category: 'Music',
    organizer: 'Emeka',
    featured: true,
    publishedStatus: 'draft',
  },
  {
    _id: '4',
    title: 'Kano Cultural Festival',
    venue: 'Kano City Center',
    city: 'Kano',
    createdAt: new Date(),
    startDateTime: new Date('2025-06-20T10:00:00'),
    endDateTime: new Date('2025-06-20T18:00:00'),
    isFree: true,
    category: 'Culture',
    organizer: 'Amina',
    featured: false,
    publishedStatus: 'pending review',
  },
  {
    _id: '5',
    title: 'Enugu Literary Expo',
    venue: 'Enugu Arts Theater',
    city: 'Enugu',
    createdAt: new Date(),
    startDateTime: new Date('2025-07-05T09:00:00'),
    endDateTime: new Date('2025-07-05T17:00:00'),
    isFree: false,
    category: 'Literature',
    organizer: 'Chinelo',
    featured: false,
    publishedStatus: 'draft',
  },
  {
    _id: '6',
    title: 'Calabar Carnival',
    venue: 'Calabar City',
    city: 'Calabar',
    createdAt: new Date(),
    startDateTime: new Date('2025-12-01T15:00:00'),
    endDateTime: new Date('2025-12-01T23:00:00'),
    isFree: true,
    category: 'Entertainment',
    organizer: 'Ekanem',
    featured: true,
    publishedStatus: 'pending review',
  },
  {
    _id: '7',
    title: 'Calabar Carnival',
    venue: 'Calabar City',
    city: 'Calabar',
    createdAt: new Date(),
    startDateTime: new Date('2025-12-01T15:00:00'),
    endDateTime: new Date('2025-12-01T23:00:00'),
    isFree: true,
    category: 'Entertainment',
    organizer: 'Ekanem',
    featured: true,
    publishedStatus: 'pending review',
  },
  {
    _id: '8',
    title: 'Calabar Carnival',
    venue: 'Calabar City',
    city: 'Calabar',
    createdAt: new Date(),
    startDateTime: new Date('2025-12-01T15:00:00'),
    endDateTime: new Date('2025-12-01T23:00:00'),
    isFree: true,
    category: 'Entertainment',
    organizer: 'Ekanem',
    featured: true,
    publishedStatus: 'pending review',
  },
];

export type Events = {
  _id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  organizer: string;
  startDateTime: Date;
  endDateTime: Date;
  createdAt: Date;
  isFree: boolean;
  featured: boolean;
  publishedStatus: string;
};

export const columns: ColumnDef<Events>[] = [
  {
    id: 'serial',
    header: '#',
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('title')}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Category
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('category')}</div>
    ),
  },
  {
    accessorKey: 'venue',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Venue
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('venue')}</div>
    ),
  },
  {
    accessorKey: 'organizer',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Organizer
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('organizer')}</div>
    ),
  },
  {
    accessorKey: 'publishedStatus',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('publishedStatus')}</div>
    ),
  },
  {
    accessorKey: 'featured',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Features
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('featured')}</div>
    ),
  },
  {
    accessorKey: 'city',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          City
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => <div className="capitalize">{row.getValue('city')}</div>,
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment._id)}
            >
              View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Publish Event</DropdownMenuItem>
            <DropdownMenuItem>Add New Event</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function EventList() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter title..."
          value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('title')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
