'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { deleteVenue } from '@/actions/venue-actions';
import { Venue } from '@/generated/prisma';
import { toast } from 'sonner';
import { VenueWithCity, VenueWithCityAndUser } from '@/types';

interface DeleteVenueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  venue: VenueWithCity | VenueWithCityAndUser;
  onVenueDeleted: (venueId: string) => void;
}

export const DeleteVenueDialog = ({
  isOpen,
  onClose,
  venue,
  onVenueDeleted,
}: DeleteVenueDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteVenue(venue.id);

      if (response.success) {
        toast.success('Venue deleted successfully');
        onVenueDeleted(venue.id);
        onClose();
      } else {
        toast.error(response.message || 'Failed to delete venue');
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will permanently delete{' '}
            <span className="font-semibold">{venue.name}</span>. This action
            cannot be undone.
            <br />
            <br />
            <span className="text-destructive font-medium">
              Note: Deleting this venue will affect all events associated with
              it.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
