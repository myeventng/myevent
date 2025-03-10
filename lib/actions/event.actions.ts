'use server';

import { z } from 'zod';
import { db } from '@/lib/database';
import { currentRole, currentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { EventSchema } from '@/schemas';

export type EventFormValues = z.infer<typeof EventSchema>;

// Middleware to ensure only admins or organizers can perform these actions
const organizerOrAdminOnly = async () => {
  const role = await currentRole();

  if (role !== Role.ADMIN && role !== Role.ORGANIZER) {
    throw new Error(
      'Access denied. Only administrators or organizers can perform this action.'
    );
  }
};

//create event
export const createEvent = async (values: EventFormValues) => {
  try {
    await organizerOrAdminOnly();

    const user = await currentUser();
    if (!user || !user.id) {
      throw new Error('User not found');
    }

    const validatedData = EventSchema.parse(values);

    const event = await db.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        cityId: validatedData.cityId,
        imageUrl: validatedData.imageUrl,
        coverImageUrl: validatedData.coverImageUrl,
        startDateTime: validatedData.startDateTime,
        endDateTime: validatedData.endDateTime,
        isFree: validatedData.isFree,
        url: validatedData.url,
        categoryId: validatedData.categoryId,
        userId: validatedData.userId || user.id,
        venueId: validatedData.venueId,
        tags: { connect: validatedData.tags?.map((tagId) => ({ id: tagId })) },
        attendeeLimit: validatedData.attendeeLimit,
        featured: validatedData.featured,
        embeddedVideoUrl: validatedData.embeddedVideoUrl,
        isCancelled: validatedData.isCancelled,
        publishedStatus: validatedData.publishedStatus || 'DRAFT',
      },
    });
    console.log('Event created successfully:', event);
    return event;
  } catch (error) {
    console.error('Error in createEvent:', error);
    throw error;
  }
};

export const updateEvent = async (id: string, values: EventFormValues) => {
  try {
    await organizerOrAdminOnly();

    const user = await currentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Get the event
    const event = await db.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if user is admin or the event owner
    const role = await currentRole();
    if (role !== Role.ADMIN && event.userId !== user.id) {
      throw new Error('Access denied. You can only update events you created.');
    }

    const validatedData = EventSchema.parse(values);

    const updatedEvent = await db.event.update({
      where: { id },
      data: {
        description: validatedData.description,
        location: validatedData.location,
        cityId: validatedData.cityId,
        imageUrl: validatedData.imageUrl,
        coverImageUrl: validatedData.coverImageUrl,
        startDateTime: validatedData.startDateTime,
        endDateTime: validatedData.endDateTime,
        isFree: validatedData.isFree,
        url: validatedData.url,
        categoryId: validatedData.categoryId,
        userId: validatedData.userId || user.id,
        venueId: validatedData.venueId,
        tags: {
          connect: validatedData.tags?.map((tagId) => ({ id: tagId })),
        },
        attendeeLimit: validatedData.attendeeLimit,
        featured: validatedData.featured,
        embeddedVideoUrl: validatedData.embeddedVideoUrl,
        isCancelled: validatedData.isCancelled,
        publishedStatus: validatedData.publishedStatus || 'DRAFT',
      },
    });
    return updatedEvent;
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    throw new Error(
      error.errors ? error.errors[0].message : 'Error updating event'
    );
  }
};

// Delete Event
export const deleteEvent = async (id: string) => {
  try {
    // Check if user is admin or organizer
    await organizerOrAdminOnly();

    // Get current user
    const user = await currentUser();
    if (!user) {
      throw new Error('User not found');
    }

    // Get the event
    const event = await db.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if user is admin or the event owner
    const role = await currentRole();
    if (role !== Role.ADMIN && event.userId !== user.id) {
      throw new Error('Access denied. You can only delete Events you created.');
    }

    return await db.event.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }

    // Check if the event has related records
    if (error.code === 'P2003') {
      return { error: 'Cannot delete event because it has related events.' };
    }

    throw new Error('Error deleting event');
  }
};

export const getEvent = async (id: string) => {
  try {
    return await db.event.findUnique({
      where: { id },
      include: {
        venue: true,
      },
    });
  } catch (error: any) {
    throw new Error('Error fetching venue');
  }
};

// Get All Event
// export const getAllEvents = async () => {
//   try {
//     return await db.venue.findMany({
//       where,
//       include: {
//         venue: true,
//       },
//       orderBy: { name: 'asc' },
//     });
//   } catch (error: any) {
//     throw new Error('Error fetching venues');
//   }
// };

export const getAllVenuesForDropdown = async () => {
  try {
    return await db.venue.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Error fetching cities');
  }
};
