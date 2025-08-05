// src/actions/organizer.actions.ts - Updated version
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createOrganizerUpgradeNotification } from '@/actions/notification.actions';

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

// Get current user's organizer profile - NOW INCLUDES BANK DETAILS
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
      // Include all fields including bank details
      select: {
        id: true,
        organizationName: true,
        bio: true,
        website: true,
        businessRegistrationNumber: true,
        taxIdentificationNumber: true,
        organizationType: true,
        verificationStatus: true,
        customPlatformFee: true,
        bankAccount: true,
        bankCode: true,
        accountName: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
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

// Create or update organizer profile with notification system
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

    const isNewProfile = !existingProfile;
    let profile;

    if (existingProfile) {
      // Update existing profile - preserve bank details
      profile = await prisma.organizerProfile.update({
        where: { userId: session.user.id },
        data: {
          organizationName: data.organizationName,
          bio: data.bio,
          website: data.website,
          // Don't update bank details here - they're handled separately
        },
      });
    } else {
      // Use transaction to ensure consistency for new profile creation
      const result = await prisma.$transaction(async (tx) => {
        // Create new profile
        const newProfile = await tx.organizerProfile.create({
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
          await tx.user.update({
            where: { id: session.user.id },
            data: {
              subRole: 'ORGANIZER',
            },
          });
        }

        return newProfile;
      });

      profile = result;
    }

    // If this is a new profile and user was upgraded to organizer, notify admins
    if (
      isNewProfile &&
      session.user.role === 'USER' &&
      session.user.subRole === 'ORDINARY'
    ) {
      try {
        await createOrganizerUpgradeNotification(session.user.id);
      } catch (notificationError) {
        // Log error but don't fail the profile creation
        console.error(
          'Failed to create organizer upgrade notification:',
          notificationError
        );
      }
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/organizer');
    revalidatePath('/dashboard/create-event');
    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: existingProfile
        ? 'Profile updated successfully'
        : 'Organizer profile created successfully! You can now create events.',
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

// New function to update bank details separately
export async function updateOrganizerBankDetails(
  bankAccount: string,
  bankCode: string,
  accountName: string
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
    // console.log('🔍 Debug: updateOrganizerBankDetails called with:', {
    //   bankAccount,
    //   bankCode,
    //   accountName,
    //   userId: session.user.id,
    // });

    // Check if organizer profile exists
    const existingProfile = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // console.log('🔍 Debug: Existing profile found:', !!existingProfile);

    if (!existingProfile) {
      return {
        success: false,
        message:
          'Organizer profile not found. Please create your profile first.',
      };
    }

    // Update bank details
    const updatedProfile = await prisma.organizerProfile.update({
      where: { userId: session.user.id },
      data: {
        bankAccount,
        bankCode,
        accountName,
      },
    });

    // console.log('✅ Debug: Bank details updated successfully:', {
    //   id: updatedProfile.id,
    //   bankAccount: updatedProfile.bankAccount,
    //   bankCode: updatedProfile.bankCode,
    //   accountName: updatedProfile.accountName,
    // });

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/analytics');

    return {
      success: true,
      message: 'Bank details updated successfully',
      data: updatedProfile,
    };
  } catch (error) {
    console.error('❌ Debug: Error updating bank details:', error);
    return {
      success: false,
      message: 'Failed to update bank details',
    };
  }
}

// Check if user can create events (organizer with profile or admin)
export async function canUserCreateEvents(): Promise<ActionResponse<boolean>> {
  try {
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

    // Admins can always create events
    if (session.user.role === 'ADMIN') {
      return {
        success: true,
        data: true,
      };
    }

    // Check if user is an organizer with a profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subRole: true,
        organizerProfile: true,
      },
    });

    const canCreate = user?.subRole === 'ORGANIZER' && !!user?.organizerProfile;

    return {
      success: true,
      data: canCreate,
    };
  } catch (error) {
    console.error('Error checking user create events permission:', error);
    return {
      success: false,
      message: 'Failed to check permissions',
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
        _count: {
          select: {
            eventsHosted: true,
          },
        },
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

// Get organizer statistics for admin dashboard
export async function getOrganizerStats(): Promise<ActionResponse<any>> {
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
    const [totalOrganizers, newOrganizersThisMonth, activeOrganizers] =
      await Promise.all([
        // Total organizers
        prisma.user.count({
          where: {
            subRole: 'ORGANIZER',
          },
        }),

        // New organizers this month - using User.createdAt since OrganizerProfile doesn't have createdAt
        prisma.user.count({
          where: {
            subRole: 'ORGANIZER',
            organizerProfile: {
              isNot: null, // Ensure they have an organizer profile
            },
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Active organizers (those with at least one event)
        prisma.user.count({
          where: {
            subRole: 'ORGANIZER',
            eventsHosted: {
              some: {},
            },
          },
        }),
      ]);

    return {
      success: true,
      data: {
        totalOrganizers,
        newOrganizersThisMonth,
        activeOrganizers,
        inactiveOrganizers: totalOrganizers - activeOrganizers,
      },
    };
  } catch (error) {
    console.error('Error fetching organizer stats:', error);
    return {
      success: false,
      message: 'Failed to fetch organizer statistics',
    };
  }
}
