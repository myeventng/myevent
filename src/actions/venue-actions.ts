'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export interface City {
  id: string;
  name: string;
  state: string;
}

interface VenueInput {
  name: string;
  address: string;
  cityId: string;
  venueImageUrl?: string;
  description?: string;
  contactInfo?: string;
  capacity?: number;
  latitude: string;
  longitude: string;
}

export interface VenueWithCity extends VenueInput {
  city: City;
}

interface UpdateVenueInput extends VenueInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Validate if user has permission to manage venues
const validateUserPermission = async () => {
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

  const { role, subRole } = session.user;

  // For venues, even regular users with "organizer" subRole can create/manage venues
  if (role !== 'ADMIN' && subRole !== 'ORGANIZER') {
    return {
      success: false,
      message: 'You do not have permission to perform this action',
    };
  }

  return {
    success: true,
    data: {
      userId: session.user.id,
      isAdmin: role === 'ADMIN',
    },
  };
};

// Get user's own venues
export async function getUserVenues(): Promise<ActionResponse<any[]>> {
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

    const venues = await prisma.venue.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: venues,
    };
  } catch (error) {
    console.error('Error fetching user venues:', error);
    return {
      success: false,
      message: 'Failed to fetch venues',
    };
  }
}

export async function getVenues(): Promise<ActionResponse<any[]>> {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: venues,
    };
  } catch (error) {
    console.error('Error fetching venues:', error);
    return {
      success: false,
      message: 'Failed to fetch venues',
    };
  }
}

export async function getVenueById(id: string): Promise<ActionResponse<any>> {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!venue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    return {
      success: true,
      data: venue,
    };
  } catch (error) {
    console.error(`Error fetching venue with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch venue',
    };
  }
}

export async function createVenue(
  data: VenueInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;

  try {
    // Check if city exists
    const city = await prisma.city.findUnique({
      where: { id: data.cityId },
    });

    if (!city) {
      return {
        success: false,
        message: 'City not found',
      };
    }

    // Create new venue
    const newVenue = await prisma.venue.create({
      data: {
        name: data.name,
        address: data.address,
        cityId: data.cityId,
        description: data.description,
        venueImageUrl: data.venueImageUrl,
        contactInfo: data.contactInfo,
        capacity: data.capacity,
        latitude: data.latitude,
        longitude: data.longitude,
        userId: userId,
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/admin/venues');
    revalidatePath('/dashboard/venues'); // Also revalidate user dashboard

    return {
      success: true,
      message: 'Venue created successfully',
      data: newVenue,
    };
  } catch (error) {
    console.error('Error creating venue:', error);
    return {
      success: false,
      message: 'Failed to create venue',
    };
  }
}

export async function updateVenue(
  data: UpdateVenueInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;
  const isAdmin = permissionCheck.data!.isAdmin;

  try {
    // Check if venue exists
    const existingVenue = await prisma.venue.findUnique({
      where: { id: data.id },
    });

    if (!existingVenue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    // If not an admin, check if the user owns this venue
    if (!isAdmin && existingVenue.userId !== userId) {
      return {
        success: false,
        message: 'You can only update venues that you created',
      };
    }

    // Check if city exists
    const city = await prisma.city.findUnique({
      where: { id: data.cityId },
    });

    if (!city) {
      return {
        success: false,
        message: 'City not found',
      };
    }

    // Update venue
    const updatedVenue = await prisma.venue.update({
      where: { id: data.id },
      data: {
        name: data.name,
        address: data.address,
        cityId: data.cityId,
        description: data.description,
        venueImageUrl: data.venueImageUrl,
        contactInfo: data.contactInfo,
        capacity: data.capacity,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      include: {
        city: {
          select: {
            id: true,
            name: true,
            state: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/admin/venues');
    revalidatePath('/dashboard/venues'); // Also revalidate user dashboard

    return {
      success: true,
      message: 'Venue updated successfully',
      data: updatedVenue,
    };
  } catch (error) {
    console.error('Error updating venue:', error);
    return {
      success: false,
      message: 'Failed to update venue',
    };
  }
}

export async function deleteVenue(id: string): Promise<ActionResponse<null>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  const userId = permissionCheck.data!.userId;
  const isAdmin = permissionCheck.data!.isAdmin;

  try {
    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        events: {
          select: { id: true },
        },
      },
    });

    if (!venue) {
      return {
        success: false,
        message: 'Venue not found',
      };
    }

    // If not an admin, check if the user owns this venue
    if (!isAdmin && venue.userId !== userId) {
      return {
        success: false,
        message: 'You can only delete venues that you created',
      };
    }

    // Check if venue is associated with events
    if (venue.events.length > 0) {
      return {
        success: false,
        message: 'Cannot delete venue because it is associated with events',
      };
    }

    // Delete venue
    await prisma.venue.delete({
      where: { id },
    });

    revalidatePath('/admin/venues');
    revalidatePath('/dashboard/venues'); // Also revalidate user dashboard

    return {
      success: true,
      message: 'Venue deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting venue:', error);
    return {
      success: false,
      message: 'Failed to delete venue',
    };
  }
}
