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
import { deleteCity } from '@/actions/city-actions';
import { City } from '@/generated/prisma';
import { toast } from 'sonner';

interface DeleteCityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  city: City;
  onCityDeleted: (cityId: string) => void;
}

export const DeleteCityDialog = ({
  isOpen,
  onClose,
  city,
  onCityDeleted,
}: DeleteCityDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteCity(city.id);

      if (response.success) {
        toast.success('City deleted successfully');
        onCityDeleted(city.id);
        onClose();
      } else {
        toast.error(response.message || 'Failed to delete city');
      }
    } catch (error) {
      console.error('Error deleting city:', error);
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
            <span className="font-semibold">{city.name}</span>. This action
            cannot be undone.
            <br />
            <br />
            <span className="text-destructive font-medium">
              Note: Deleting this city will affect all venues and events
              associated with it.
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
