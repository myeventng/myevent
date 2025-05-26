'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface TagInput {
  name: string;
  bgColor: string;
  slug?: string;
}

interface UpdateTagInput extends TagInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Validate if user has permission to modify tags (ADMIN, STAFF, SUPER_ADMIN)
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

export async function getTags(): Promise<ActionResponse<any[]>> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: tags,
    };
  } catch (error) {
    console.error('Error fetching tags:', error);
    return {
      success: false,
      message: 'Failed to fetch tags',
    };
  }
}

export async function getTagById(id: string): Promise<ActionResponse<any>> {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    return {
      success: true,
      data: tag,
    };
  } catch (error) {
    console.error(`Error fetching tag with ID ${id}:`, error);
    return {
      success: false,
      message: 'Failed to fetch tag',
    };
  }
}

export async function createTag(data: TagInput): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if tag already exists
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingTag) {
      return {
        success: false,
        message: `A tag named ${data.name} already exists`,
      };
    }

    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

    // Create new tag
    const newTag = await prisma.tag.create({
      data: {
        name: data.name,
        bgColor: data.bgColor,
        slug,
      },
    });

    revalidatePath('/admin/tags');
    revalidatePath('/admin/dashboard/tags');

    return {
      success: true,
      message: 'Tag created successfully',
      data: newTag,
    };
  } catch (error) {
    console.error('Error creating tag:', error);
    return {
      success: false,
      message: 'Failed to create tag',
    };
  }
}

export async function updateTag(
  data: UpdateTagInput
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if tag exists
    const existingTag = await prisma.tag.findUnique({
      where: { id: data.id },
    });

    if (!existingTag) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    // Check if name is already taken by another tag
    if (data.name !== existingTag.name) {
      const nameExists = await prisma.tag.findFirst({
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
          message: `A tag named ${data.name} already exists`,
        };
      }
    }

    // Generate slug if not provided
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');

    // Update tag
    const updatedTag = await prisma.tag.update({
      where: { id: data.id },
      data: {
        name: data.name,
        bgColor: data.bgColor,
        slug,
      },
    });

    revalidatePath('/admin/tags');
    revalidatePath('/admin/dashboard/tags');

    return {
      success: true,
      message: 'Tag updated successfully',
      data: updatedTag,
    };
  } catch (error) {
    console.error('Error updating tag:', error);
    return {
      success: false,
      message: 'Failed to update tag',
    };
  }
}

export async function deleteTag(id: string): Promise<ActionResponse<null>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission();
  if (!permissionCheck.success) {
    return permissionCheck;
  }

  try {
    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        events: {
          select: { id: true },
        },
      },
    });

    if (!tag) {
      return {
        success: false,
        message: 'Tag not found',
      };
    }

    // Check if tag is associated with events
    if (tag.events.length > 0) {
      return {
        success: false,
        message: 'Cannot delete tag because it is associated with events',
      };
    }

    // Delete tag
    await prisma.tag.delete({
      where: { id },
    });

    revalidatePath('/admin/tags');
    revalidatePath('/admin/dashboard/tags');

    return {
      success: true,
      message: 'Tag deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return {
      success: false,
      message: 'Failed to delete tag',
    };
  }
}
