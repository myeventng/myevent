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

export const LocationSchema = z.object({
  latitude: z.number().or(z.string().transform((val) => parseFloat(val))),
  longitude: z.number().or(z.string().transform((val) => parseFloat(val))),
  placeName: z.string().optional(),
});

// Schema for venue validation
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
  location: LocationSchema.optional(),
});

// Export types
export type VenueFormValues = z.infer<typeof VenueSchema>;
export type LocationFormValues = z.infer<typeof LocationSchema>;

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
