// Update your EventTickets component to properly load and handle existing ticket types

'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getTicketTypesWithSalesData } from '@/actions/ticket.actions';

// Enhanced schema for ticket type with validation
const ticketTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  // Additional fields for tracking
  soldCount: z.number().optional(),
  canDelete: z.boolean().optional(),
});

type TicketTypeValues = z.infer<typeof ticketTypeSchema>;

interface EventTicketsProps {
  formData: any;
  ticketTypes: any[];
  setTicketTypes: (ticketTypes: any[], deletedIds?: string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  isEditMode?: boolean;
}

export function EventTickets({
  formData,
  ticketTypes,
  setTicketTypes,
  onNext,
  onPrevious,
  isEditMode = false,
}: EventTicketsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode_Dialog, setIsEditMode_Dialog] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletedTicketTypeIds, setDeletedTicketTypeIds] = useState<string[]>(
    []
  );
  const [isLoadingTicketTypes, setIsLoadingTicketTypes] = useState(false);

  // Initialize ticket types from server if in edit mode and we have an event ID
  useEffect(() => {
    const loadTicketTypesFromServer = async () => {
      if (isEditMode && formData.id && ticketTypes.length === 0) {
        setIsLoadingTicketTypes(true);
        try {
          const result = await getTicketTypesWithSalesData(formData.id);
          if (result.success && result.data) {
            console.log('Loaded ticket types from server:', result.data);
            setTicketTypes(result.data);
          } else {
            console.warn('Failed to load ticket types:', result.message);
          }
        } catch (error) {
          console.error('Error loading ticket types:', error);
          toast.error('Failed to load existing ticket types');
        } finally {
          setIsLoadingTicketTypes(false);
        }
      }
    };

    loadTicketTypesFromServer();
  }, [isEditMode, formData.id, ticketTypes.length]);

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
    if (isEditMode_Dialog && editIndex !== null && ticketTypes[editIndex]) {
      const ticketType = ticketTypes[editIndex];
      form.reset({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: ticketType.quantity,
        soldCount: ticketType.soldCount || 0,
        canDelete: ticketType.canDelete !== false,
      });
    }
  }, [isEditMode_Dialog, editIndex, ticketTypes, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      form.reset({
        name: '',
        price: formData.isFree ? 0 : undefined,
        quantity: undefined,
      });
      setIsEditMode_Dialog(false);
      setEditIndex(null);
    }
  }, [isDialogOpen, formData.isFree, form]);

  // Handle ticket type submission
  const onSubmitTicketType = (values: TicketTypeValues) => {
    try {
      // Generate a temporary ID for new ticket types
      if (!values.id) {
        values.id = `temp-${Date.now()}`;
      }

      // Preserve existing sold count and deletion capability
      const existingTicketType =
        isEditMode_Dialog && editIndex !== null ? ticketTypes[editIndex] : null;

      const enhancedValues = {
        ...values,
        soldCount: existingTicketType?.soldCount || 0,
        canDelete: existingTicketType
          ? existingTicketType.canDelete !== false
          : true,
        // Ensure proper data types
        price: parseFloat(values.price.toString()),
        quantity: parseInt(values.quantity.toString(), 10),
      };

      // Validate minimum quantity for existing ticket types with sold tickets
      if (
        existingTicketType?.soldCount &&
        enhancedValues.quantity < existingTicketType.soldCount
      ) {
        toast.error(
          `Quantity cannot be less than ${existingTicketType.soldCount} (already sold)`
        );
        return;
      }

      if (isEditMode_Dialog && editIndex !== null) {
        // Update existing ticket type
        const updatedTicketTypes = [...ticketTypes];
        updatedTicketTypes[editIndex] = enhancedValues;
        setTicketTypes(updatedTicketTypes, deletedTicketTypeIds);
        toast.success('Ticket type updated successfully');
      } else {
        // Add new ticket type
        const newTicketTypes = [...ticketTypes, enhancedValues];
        setTicketTypes(newTicketTypes, deletedTicketTypeIds);
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
      const ticketTypeToDelete = ticketTypes[deleteIndex];

      // Check if ticket type can be deleted
      if (isEditMode && ticketTypeToDelete.soldCount > 0) {
        toast.error('Cannot delete ticket type with sold tickets');
        setIsDeleteDialogOpen(false);
        setDeleteIndex(null);
        return;
      }

      const updatedTicketTypes = [...ticketTypes];
      const deletedTicketType = updatedTicketTypes.splice(deleteIndex, 1)[0];

      // Track deleted ticket type IDs for database deletion
      if (deletedTicketType.id && !deletedTicketType.id.startsWith('temp-')) {
        setDeletedTicketTypeIds((prev) => [...prev, deletedTicketType.id]);
      }

      setTicketTypes(
        updatedTicketTypes,
        [...deletedTicketTypeIds, deletedTicketType.id].filter(
          (id) => id && !id.startsWith('temp-')
        )
      );
      setIsDeleteDialogOpen(false);
      setDeleteIndex(null);
      toast.success('Ticket type removed');
    }
  };

  // Check if we can proceed to the next step
  const canProceed = () => {
    // Free events still need at least one ticket type for tracking attendees
    return ticketTypes.length > 0 && !isLoadingTicketTypes;
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Check if ticket type can be deleted
  const canDeleteTicketType = (ticketType: any) => {
    if (!isEditMode) return true;
    return !(ticketType.soldCount > 0);
  };

  // Get warning message for ticket type
  const getTicketTypeWarning = (ticketType: any) => {
    if (!isEditMode) return null;
    if (ticketType.soldCount > 0) {
      return `${ticketType.soldCount} ticket${ticketType.soldCount === 1 ? '' : 's'} sold`;
    }
    return null;
  };

  // Loading state
  if (isLoadingTicketTypes) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Event Tickets</h2>
          <p className="text-muted-foreground">
            Loading existing ticket types...
          </p>
        </div>

        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading ticket types...</span>
        </div>

        {/* Navigation buttons - disabled while loading */}
        <div className="flex justify-between mt-8">
          <Button type="button" variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <Button disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Tickets</h2>
        <p className="text-muted-foreground">
          {isEditMode
            ? 'Manage ticket types for your event. Changes will be saved when you update the event.'
            : 'Define ticket types for your event.'}
          {formData.isFree && (
            <span className="ml-1 text-primary font-medium">
              This is a free event, but you still need to create ticket types
              for tracking attendance.
            </span>
          )}
          {isEditMode && (
            <span className="block mt-1 text-amber-600 text-sm">
              Warning: Ticket types with sold tickets cannot be deleted. You can
              only modify their quantity or price. Changes will be saved when
              you submit the form.
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
            {ticketTypes.map((ticketType, index) => {
              const warning = getTicketTypeWarning(ticketType);
              const canDelete = canDeleteTicketType(ticketType);
              const isNewTicketType = ticketType.id?.startsWith('temp-');

              return (
                <Card
                  key={ticketType.id}
                  className={warning ? 'border-amber-200' : ''}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {ticketType.name}
                          {warning && (
                            <Badge variant="secondary" className="text-xs">
                              {warning}
                            </Badge>
                          )}
                          {isNewTicketType && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-600"
                            >
                              New
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {formData.isFree
                            ? 'Free Admission'
                            : formatPrice(ticketType.price)}
                        </CardDescription>
                      </div>
                      {!canDelete && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Available: {ticketType.quantity}{' '}
                        {ticketType.quantity === 1 ? 'ticket' : 'tickets'}
                      </p>
                      {isEditMode && ticketType.soldCount > 0 && (
                        <p className="text-sm text-amber-600">
                          Sold: {ticketType.soldCount}{' '}
                          {ticketType.soldCount === 1 ? 'ticket' : 'tickets'}
                        </p>
                      )}
                      {isEditMode && !canDelete && (
                        <p className="text-xs text-amber-600">
                          Cannot delete - has sold tickets
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode_Dialog(true);
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
                      disabled={!canDelete}
                      onClick={() => {
                        if (canDelete) {
                          setDeleteIndex(index);
                          setIsDeleteDialogOpen(true);
                        } else {
                          toast.error(
                            'Cannot delete ticket type with sold tickets'
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <Button
          onClick={() => {
            setIsEditMode_Dialog(false);
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
          {!canProceed() && ticketTypes.length === 0
            ? 'Add at least one ticket type'
            : 'Next'}
        </Button>
      </div>

      {/* Add/Edit Ticket Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode_Dialog ? 'Edit Ticket Type' : 'Add Ticket Type'}
            </DialogTitle>
            <DialogDescription>
              {formData.isFree
                ? 'Define a ticket type for your free event.'
                : 'Add details for this ticket type.'}
              {isEditMode_Dialog &&
                editIndex !== null &&
                ticketTypes[editIndex]?.soldCount > 0 && (
                  <span className="block mt-2 text-amber-600 text-sm">
                    Note: This ticket type has{' '}
                    {ticketTypes[editIndex].soldCount} sold tickets. Changes to
                    price will only affect new purchases. Quantity cannot be
                    less than sold tickets.
                  </span>
                )}
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
                    <FormLabel>Price (₦)</FormLabel>
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
                        : isEditMode_Dialog &&
                            editIndex !== null &&
                            ticketTypes[editIndex]?.soldCount > 0
                          ? 'Price changes will only affect new ticket purchases.'
                          : 'Set the price for this ticket type in Nigerian Naira.'}
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
                        min={
                          isEditMode_Dialog && editIndex !== null
                            ? ticketTypes[editIndex]?.soldCount || 1
                            : 1
                        }
                        placeholder="e.g., 100"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditMode_Dialog &&
                      editIndex !== null &&
                      ticketTypes[editIndex]?.soldCount > 0
                        ? `Minimum quantity: ${ticketTypes[editIndex].soldCount} (already sold)`
                        : 'Set the number of tickets available for this type.'}
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
                  {isEditMode_Dialog ? 'Update' : 'Add'} Ticket Type
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
              {deleteIndex !== null &&
                ticketTypes[deleteIndex]?.soldCount > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    This ticket type has sold tickets and cannot be deleted.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTicketType}
              disabled={
                deleteIndex !== null && ticketTypes[deleteIndex]?.soldCount > 0
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
