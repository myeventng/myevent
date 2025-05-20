'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface CityInput {
  name: string;
  state: string;
  population?: number | null;
}

interface UpdateCityInput extends CityInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Validate if user has permission to modify cities (ADMIN, STAFF, SUPER_ADMIN)
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

  if (role !== 'ADMIN' || !['STAFF', 'SUPER_ADMIN'].includes(subRole)) {
    return {
      success: false,
      message: 'You do not have permission to perform this action',
    };
  }

  return { success: true };
};

export async function getCities(): Promise<ActionResponse<any[]>> {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: cities,
    };
  } catch (error) {
    console.error('Error fetching cities:', error);
    return {
      success: false,
      message: 'Failed to fetch cities',
    };
  }
}

export async function getCityById(id: string): Promise<ActionResponse<any>> {
  try {
    const city = await prisma.city.findUnique({
      where: { id },
    });

    if (!city) {
      return {
        success: false,
        message: 'City not found',
      };
    }

    return {
      success: true,
      data: city,
    };
  } catch (error) {
    console.error(`Error fetching city with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch city',
    };
  }
}

export async function createCity(
  data: CityInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if city already exists
    const existingCity = await prisma.city.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCity) {
      return {
        success: false,
        message: `A city named ${data.name} already exists`,
      };
    }

    // Create new city
    const newCity = await prisma.city.create({
      data: {
        name: data.name,
        state: data.state,
        population: data.population,
      },
    });

    revalidatePath('/admin/cities');

    return {
      success: true,
      message: 'City created successfully',
      data: newCity,
    };
  } catch (error) {
    console.error('Error creating city:', error);
    return {
      success: false,
      message: 'Failed to create city',
    };
  }
}

export async function updateCity(
  data: UpdateCityInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if city exists
    const existingCity = await prisma.city.findUnique({
      where: { id: data.id },
    });

    if (!existingCity) {
      return {
        success: false,
        message: 'City not found',
      };
    }

    // Check if name is already taken by another city
    if (data.name !== existingCity.name) {
      const nameExists = await prisma.city.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
          id: {
            not: data.id,
          },
        },
      });

      if (nameExists) {
        return {
          success: false,
          message: `A city named ${data.name} already exists`,
        };
      }
    }

    // Update city
    const updatedCity = await prisma.city.update({
      where: { id: data.id },
      data: {
        name: data.name,
        state: data.state,
        population: data.population,
      },
    });

    revalidatePath('/admin/cities');
    revalidatePath('/admin/venues');

    return {
      success: true,
      message: 'City updated successfully',
      data: updatedCity,
    };
  } catch (error) {
    console.error('Error updating city:', error);
    return {
      success: false,
      message: 'Failed to update city',
    };
  }
}

export async function deleteCity(id: string): Promise<ActionResponse<null>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if city exists
    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        venues: {
          select: { id: true },
        },
        events: {
          select: { id: true },
        },
      },
    });

    if (!city) {
      return {
        success: false,
        message: 'City not found',
      };
    }

    // Check if city is associated with venues or events
    if (city.venues.length > 0 || city.events.length > 0) {
      return {
        success: false,
        message:
          'Cannot delete city because it is associated with venues or events',
      };
    }

    // Delete city
    await prisma.city.delete({
      where: { id },
    });

    revalidatePath('/admin/cities');
    revalidatePath('/admin/venues');

    return {
      success: true,
      message: 'City deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting city:', error);
    return {
      success: false,
      message: 'Failed to delete city',
    };
  }
}
