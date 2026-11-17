'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface CategoryInput {
  name: string;
  /** Major category this category sits under (Clubbing, Comedy, ...). Empty clears it. */
  majorCategoryId?: string | null;
}

interface UpdateCategoryInput extends CategoryInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Validate if user has permission to modify category (ADMIN, STAFF, SUPER_ADMIN)
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

const MAJOR_SELECT = { select: { id: true, name: true, slug: true } } as const;

/** The fixed list of major categories, in display order. */
export async function getMajorCategories(): Promise<ActionResponse<any[]>> {
  try {
    const majors = await prisma.majorCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { success: true, data: majors };
  } catch (error) {
    console.error('Error fetching major categories:', error);
    return { success: false, message: 'Failed to fetch major categories' };
  }
}

export async function getCategories(): Promise<ActionResponse<any[]>> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { majorCategory: MAJOR_SELECT },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      message: 'Failed to fetch categories',
    };
  }
}

export async function getCategoryById(
  id: string
): Promise<ActionResponse<any>> {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
      };
    }

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error(`Error fetching category with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch category',
    };
  }
}

export async function createCategory(
  data: CategoryInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      return {
        success: false,
        message: `A category named ${data.name} already exists`,
      };
    }

    // Create new category
    const newCategory = await prisma.category.create({
      data: {
        name: data.name,
        majorCategoryId: data.majorCategoryId || null,
      },
      include: { majorCategory: MAJOR_SELECT },
    });

    revalidatePath('/admin/categories');

    return {
      success: true,
      message: 'Category created successfully',
      data: newCategory,
    };
  } catch (error) {
    console.error('Error creating category:', error);
    return {
      success: false,
      message: 'Failed to create category',
    };
  }
}

export async function updateCategory(
  data: UpdateCategoryInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: data.id },
    });

    if (!existingCategory) {
      return {
        success: false,
        message: 'Category not found',
      };
    }

    // Check if name is already taken by another category
    if (data.name !== existingCategory.name) {
      const nameExists = await prisma.category.findFirst({
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
          message: `A category named ${data.name} already exists`,
        };
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        majorCategoryId: data.majorCategoryId || null,
      },
      include: { majorCategory: MAJOR_SELECT },
    });

    revalidatePath('/admin/categories');

    return {
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return {
      success: false,
      message: 'Failed to update category',
    };
  }
}

export async function deleteCategory(
  id: string
): Promise<ActionResponse<null>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        events: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: 'Category not found',
      };
    }

    // Check if category is associated with venues or events
    if (category.events.length > 0) {
      return {
        success: false,
        message: 'Cannot delete category because it is associated with events',
      };
    }

    // Delete category
    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/admin/categories');

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting category:', error);
    return {
      success: false,
      message: 'Failed to delete category',
    };
  }
}
