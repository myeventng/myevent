'use server';

import { CreateCategoryParams } from '@/types';
import { handleError } from '../utils';
import { connectToDatabase } from '../database';
import Category from '../database/models/category.model';
import { revalidatePath } from 'next/cache';

export const createCategory = async ({
  categoryName,
}: {
  categoryName: string;
}) => {
  try {
    await connectToDatabase();

    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    const newCategory = await Category.create({ name: categoryName });
    revalidatePath('/categories');

    return JSON.parse(JSON.stringify(newCategory));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to create category');
  }
};

export const deleteCategory = async ({
  categoryId,
}: {
  categoryId: string;
}) => {
  try {
    await connectToDatabase();

    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      throw new Error('Category not found');
    }

    revalidatePath('/categories');
    return JSON.parse(JSON.stringify(deletedCategory));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to delete category');
  }
};

export const updateCategory = async ({
  categoryId,
  updatedData,
}: {
  categoryId: string;
  updatedData: { name: string };
}) => {
  try {
    await connectToDatabase();
    const existingCategory = await Category.findOne({
      name: updatedData.name,
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { ...updatedData },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      throw new Error('Category not found');
    }

    revalidatePath('/categories');
    return JSON.parse(JSON.stringify(updatedCategory));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to update category');
  }
};

export const getAllCategories = async () => {
  try {
    await connectToDatabase();

    const categories = await Category.find();

    if (!categories) {
      throw new Error('Failed to fetch categories');
    }

    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to fetch categories');
  }
};
