'use server';

import { z } from 'zod';
import { db } from '@/lib/database';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { CitySchema } from '@/schemas';

export type CityFormValues = z.infer<typeof CitySchema>;

// Middleware to ensure only admins can perform these actions
const adminOnly = async () => {
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    throw new Error(
      'Access denied. Only administrators can perform this action.'
    );
  }
};

// Create City
export const createCity = async (values: CityFormValues) => {
  try {
    // Check if user is admin
    await adminOnly();

    const validatedData = CitySchema.parse(values);
    return await db.city.create({
      data: validatedData,
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    throw new Error(
      error.errors ? error.errors[0].message : 'Error creating city'
    );
  }
};

// Update City
export const updateCity = async (id: string, values: CityFormValues) => {
  try {
    // Check if user is admin
    await adminOnly();

    const validatedData = CitySchema.parse(values);
    return await db.city.update({
      where: { id },
      data: validatedData,
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    throw new Error(
      error.errors ? error.errors[0].message : 'Error updating city'
    );
  }
};

// Delete City
export const deleteCity = async (id: string) => {
  try {
    // Check if user is admin
    await adminOnly();

    return await db.city.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }

    // Check if the city has related records
    if (error.code === 'P2003') {
      return {
        error: 'Cannot delete city because it has related venues or events.',
      };
    }

    throw new Error('Error deleting city');
  }
};

// Get a Single City
export const getCity = async (id: string) => {
  try {
    return await db.city.findUnique({
      where: { id },
    });
  } catch (error: any) {
    throw new Error('Error fetching city');
  }
};

// Get All Cities
export const getAllCities = async () => {
  try {
    return await db.city.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error: any) {
    throw new Error('Error fetching cities');
  }
};
