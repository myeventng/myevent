'use server';

import { db } from '@/lib/database';
import slugify from 'slugify';

const getRandomColor = () => {
  const colors = [
    '#60A5FA', // Darker blue
    '#16A34A', // Darker green
    '#DC2626', // Darker red
    '#CA8A04', // Darker yellow
    '#9333EA', // Darker purple
    '#DB2777', // Darker pink
    '#4F46E5', // Darker indigo
    '#0D9488', // Darker teal
    '#EA580C', // Darker orange
    '#0891B2', // Darker cyan
    '#4B5563', // Darker gray
    '#65A30D', // Darker lime
    '#047857', // Darker emerald
    '#E11D48', // Darker rose
    '#C026D3', // Darker fuchsia
    '#0284C7', // Darker sky
    '#D97706', // Darker amber
    '#7C3AED', // Darker violet
    '#57534E', // Darker stone
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

export const createTag = async (name: string) => {
  try {
    const slug = slugify(name);
    const existingTag = await db.tag.findFirst({ where: { name, slug } });
    if (existingTag) return existingTag;

    const newTag = await db.tag.create({
      data: { name, bgColor: getRandomColor() },
    });
    return newTag;
  } catch (error) {
    console.error('Error creating tag:', error);
    throw new Error('Could not create tag');
  }
};

export const getAllTags = async () => {
  try {
    return await db.tag.findMany();
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
};

export const editTag = async (id: string, name: string) => {
  const slug = slugify(name);
  return await db.tag.update({ where: { id }, data: { name, slug } });
};

export const deleteTag = async (id: string) => {
  return await db.tag.delete({ where: { id } });
};
