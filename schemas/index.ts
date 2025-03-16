import * as z from 'zod';
import { Role } from '@prisma/client';

export const CitySchema = z.object({
  name: z
    .string()
    .min(3, { message: 'City name must be at least 3 characters.' }),
  state: z
    .string()
    .min(3, { message: 'State name must be at least 3 characters.' }),
  population: z.optional(z.number()),
});

export const VenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  address: z.string().min(1, 'Address is required'),
  cityId: z.string().min(1, 'City is required'),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .nonnegative('Capacity cannot be negative')
    .optional()
    .default(0),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  latitude: z.string().min(1, 'Latitude is required'),
  longitude: z.string().min(1, 'Longitude is required'),
});

// Export types
export type VenueFormValues = z.infer<typeof VenueSchema>;

export const EventSchema = z.object({
  title: z.string().min(6, 'Title must be at least 6 characters'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(400, 'Description must be less than 400 characters')
    .optional(),
  location: z
    .string()
    .min(3, 'Location must be at least 3 characters')
    .max(400, 'Location must be less than 400 characters')
    .optional(),
  cityId: z.string().optional(),
  imageUrls: z
    .array(z.string().url('Invalid image URL'))
    .min(1, 'At least one image is required')
    .max(10, 'Cannot upload more than 10 images'),
  coverImageUrl: z.string().url('Invalid cover image URL').optional(),
  startDateTime: z.date(),
  endDateTime: z.date(),
  isFree: z.boolean(),
  url: z.string().url('Invalid URL format').optional(),
  categoryId: z.string().optional(),
  userId: z.string().optional(),
  venueId: z.string(),
  tags: z.array(z.string()).optional(),
  attendeeLimit: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  embeddedVideoUrl: z.string().url('Invalid video URL').optional(),
  isCancelled: z.boolean().optional(),
  publishedStatus: z.enum(['DRAFT', 'PENDING_REVIEW']).optional(),
});

export const SettingsSchema = z
  .object({
    name: z.optional(z.string()),
    isTwoFactorEnabled: z.optional(z.boolean()),
    role: z.enum([Role.ADMIN, Role.USER, Role.ORGANIZER]),
    email: z.optional(z.string().email()),
    password: z.optional(z.string().min(6)),
    newPassword: z.optional(z.string().min(6)),
  })
  .refine(
    (data) => {
      if (data.password && !data.newPassword) {
        return false;
      }

      return true;
    },
    {
      message: 'New password is required!',
      path: ['newPassword'],
    }
  )
  .refine(
    (data) => {
      if (data.newPassword && !data.password) {
        return false;
      }

      return true;
    },
    {
      message: 'Password is required!',
      path: ['password'],
    }
  );

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Email is required' }),
  password: z.string().min(1, {
    message: 'Password is required',
  }),
  code: z.optional(z.string()),
});

export const RegisterSchema = z
  .object({
    name: z.string().min(1, { message: 'full name is required' }),
    email: z.string().email({ message: 'Valid email is required' }),
    gender: z.enum(['Male', 'Female'], { message: 'Gender is required' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z
      .string()
      .min(6, { message: 'Confirm password is required' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

export const ResetSchema = z.object({
  email: z.string().email({ message: 'Email is required' }),
});

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(7, { message: 'Password must be at least 7 characters' }),
    confirmPassword: z.string().min(7, {
      message: 'Confirm Password must be at least 7 characters',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

// category schema
export const CategorySchema = z.object({
  name: z
    .string()
    .min(3, { message: 'Category name must be at least 3 characters' })
    .max(50, { message: 'Category name must be less than 50 characters' })
    .trim(),
});
