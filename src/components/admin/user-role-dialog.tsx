'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { changeUserRoleAction } from '@/actions/change-user-role-action';
import { toast } from 'sonner';
import { UserRole, UserSubRole } from '@/generated/prisma';
import { AuthUser } from '@/lib/auth-utils';

interface UserRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    subRole: UserSubRole;
  };
  currentUser: AuthUser;
}

export function UserRoleDialog({
  isOpen,
  onClose,
  user,
  currentUser,
}: UserRoleDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);
  const [subRole, setSubRole] = useState<UserSubRole>(user.subRole);
  const isCurrentUserSuperAdmin = currentUser.subRole === 'SUPER_ADMIN';
  const isCurrentUserStaff = currentUser.subRole === 'STAFF';
  const isTargetUserSuperAdmin = user.subRole === 'SUPER_ADMIN';
  const isTargetUserAdmin = user.role === 'ADMIN';

  // When role changes, also adjust the subrole to a valid option
  useEffect(() => {
    if (role === 'ADMIN') {
      // If changing to admin, default to STAFF subrole unless already SUPER_ADMIN
      if (subRole !== 'STAFF' && subRole !== 'SUPER_ADMIN') {
        setSubRole('STAFF');
      }
    } else if (role === 'USER') {
      // If changing to user, default to ORDINARY subrole unless already ORGANIZER
      if (subRole !== 'ORDINARY' && subRole !== 'ORGANIZER') {
        setSubRole('ORDINARY');
      }
    }
  }, [role, subRole]);

  // Calculate disabled states
  const disableRoleSelect =
    !isCurrentUserSuperAdmin || // Only super admins can change roles
    isTargetUserSuperAdmin || // Can't change super admin role
    currentUser.id === user.id; // Can't change own role

  const disableSubRoleSelect =
    (!isCurrentUserSuperAdmin && isTargetUserAdmin) || // Staff can't change admin sub-roles
    (isTargetUserSuperAdmin && currentUser.id !== user.id) || // Only self-demotion for super admin
    (isCurrentUserStaff &&
      user.subRole === 'STAFF' &&
      currentUser.id !== user.id); // Staff can't change other staff

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await changeUserRoleAction({
        userId: user.id,
        role,
        subRole,
      });

      if (response.success) {
        toast.success(response.message || 'User role updated successfully');
        router.refresh();
        onClose();
      } else {
        toast.error(response.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage User Role</DialogTitle>
          <DialogDescription>
            Update roles and permissions for {user.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="role">User Role</Label>
            <Select
              disabled={disableRoleSelect}
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
            {disableRoleSelect && (
              <p className="text-xs text-muted-foreground">
                {isTargetUserSuperAdmin
                  ? "Super Admin roles can't be modified"
                  : 'Only Super Admins can modify user roles'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subRole">Sub Role</Label>
            <Select
              disabled={disableSubRoleSelect}
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
                      disabled={!isCurrentUserSuperAdmin && !isCurrentUserStaff}
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
            {disableSubRoleSelect && (
              <p className="text-xs text-muted-foreground">
                {isTargetUserSuperAdmin
                  ? "Super Admin roles can't be modified"
                  : "You don't have permission to modify this user's role"}
              </p>
            )}
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
            <Button
              type="submit"
              disabled={
                isSubmitting || (disableRoleSelect && disableSubRoleSelect)
              }
            >
              {isSubmitting ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
