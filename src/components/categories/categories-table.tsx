'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries';
import type { CategoryRow, MajorOption } from './types';
import { Badge } from '@/components/ui/badge';
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
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { CreateCategoryModal } from './create-category-modal';
import { UpdateCategoryModal } from './update-category-modal';
import { DeleteCategoryDialog } from './delete-category-dialog';

interface CategoriesTableProps {
  initialData: CategoryRow[];
  majorCategories: MajorOption[];
  userCanCreate: boolean;
}

export const CategoriesTable = ({
  initialData,
  majorCategories,
  userCanCreate,
}: CategoriesTableProps) => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<CategoryRow[]>(initialData);

  // The saved (localStorage) copies of the category lists are out of date after any change here
  const refreshCachedLists = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    queryClient.invalidateQueries({ queryKey: queryKeys.eventFilters });
    queryClient.invalidateQueries({ queryKey: ['events', 'home'] });
  };
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(
    null
  );

  // Table column definitions
  const columns: ColumnDef<CategoryRow>[] = [
    {
      accessorKey: 'name',
      header: 'Category Name',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('name')}</div>
      ),
    },

    {
      id: 'majorCategory',
      header: 'Major category',
      accessorFn: (row) => row.majorCategory?.name ?? '',
      cell: ({ row }) => {
        const name = row.original.majorCategory?.name;
        return name ? (
          <Badge variant="secondary">{name}</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Not assigned</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const category = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedCategory(category);
                setUpdateModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedCategory(category);
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
  const handleCategoryCreated = (newCategory: CategoryRow) => {
    setData((prev) => [...prev, newCategory]);
    refreshCachedLists();
  };

  const handleCategoryUpdated = (updatedCategory: CategoryRow) => {
    refreshCachedLists();
    setData((prev) =>
      prev.map((catgoryCategory) =>
        catgoryCategory.id === updatedCategory.id
          ? updatedCategory
          : catgoryCategory
      )
    );
  };

  const handleCategoryDeleted = (deletedCategoryId: string) => {
    refreshCachedLists();
    setData((prev) =>
      prev.filter((catgoryCategory) => catgoryCategory.id !== deletedCategoryId)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search categories..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {userCanCreate && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
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
                  No categories found.
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
          categories
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
      <CreateCategoryModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCategoryCreated={handleCategoryCreated}
        majorCategories={majorCategories}
      />

      {selectedCategory && (
        <>
          <UpdateCategoryModal
            isOpen={updateModalOpen}
            onClose={() => {
              setUpdateModalOpen(false);
              setSelectedCategory(null);
            }}
            category={selectedCategory}
            onCategoryUpdated={handleCategoryUpdated}
            majorCategories={majorCategories}
          />

          <DeleteCategoryDialog
            isOpen={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setSelectedCategory(null);
            }}
            category={selectedCategory}
            onCategoryDeleted={handleCategoryDeleted}
          />
        </>
      )}
    </div>
  );
};
