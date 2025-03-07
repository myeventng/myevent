'use server';
import { z } from 'zod';
import { db } from '@/lib/database';
import { currentRole } from '@/lib/auth';
import { Role } from '@prisma/client';
import { CategorySchema } from '@/schemas';

export type CategoryFormValues = z.infer<typeof CategorySchema>;

const adminOnly = async () => {
  const role = await currentRole();

  if (role !== Role.ADMIN) {
    throw new Error(
      'Access denied. Only administrators can perform this action.'
    );
  }
};

// Create Category
export const createCategory = async (values: CategoryFormValues) => {
  // console.log('Received values:', values);
  try {
    await adminOnly();
    const validatedData = CategorySchema.parse(values);
    // console.log('Validated data:', validatedData);

    // Add more specific error handling
    if (!validatedData.name) {
      throw new Error('Category name is required');
    }

    return await db.category.create({
      data: validatedData,
    });
  } catch (error: any) {
    // console.error('Full error:', error);

    if (error instanceof z.ZodError) {
      // Handle Zod validation errors specifically
      return { error: error.errors[0]?.message || 'Validation error' };
    }

    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }

    // Log the full error for server-side debugging
    // console.error('Category creation error:', error);

    // Return a more informative error
    return {
      error: error.errors
        ? error.errors[0].message
        : error.message || 'Error creating category',
    };
  }
};

// Update Category
export const updateCategory = async (
  id: string,
  values: CategoryFormValues
) => {
  try {
    await adminOnly();
    const validatedData = CategorySchema.parse(values);
    return await db.category.update({
      where: { id },
      data: validatedData,
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    throw new Error(
      error.errors ? error.errors[0].message : 'Error updating category'
    );
  }
};

// Delete Category
export const deleteCategory = async (id: string) => {
  try {
    await adminOnly();
    return await db.category.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.message.includes('Access denied')) {
      return { error: error.message };
    }
    if (error.code === 'P2003') {
      return {
        error:
          'Cannot delete category because it has related venues or events.',
      };
    }
    throw new Error('Error deleting category');
  }
};

// Get a Single Category
export const getCategory = async (id: string) => {
  try {
    return await db.category.findUnique({
      where: { id },
    });
  } catch (error: any) {
    throw new Error('Error fetching category');
  }
};

// Get All Categories
export const getAllCategories = async () => {
  try {
    const data = await db.category.findMany();
    // console.log(data);

    return data;
  } catch (error: any) {
    throw new Error('Error fetching categories');
  }
};
