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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { nigeriaStates } from '@/lib/dataSample';

const data: City[] = [
  {
    id: 'm5gr84i9',
    state: 'Lagos',
    population: '133,331',
    city: 'ken99@yahoo.com',
  },
  {
    id: '3u1reuv4',
    state: 'Lagos',
    population: '133,331',
    city: 'Abe45@city.com',
  },
  {
    id: 'derv1ws0',
    state: 'Lagos',
    population: '133,331',
    city: 'Monserrat44@city.com',
  },
  {
    id: '5kma53ae',
    state: 'Lagos',
    population: '133,331',
    city: 'Silas22@city.com',
  },
  {
    id: 'bhqecj4p',
    state: 'Lagos',
    population: '233,331',
    city: 'carmella@hocity.com',
  },
];

export type City = {
  id: string;
  city: string;
  state: string;
  population: string;
};

export default function CityList() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [alertAction, setAlertAction] = React.useState<{
    type: 'create' | 'edit' | 'delete' | null;
    city: City | null;
  }>({ type: null, city: null });

  const handleAction = (type: 'create' | 'edit' | 'delete', city: City) => {
    setAlertAction({ type, city });
  };

  const columns: ColumnDef<City>[] = [
    {
      id: 'serial',
      header: '#',
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'city',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          City
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue('city')}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'state',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          State
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue('state')}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'population',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Population
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue('population')}</div>
      ),
      enableHiding: false,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const city = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-bold">
                Actions
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAction('create', city)}>
                Create
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('edit', city)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('delete', city)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
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
  });

  return (
    <>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter city..."
            value={(table.getColumn('city')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('city')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
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

      {alertAction.type && alertAction.city && (
        <AlertDialog
          open
          onOpenChange={() => setAlertAction({ type: null, city: null })}
        >
          <AlertDialogContent className="bg-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                {alertAction.type === 'edit'
                  ? 'Edit City'
                  : alertAction.type === 'delete'
                  ? 'Delete City'
                  : 'Create City'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/80">
                {alertAction.type === 'edit'
                  ? `Make changes to ${alertAction.city.city} event city.`
                  : alertAction.type === 'delete'
                  ? `Are you sure you want to delete the event city ${alertAction.city.city}?`
                  : 'Enter details to create a new event city.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {(alertAction.type === 'edit' || alertAction.type === 'create') && (
              <>
                <Input
                  defaultValue={
                    alertAction.type === 'edit' ? alertAction.city.city : ''
                  }
                  placeholder="Enter city name"
                  className="my-4"
                />
                {/* <Input
                  defaultValue={
                    alertAction.type === 'edit' ? alertAction.city.state : ''
                  }
                  placeholder="Enter state"
                  className="my-4"
                /> */}
                <Select>
                  <SelectTrigger className="my-4">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigeriaStates.states.map((state) => (
                      <SelectItem
                        value={state}
                        key={state}
                        className="bg-white"
                        defaultValue={
                          alertAction.type === 'edit'
                            ? alertAction.city.population
                            : ''
                        }
                      >
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  defaultValue={
                    alertAction.type === 'edit'
                      ? alertAction.city.population
                      : ''
                  }
                  placeholder="Enter population in numbers"
                  className="my-4"
                />
              </>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel className="text-white hover:text-gray-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction>
                {alertAction.type === 'edit'
                  ? 'Save Changes'
                  : alertAction.type === 'delete'
                  ? 'Confirm Delete'
                  : 'Create City'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
