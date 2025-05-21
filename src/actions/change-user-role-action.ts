'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { APIError } from 'better-auth/api';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, UserSubRole } from '@/generated/prisma';

interface ChangeUserRoleParams {
  userId: string;
  role?: UserRole;
  subRole?: UserSubRole;
}

export async function changeUserRoleAction({
  userId,
  role,
  subRole,
}: ChangeUserRoleParams) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN can change roles
  if (session.user.role !== 'ADMIN') {
    return {
      success: false,
      error: 'Forbidden: Only admins can change user roles',
    };
  }

  // Staff cannot promote to SUPER_ADMIN
  if (session.user.subRole === 'STAFF' && subRole === 'SUPER_ADMIN') {
    return {
      success: false,
      error: 'Forbidden: Staff cannot promote to SUPER_ADMIN',
    };
  }

  try {
    // Cannot change role of SUPER_ADMIN unless you're a SUPER_ADMIN yourself
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subRole: true },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Staff cannot modify SUPER_ADMIN
    if (
      session.user.subRole === 'STAFF' &&
      targetUser.subRole === 'SUPER_ADMIN'
    ) {
      return {
        success: false,
        error: 'Forbidden: Staff cannot modify SUPER_ADMIN roles',
      };
    }

    // Staff cannot modify another STAFF
    if (
      session.user.subRole === 'STAFF' &&
      targetUser.subRole === 'STAFF' &&
      session.user.id !== userId // Unless they're modifying themselves (which is still limited)
    ) {
      return {
        success: false,
        error: 'Forbidden: Staff cannot modify other staff roles',
      };
    }

    // Update user with new role/subRole
    const updateData: any = {};
    if (role) updateData.role = role;
    if (subRole) updateData.subRole = subRole;

    // Execute the update
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message: 'User role updated successfully',
      error: null,
    };
  } catch (err) {
    console.error('Error in changeUserRoleAction:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Internal Server Error' };
  }
}
