import * as z from 'zod';

export const eventFormSchema = z.object({
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
  city: z.string().optional(),
  imageUrl: z.string(),
  coverImageUrl: z.string(),
  startDateTime: z.date(),
  endDateTime: z.date(),
  price: z.string(),
  isFree: z.boolean(),
  url: z.string().url('Invalid URL format for url').optional(),
  categoryId: z.string(),
  organizerId: z.string(),
  venueId: z.string(),
  tags: z.array(z.string()).optional(),
  attendeeLimit: z
    .number()
    .int()
    .min(1, 'Attendee limit must be at least 1')
    .optional(),
  ratings: z
    .array(
      z.object({
        userId: z.string(),
        rating: z
          .number()
          .min(1, 'Rating must be at least 1')
          .max(5, 'Rating must be at most 5'),
        comment: z.string().optional(),
      })
    )
    .optional(),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(1, 'Ticket name is required'),
        price: z.number().min(0, 'Ticket price must be at least 0'),
        quantity: z.number().min(0, 'Quantity must be at least 0'),
      })
    )
    .nonempty('At least one ticket type is required'),
  embeddedVideoUrl: z
    .string()
    .url('Invalid URL format for embeddedVideoUrl')
    .optional(),
});
