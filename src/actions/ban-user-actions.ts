'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { APIError } from 'better-auth/api';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

interface BanUserParams {
  userId: string;
  banReason: string;
  banExpires?: Date | null;
  isBan: boolean; // true for ban, false for unban
}

export async function banUserAction({
  userId,
  banReason,
  banExpires = null,
  isBan = true,
}: BanUserParams) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only SUPER_ADMIN can ban/unban users
  if (
    session.user.role !== 'ADMIN' ||
    session.user.subRole !== 'SUPER_ADMIN' ||
    session.user.id === userId // Can't ban yourself
  ) {
    return {
      success: false,
      error: 'Forbidden: Only SUPER_ADMIN can perform this action',
    };
  }

  try {
    // Cannot ban SUPER_ADMIN or ADMIN (unless you're a SUPER_ADMIN yourself)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, subRole: true },
    });

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Prevent banning other admins
    if (targetUser.role === 'ADMIN' && targetUser.subRole === 'SUPER_ADMIN') {
      return { success: false, error: 'Cannot ban another super admin' };
    }

    // Update user with ban status
    await prisma.user.update({
      where: { id: userId },
      data: {
        banned: isBan, // Set to true for ban, false for unban
        banReason: isBan ? banReason : null,
        banExpires: isBan ? banExpires : null,
      },
    });

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message: isBan
        ? 'User banned successfully'
        : 'User unbanned successfully',
      error: null,
    };
  } catch (err) {
    console.error('Error in banUserAction:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Internal Server Error' };
  }
}
