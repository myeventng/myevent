'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Schema for ticket type
const ticketTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

type TicketTypeValues = z.infer<typeof ticketTypeSchema>;

interface EventTicketsProps {
  formData: any;
  ticketTypes: any[];
  setTicketTypes: (ticketTypes: any[]) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function EventTickets({
  formData,
  ticketTypes,
  setTicketTypes,
  onNext,
  onPrevious,
}: EventTicketsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Update form default price when isFree changes
  useEffect(() => {
    if (formData.isFree) {
      form.setValue('price', 0);
    }
  }, [formData.isFree]);

  // Handle adding and editing ticket types
  const form = useForm<TicketTypeValues>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: {
      name: '',
      price: formData.isFree ? 0 : undefined,
      quantity: undefined,
    },
  });

  // Pre-populate form when editing a ticket type
  useEffect(() => {
    if (isEditMode && editIndex !== null && ticketTypes[editIndex]) {
      const ticketType = ticketTypes[editIndex];
      form.reset({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: ticketType.quantity,
      });
    }
  }, [isEditMode, editIndex, ticketTypes]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      form.reset({
        name: '',
        price: formData.isFree ? 0 : undefined,
        quantity: undefined,
      });
      setIsEditMode(false);
      setEditIndex(null);
    }
  }, [isDialogOpen, formData.isFree]);

  // Handle ticket type submission
  const onSubmitTicketType = (values: TicketTypeValues) => {
    try {
      // Generate a temporary ID for new ticket types
      if (!values.id) {
        values.id = `temp-${Date.now()}`;
      }

      if (isEditMode && editIndex !== null) {
        // Update existing ticket type
        const updatedTicketTypes = [...ticketTypes];
        updatedTicketTypes[editIndex] = values;
        setTicketTypes(updatedTicketTypes);
        toast.success('Ticket type updated successfully');
      } else {
        // Add new ticket type
        setTicketTypes([...ticketTypes, values]);
        toast.success('Ticket type added successfully');
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting ticket type:', error);
      toast.error('Failed to save ticket type');
    }
  };

  // Handle ticket type deletion
  const handleDeleteTicketType = () => {
    if (deleteIndex !== null) {
      const updatedTicketTypes = [...ticketTypes];
      updatedTicketTypes.splice(deleteIndex, 1);
      setTicketTypes(updatedTicketTypes);
      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
      toast.success('Ticket type removed');
    }
  };

  // Check if we can proceed to the next step
  const canProceed = () => {
    // Free events still need at least one ticket type for tracking attendees
    return ticketTypes.length > 0;
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Tickets</h2>
        <p className="text-muted-foreground">
          Define ticket types for your event.
          {formData.isFree && (
            <span className="ml-1 text-primary font-medium">
              This is a free event, but you still need to create ticket types
              for tracking attendance.
            </span>
          )}
        </p>
      </div>

      {/* Ticket types list */}
      <div className="space-y-4">
        {ticketTypes.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>
              No ticket types added yet. Click the button below to add your
              first ticket type.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticketTypes.map((ticketType, index) => (
              <Card key={ticketType.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{ticketType.name}</CardTitle>
                  <CardDescription>
                    {formData.isFree
                      ? 'Free Admission'
                      : formatPrice(ticketType.price)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Quantity: {ticketType.quantity}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditMode(true);
                      setEditIndex(index);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeleteIndex(index);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Button
          onClick={() => {
            setIsEditMode(false);
            setIsDialogOpen(true);
          }}
          className="mt-4"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Ticket Type
        </Button>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={onNext} disabled={!canProceed()}>
          Next
        </Button>
      </div>

      {/* Add/Edit Ticket Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Ticket Type' : 'Add Ticket Type'}
            </DialogTitle>
            <DialogDescription>
              {formData.isFree
                ? 'Define a ticket type for your free event.'
                : 'Add details for this ticket type.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitTicketType)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., General Admission, VIP"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a descriptive name for this ticket type.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="e.g., 1000"
                        {...field}
                        disabled={formData.isFree}
                      />
                    </FormControl>
                    <FormDescription>
                      {formData.isFree
                        ? 'This is a free event, so the price is set to 0.'
                        : 'Set the price for this ticket type.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g., 100"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Set the number of tickets available for this type.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Update' : 'Add'} Ticket Type
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              ticket type and remove it from the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicketType}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
