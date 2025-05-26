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
import { deleteTag } from '@/actions/tag.actions';
import { Tag } from '@/generated/prisma';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface DeleteTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag;
  onTagDeleted: (tagId: string) => void;
}

export const DeleteTagDialog = ({
  isOpen,
  onClose,
  tag,
  onTagDeleted,
}: DeleteTagDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteTag(tag.id);

      if (response.success) {
        toast.success('Tag deleted successfully');
        onTagDeleted(tag.id);
        onClose();
      } else {
        toast.error(response.message || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
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
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This action will permanently delete the tag{' '}
                <Badge
                  style={{
                    backgroundColor: tag.bgColor,
                    color: 'white',
                  }}
                  className="mx-1"
                >
                  {tag.name}
                </Badge>
                . This action cannot be undone.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-amber-800 text-sm font-medium">
                  ⚠️ Important Notes:
                </p>
                <ul className="text-amber-700 text-sm mt-1 space-y-1">
                  <li>
                    • This tag will be removed from all events that currently
                    use it
                  </li>
                  <li>
                    • Existing events will not be deleted, only the tag
                    association
                  </li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>
            </div>
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
              'Delete Tag'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
