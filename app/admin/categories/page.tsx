'use client';
import * as React from 'react';
import { Role } from '@prisma/client';
import toast from 'react-hot-toast';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpDown, Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrentRole } from '@/hooks/use-current-role';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllCategories } from '@/lib/actions/category.actions';
import dynamic from 'next/dynamic';

const DeleteCategoryButton = dynamic(
  () => import('@/components/shared/DeleteCategoryButton'),
  {
    ssr: false,
  }
);

// Updated to match database structure
interface Category {
  id: string;
  name: string;
}

export default function CategoryList() {
  const [data, setData] = React.useState<Category[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const role = useCurrentRole();
  if (role !== Role.ADMIN) {
    redirect('/admin');
  }

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const categories: Category[] = await getAllCategories();
        if (!Array.isArray(categories)) {
          throw new Error('Invalid data format');
        }

        const formattedData = categories.map((category) => ({
          id: category.id,
          name: category.name,
        }));

        setData(formattedData);
      } catch (error) {
        console.error('Error fetching category:', error);
        toast.error('Failed to fetch category');
      }
    };
    fetchData();
  }, []);

  const columns: ColumnDef<Category>[] = [
    {
      id: 'serial',
      header: '#',
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue('name')}</div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Link
            href={`/admin/categories/edit/${row.original.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit className="w-5 h-5" />
          </Link>
          <DeleteCategoryButton id={row.original.id} />
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
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Category Management</h1>
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Filter categories..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Link
          href="/admin/categories/add"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Add New Category
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
                  No Category found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
