'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { banUserAction } from '@/actions/ban-user-action';
import { toast } from 'sonner';

interface UnbanUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    banned?: boolean;
    banReason?: string | null;
  };
}

export function UnbanUserDialog({
  isOpen,
  onClose,
  user,
}: UnbanUserDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await banUserAction({
        userId: user.id,
        banReason: '', // Not needed for unban
        isBan: false, // Set to false for unban
      });

      if (response.success) {
        toast.success(response.message || 'User unbanned successfully');
        router.refresh();
        onClose();
      } else {
        toast.error(response.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Unban User</DialogTitle>
          <DialogDescription>
            Are you sure you want to unban {user.name}? This will restore their
            access to the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {user.banReason && (
            <div className="bg-muted p-3 rounded-md mb-4">
              <p className="text-sm font-medium">Current ban reason:</p>
              <p className="text-sm">{user.banReason}</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Unbanning...' : 'Unban User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
