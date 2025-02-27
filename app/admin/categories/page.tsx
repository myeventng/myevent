'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
import { ArrowUpDown, MoreHorizontal, Plus } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
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
import { useToast } from '@/hooks/use-toast';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} from '@/lib/actions/category.actions';

export type Category = {
  _id: string;
  name: string;
};

const formSchema = z.object({
  category: z.string().min(3, {
    message: 'Category name must be at least 3 characters.',
  }),
});

export default function CategoryList() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [alertAction, setAlertAction] = React.useState<{
    type: 'create' | 'edit' | 'delete' | null;
    category: Category | null;
  }>({ type: null, category: null });
  const { toast } = useToast();

  // Fetch categories on component mount
  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getAllCategories();
      setCategories(data || []);
      console.log(data);
    } catch (error) {
      toast({
        title: 'Error fetching categories',
        description: 'Failed to load categories. Please try again.',
        variant: 'destructive',
      });
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (
    type: 'create' | 'edit' | 'delete',
    category?: Category
  ) => {
    setAlertAction({ type, category: category || null });
    if (type === 'edit' && category) {
      form.setValue('category', category.name);
    }
  };

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
      cell: ({ row }) => {
        const category = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAction('edit', category)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAction('delete', category)}
                className="text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: categories,
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
    },
  });

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteCategory({ categoryId });
      toast({
        title: 'Category deleted',
        description: 'Category has been deleted successfully.',
        variant: 'default',
      });
      fetchCategories(); // Refresh the list
      setAlertAction({ type: null, category: null });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category. Please try again.',
        variant: 'destructive',
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (alertAction.type === 'create') {
        // await createCategory({ categoryName: values.category, '/admin/categories' });
        toast({
          title: 'Success',
          description: 'Category created successfully.',
          variant: 'default',
        });
      } else if (alertAction.type === 'edit' && alertAction.category) {
        await updateCategory({
          categoryId: alertAction.category._id,
          updatedData: { name: values.category },
        });
        toast({
          title: 'Success',
          description: 'Category updated successfully.',
          variant: 'default',
        });
      }

      fetchCategories(); // Refresh the list
      setAlertAction({ type: null, category: null });
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">Loading...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Filter categories..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => handleAction('create')}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
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
                  No categories found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
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

      {/* Create/Edit/Delete Dialog */}
      {alertAction.type && (
        <AlertDialog
          open={true}
          onOpenChange={() => setAlertAction({ type: null, category: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {alertAction.type === 'edit'
                  ? 'Edit Category'
                  : alertAction.type === 'delete'
                  ? 'Delete Category'
                  : 'Create Category'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {alertAction.type === 'delete'
                  ? `Are you sure you want to delete "${alertAction.category?.name}"?`
                  : 'Enter the category name below.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {alertAction.type !== 'delete' ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Category name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        form.reset();
                        setAlertAction({ type: null, category: null });
                      }}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction type="submit">
                      {alertAction.type === 'create' ? 'Create' : 'Save'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </form>
              </Form>
            ) : (
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    alertAction.category &&
                    handleDelete(alertAction.category._id)
                  }
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            )}
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
