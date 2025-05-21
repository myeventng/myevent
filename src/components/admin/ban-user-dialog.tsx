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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { banUserAction } from '@/actions/ban-user-action';
import { toast } from 'sonner';
import { DatePicker } from '@/components/layout/date-picker';

interface BanUserDialogProps {
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

export function BanUserDialog({ isOpen, onClose, user }: BanUserDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banReason, setBanReason] = useState(user.banReason || '');
  const [banDuration, setBanDuration] = useState<'permanent' | 'temporary'>(
    'permanent'
  );
  const [banExpiryDate, setBanExpiryDate] = useState<Date | undefined>(
    undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!banReason.trim()) {
      toast.error('Please provide a reason for banning this user');
      return;
    }

    if (banDuration === 'temporary' && !banExpiryDate) {
      toast.error('Please select a ban expiry date');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await banUserAction({
        userId: user.id,
        banReason,
        banExpires: banDuration === 'temporary' ? banExpiryDate : null,
        isBan: true,
      });

      if (response.success) {
        toast.success(response.message || 'User banned successfully');
        router.refresh();
        onClose();
      } else {
        toast.error(response.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            You are about to ban {user.name} ({user.email}). This will prevent
            them from logging in or using the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="banReason">
              Ban Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="banReason"
              placeholder="Explain why you're banning this user..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              required
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Ban Duration</Label>
            <RadioGroup
              value={banDuration}
              onValueChange={(value) =>
                setBanDuration(value as 'permanent' | 'temporary')
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="permanent" id="permanent" />
                <Label htmlFor="permanent" className="cursor-pointer">
                  Permanent Ban
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="temporary" id="temporary" />
                <Label htmlFor="temporary" className="cursor-pointer">
                  Temporary Ban
                </Label>
              </div>
            </RadioGroup>
          </div>

          {banDuration === 'temporary' && (
            <div className="space-y-2">
              <Label htmlFor="banExpiry">Ban Expiry Date</Label>
              <DatePicker
                date={banExpiryDate}
                onSelect={setBanExpiryDate}
                placeholder="Select expiry date"
                disabled={isSubmitting}
              />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
