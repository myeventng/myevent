'use client';

import { useState } from 'react';
import { Tag } from '@/generated/prisma';
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
import { Badge } from '@/components/ui/badge';
import { CreateTagModal } from './create-tag-modal';
import { UpdateTagModal } from './update-tag-modal';
import { DeleteTagDialog } from './delete-tag-dialog';

interface TagsTableProps {
  initialData: Tag[];
  userCanCreate: boolean;
}

export const TagsTable = ({ initialData, userCanCreate }: TagsTableProps) => {
  const [data, setData] = useState<Tag[]>(initialData);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  // Table column definitions
  const columns: ColumnDef<Tag>[] = [
    {
      accessorKey: 'name',
      header: 'Tag Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge
            style={{
              backgroundColor: row.original.bgColor,
              color: 'white',
            }}
          >
            {row.getValue('name')}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'bgColor',
      header: 'Color',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: row.original.bgColor }}
          />
          <span className="font-mono text-sm">{row.original.bgColor}</span>
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.slug || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tag = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedTag(tag);
                setUpdateModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedTag(tag);
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
  const handleTagCreated = (newTag: Tag) => {
    setData((prev) => [...prev, newTag]);
  };

  const handleTagUpdated = (updatedTag: Tag) => {
    setData((prev) =>
      prev.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag))
    );
  };

  const handleTagDeleted = (deletedTagId: string) => {
    setData((prev) => prev.filter((tag) => tag.id !== deletedTagId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tags..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {userCanCreate && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
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
                  No tags found.
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
          tags
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
      <CreateTagModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTagCreated={handleTagCreated}
      />

      {selectedTag && (
        <>
          <UpdateTagModal
            isOpen={updateModalOpen}
            onClose={() => {
              setUpdateModalOpen(false);
              setSelectedTag(null);
            }}
            tag={selectedTag}
            onTagUpdated={handleTagUpdated}
          />

          <DeleteTagDialog
            isOpen={deleteDialogOpen}
            onClose={() => {
              setDeleteDialogOpen(false);
              setSelectedTag(null);
            }}
            tag={selectedTag}
            onTagDeleted={handleTagDeleted}
          />
        </>
      )}
    </div>
  );
};
