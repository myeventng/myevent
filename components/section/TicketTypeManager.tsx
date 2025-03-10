'use client';

import { useState } from 'react';
import { Trash2, Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define types
interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface TicketTypeManagerProps {
  ticketTypes: TicketType[];
  onChange: (ticketTypes: TicketType[]) => void;
  disabled?: boolean;
  isFree?: boolean;
}

// Schema for ticket type validation
const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().min(0, 'Price cannot be negative'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

type TicketTypeFormValues = z.infer<typeof ticketTypeSchema>;

export const TicketTypeManager = ({
  ticketTypes,
  onChange,
  disabled = false,
  isFree = false,
}: TicketTypeManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form for ticket types
  const form = useForm<TicketTypeFormValues>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: '',
      price: isFree ? 0 : undefined,
      quantity: undefined,
    },
  });

  // Add or update ticket type
  const handleSaveTicketType = (data: TicketTypeFormValues) => {
    const newTicketType: TicketType = {
      ...data,
      id:
        editingIndex !== null && ticketTypes[editingIndex]
          ? ticketTypes[editingIndex].id
          : Date.now().toString(), // Use actual ID from backend in real app
    };

    let updatedTicketTypes: TicketType[];

    if (editingIndex !== null) {
      // Update existing ticket type
      updatedTicketTypes = [...ticketTypes];
      updatedTicketTypes[editingIndex] = newTicketType;
    } else {
      // Add new ticket type
      updatedTicketTypes = [...ticketTypes, newTicketType];
    }

    onChange(updatedTicketTypes);
    setIsDialogOpen(false);
    setEditingIndex(null);
    form.reset();
  };

  // Remove ticket type
  const handleRemoveTicketType = (index: number) => {
    const updatedTicketTypes = [...ticketTypes];
    updatedTicketTypes.splice(index, 1);
    onChange(updatedTicketTypes);
  };

  // Edit ticket type
  const handleEditTicketType = (index: number) => {
    const ticketType = ticketTypes[index];
    form.reset({
      name: ticketType.name,
      price: ticketType.price,
      quantity: ticketType.quantity,
    });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Close dialog and reset form
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
    form.reset();
  };

  return (
    <div className="space-y-4">
      {ticketTypes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketTypes.map((ticketType, index) => (
              <TableRow key={ticketType.id}>
                <TableCell className="font-medium">{ticketType.name}</TableCell>
                <TableCell>
                  {isFree ? 'Free' : `$${ticketType.price.toFixed(2)}`}
                </TableCell>
                <TableCell>{ticketType.quantity}</TableCell>
                <TableCell className="text-right">
                  {!disabled && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTicketType(index)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTicketType(index)}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-sm text-gray-500 py-4 text-center border rounded-md">
          No ticket types defined yet
        </div>
      )}

      {!disabled && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                form.reset({
                  name: '',
                  price: isFree ? 0 : undefined,
                  quantity: undefined,
                });
                setEditingIndex(null);
              }}
            >
              <Plus size={16} className="mr-2" />
              Add Ticket Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIndex !== null ? 'Edit Ticket Type' : 'Add Ticket Type'}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(handleSaveTicketType)}
              className="space-y-4"
            >
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...form.register('name')}
                    placeholder="e.g. General Admission, VIP"
                  />
                </FormControl>
                <FormMessage>{form.formState.errors.name?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    disabled={isFree}
                    placeholder="0.00"
                    {...form.register('price', {
                      valueAsNumber: true,
                    })}
                  />
                </FormControl>
                {isFree && (
                  <FormDescription>
                    Price set to 0 as this is a free event
                  </FormDescription>
                )}
                <FormMessage>
                  {form.formState.errors.price?.message}
                </FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Number of tickets available"
                    {...form.register('quantity', {
                      valueAsNumber: true,
                    })}
                  />
                </FormControl>
                <FormMessage>
                  {form.formState.errors.quantity?.message}
                </FormMessage>
              </FormItem>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Form field adapter for TicketTypeManager
export const FormFieldTicketTypeManager = ({
  control,
  name,
  label = 'Ticket Types',
  disabled = false,
  isFree = false,
}: {
  control: any;
  name: string;
  label?: string;
  disabled?: boolean;
  isFree?: boolean;
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <TicketTypeManager
              ticketTypes={field.value || []}
              onChange={field.onChange}
              disabled={disabled}
              isFree={isFree}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
