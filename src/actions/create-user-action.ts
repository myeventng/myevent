'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { APIError } from 'better-auth/api';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, UserSubRole } from '@/generated/prisma';
import { sendEmailAction } from '@/actions/send-email.action';
import { normalizeName } from '@/lib/utils';

interface CreateUserParams {
  email: string;
  name: string;
  role?: UserRole;
  subRole?: UserSubRole;
  sendInvite?: boolean;
}

export async function createUserAction({
  email,
  name,
  role = 'USER',
  subRole = 'ORDINARY',
  sendInvite = true,
}: CreateUserParams) {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Only ADMIN can create users
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Only admins can create users' };
  }

  // Staff cannot create SUPER_ADMIN
  if (
    session.user.subRole === 'STAFF' &&
    (subRole === 'SUPER_ADMIN' || role === 'ADMIN')
  ) {
    return {
      success: false,
      error: 'Forbidden: Staff cannot create super admin or admin users',
    };
  }

  try {
    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Normalize name
    const normalizedName = normalizeName(name);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        name: normalizedName,
        emailVerified: true, // Admin-created users don't need verification
        role,
        subRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Generate magic link and send invite
    if (sendInvite) {
      try {
        const magicLinkUrl = await auth.api.magicLink.generate({
          email,
          headers: headersList,
          callbackUrl: '/dashboard',
        });

        await sendEmailAction({
          to: email,
          subject: "You've been invited to MyEvent.con.ng",
          meta: {
            description: `${
              session.user.name
            } has invited you to join MyEvent.con.ng as a ${subRole.toLowerCase()}. Click the link below to set up your account.`,
            link: magicLinkUrl,
          },
        });
      } catch (error) {
        console.error('Error sending invite email:', error);
      }
    }

    revalidatePath('/admin/dashboard/users');
    return {
      success: true,
      message: 'User created successfully',
      data: newUser,
      error: null,
    };
  } catch (err) {
    console.error('Error in createUserAction:', err);
    if (err instanceof APIError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Internal Server Error' };
  }
}
