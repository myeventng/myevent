'use server';

import { z } from 'zod';
import { db } from '@/lib/database';
import { currentRole, currentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { VenueSchema } from '@/schemas';

export type VenueFormValues = z.infer<typeof VenueSchema>;

// Type for the error response
type ErrorResponse = {
  error: string;
};

// Middleware to ensure only admins or organizers can perform these actions
const organizerOrAdminOnly = async () => {
  const role = await currentRole();

  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    throw new Error(
      'Access denied. Only administrators or organizers can perform this action.'
    );
  }
};
// Create Venue
// export const createVenue = async (values: VenueFormValues) => {
//   try {
//     await organizerOrAdminOnly();

//     const user = await currentUser();
//     if (!user || !user.id) {
//       throw new Error('User not found');
//     }

//     const validatedData = VenueSchema.parse(values);

//     return await db.venue.create({
//       data: {
//         ...validatedData,
//         userId: user.id,
//       },
//     });
//   } catch (error: any) {
//     // Fix typo in includes method
//     if (error.message && error.message.includes('Access denied')) {
//       return { error: error.message } as ErrorResponse;
//     }
//     throw new Error(
//       error.errors ? error.errors[0].message : 'Error creating venue'
//     );
//   }
// };

// export const createVenue = async (values: VenueFormValues) => {
//   try {
//     console.log('createVenue called with:', values); // Log input values

//     await organizerOrAdminOnly();

//     const user = await currentUser();
//     if (!user || !user.id) {
//       throw new Error('User not found');
//     }

//     console.log('User found:', user.id);

//     // Your API call logic here
//     const validatedData = VenueSchema.parse(values);

//     return await db.venue.create({
//       data: {
//         ...validatedData,
//         userId: user.id,
//       },
//     });
//   } catch (error) {
//     console.error('Error in createVenue:', error);
//     throw error; // Ensure the error is thrown so it reaches the frontend
//   }
// };

export const createVenue = async (values: VenueFormValues) => {
  try {
    console.log('createVenue called with:', values);

    await organizerOrAdminOnly();

    const user = await currentUser();
    if (!user || !user.id) {
      throw new Error('User not found');
    }

    console.log('User found:', user.id);

    // Ensure location is a valid object or empty JSON
    const formattedLocation = values.location
      ? {
          latitude: Number(values.location.latitude),
          longitude: Number(values.location.longitude),
        }
      : {}; // Empty JSON
    console.log('Formatted location:', formattedLocation);

    const venue = await db.venue.create({
      data: {
        name: values.name,
        address: values.address,
        cityId: values.cityId,
        capacity: values.capacity ?? 0,
        description: values.description || '',
        contactInfo: values.contactInfo || '',
        location: formattedLocation,
        userId: user.id,
      },
    });

    console.log('Venue created successfully:', venue);
    return venue;
  } catch (error) {
    console.error('Error in createVenue:', error);
    throw error;
  }
};

// Update Venue
export const updateVenue = async (id: string, values: VenueFormValues) => {
  try {
    // Check if user is admin or organizer
    await organizerOrAdminOnly();

    // Get current user
    const user = await currentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Get the venue
    const venue = await db.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new Error('Venue not found');
    }

    // Check if user is admin or the venue owner
    const role = await currentRole();
    if (role !== Role.ADMIN && venue.userId !== user.id) {
      throw new Error('Access denied. You can only update venues you created.');
    }

    const validatedData = VenueSchema.parse(values);

    return await db.venue.update({
      where: { id },
      data: validatedData,
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    throw new Error(
      error.errors ? error.errors[0].message : 'Error updating venue'
    );
  }
};

// Delete Venue
export const deleteVenue = async (id: string) => {
  try {
    // Check if user is admin or organizer
    await organizerOrAdminOnly();

    // Get current user
    const user = await currentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Get the venue
    const venue = await db.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new Error('Venue not found');
    }

    // Check if user is admin or the venue owner
    const role = await currentRole();
    if (role !== Role.ADMIN && venue.userId !== user.id) {
      throw new Error('Access denied. You can only delete venues you created.');
    }

    return await db.venue.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }

    // Check if the venue has related records
    if (error.code === 'P2003') {
      return { error: 'Cannot delete venue because it has related events.' };
    }

    throw new Error('Error deleting venue');
  }
};

// Get a Single Venue
export const getVenue = async (id: string) => {
  try {
    // Check if user is admin or organizer
    await organizerOrAdminOnly();

    return await db.venue.findUnique({
      where: { id },
      include: {
        city: true,
      },
    });
  } catch (error: any) {
    throw new Error('Error fetching venue');
  }
};

// Get All Venues
export const getAllVenues = async () => {
  try {
    // Check if user is admin or organizer
    await organizerOrAdminOnly();

    // Get current user and role
    const user = await currentUser();
    const role = await currentRole();

    if (!user) {
      throw new Error('User not found');
    }

    // If admin, show all venues. If organizer, show only their venues
    const where = role === Role.ADMIN ? {} : { userId: user.id };

    return await db.venue.findMany({
      where,
      include: {
        city: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Error fetching venues');
  }
};

// Get All Cities for dropdown
export const getAllCitiesForDropdown = async () => {
  try {
    return await db.city.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Error fetching cities');
  }
};

// Get All Venues for dropdown
export const getAllVenuesForDropdown = async () => {
  try {
    return await db.venue.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Error fetching venues');
  }
};
