'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface OrganizerProfileInput {
  organizationName: string;
  bio?: string;
  website?: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Get current user's organizer profile
export async function getUserOrganizerProfile(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  try {
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // If profile doesn't exist, return empty data but success true
    if (!organizerProfile) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: organizerProfile,
    };
  } catch (error) {
    console.error('Error fetching organizer profile:', error);
    return {
      success: false,
      message: 'Failed to fetch organizer profile',
    };
  }
}

// Create or update organizer profile// Create or update organizer profile
export async function saveOrganizerProfile(
  data: OrganizerProfileInput
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: 'Not authenticated',
    };
  }

  try {
    // Check if profile already exists
    const existingProfile = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });

    let profile;

    if (existingProfile) {
      // Update existing profile
      profile = await prisma.organizerProfile.update({
        where: { userId: session.user.id },
        data: {
          organizationName: data.organizationName,
          bio: data.bio,
          website: data.website,
        },
      });
    } else {
      // Create new profile
      profile = await prisma.organizerProfile.create({
        data: {
          organizationName: data.organizationName,
          bio: data.bio,
          website: data.website,
          user: { connect: { id: session.user.id } },
        },
      });

      // Only update user subrole to ORGANIZER if they are a regular USER with ORDINARY subRole
      // Don't change subRole for ADMIN users with STAFF or SUPER_ADMIN privileges
      const shouldUpdateSubRole =
        session.user.role === 'USER' && session.user.subRole === 'ORDINARY';

      if (shouldUpdateSubRole) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            subRole: 'ORGANIZER',
          },
        });
      }
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/organizer');

    return {
      success: true,
      message: existingProfile
        ? 'Profile updated successfully'
        : 'Organizer profile created successfully',
      data: profile,
    };
  } catch (error) {
    console.error('Error saving organizer profile:', error);
    return {
      success: false,
      message: 'Failed to save organizer profile',
    };
  }
}

// Admin function to get all organizers
export async function getOrganizers(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Not authorized',
    };
  }

  try {
    const organizers = await prisma.user.findMany({
      where: {
        subRole: 'ORGANIZER',
      },
      include: {
        organizerProfile: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: organizers,
    };
  } catch (error) {
    console.error('Error fetching organizers:', error);
    return {
      success: false,
      message: 'Failed to fetch organizers',
    };
  }
}
