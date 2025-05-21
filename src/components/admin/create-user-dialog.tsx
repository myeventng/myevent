'use client';
import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createUserAction } from '@/actions/create-user-action';
import { toast } from 'sonner';
import { UserRole, UserSubRole } from '@/generated/prisma';
import { AuthUser } from '@/lib/auth-utils';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
}

export function CreateUserDialog({
  isOpen,
  onClose,
  currentUser,
}: CreateUserDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('USER');
  const [subRole, setSubRole] = useState<UserSubRole>('ORDINARY');
  const [sendInvite, setSendInvite] = useState(true);
  const isCurrentUserSuperAdmin = currentUser.subRole === 'SUPER_ADMIN';
  const isCurrentUserStaff = currentUser.subRole === 'STAFF';

  // When role changes, also adjust the subrole to a valid option
  useEffect(() => {
    if (role === 'ADMIN') {
      // If admin role is selected, default to STAFF subrole
      setSubRole('STAFF');
    } else if (role === 'USER') {
      // If user role is selected, default to ORDINARY subrole
      setSubRole('ORDINARY');
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createUserAction({
        name,
        email,
        role,
        subRole,
        sendInvite,
      });

      if (response.success) {
        toast.success(response.message || 'User created successfully');
        router.refresh();
        onClose();

        // Reset form
        setName('');
        setEmail('');
        setRole('USER');
        setSubRole('ORDINARY');
        setSendInvite(true);
      } else {
        toast.error(response.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user and optionally send them an invitation email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select
                disabled={!isCurrentUserSuperAdmin}
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">USER</SelectItem>
                  {isCurrentUserSuperAdmin && (
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!isCurrentUserSuperAdmin && (
                <p className="text-xs text-muted-foreground">
                  Only Super Admins can create admin users
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subRole">Sub Role</Label>
              <Select
                value={subRole}
                onValueChange={(value) => setSubRole(value as UserSubRole)}
              >
                <SelectTrigger id="subRole">
                  <SelectValue placeholder="Select sub role" />
                </SelectTrigger>
                <SelectContent>
                  {/* Filter subrole options based on selected role */}
                  {role === 'USER' ? (
                    <>
                      <SelectItem value="ORDINARY">ORDINARY</SelectItem>
                      <SelectItem value="ORGANIZER">ORGANIZER</SelectItem>
                    </>
                  ) : (
                    <>
                      {/* Admin subroles */}
                      <SelectItem
                        value="STAFF"
                        disabled={!isCurrentUserSuperAdmin}
                      >
                        STAFF
                      </SelectItem>

                      <SelectItem
                        value="SUPER_ADMIN"
                        disabled={!isCurrentUserSuperAdmin}
                      >
                        SUPER_ADMIN
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={setSendInvite}
            />
            <Label htmlFor="sendInvite" className="cursor-pointer">
              Send invitation email
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
