'use server';

import { db } from '@/lib/database';
import slugify from 'slugify';

const getRandomColor = () => {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-red-100 text-red-800',
    'bg-yellow-100 text-yellow-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800',
    'bg-orange-100 text-orange-800',
    'bg-cyan-100 text-cyan-800',
    'bg-gray-100 text-gray-800',
    'bg-lime-100 text-lime-800',
    'bg-emerald-100 text-emerald-800',
    'bg-rose-100 text-rose-800',
    'bg-fuchsia-100 text-fuchsia-800',
    'bg-sky-100 text-sky-800',
    'bg-amber-100 text-amber-800',
    'bg-violet-100 text-violet-800',
    'bg-emerald-100 text-emerald-800',
    'bg-stone-100 text-stone-800',
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
