export type CreateUserParams = {
  clerkId: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  photo: string;
  bio?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  bankName?: string;
  socialLinks?: { platform: string; url: string }[];
  role?: string | 'user' | 'organizer' | 'admin';
  organizerProfile?: {
    organizationName?: string;
    bio?: string;
    website?: string;
  };
  isVerified?: boolean;
  eventsHosted?: string[];
};

export type UpdateUserParams = {
  firstName: string;
  lastName: string;
  username: string;
  photo: string;
  bio?: string;
  phone?: string;
  address?: string;
  accountNumber?: string;
  bankName?: string;
  socialLinks?: { platform: string; url: string }[];
  role?: string | 'user' | 'organizer' | 'admin';
  organizerProfile?: {
    organizationName?: string;
    bio?: string;
    website?: string;
  };
  isVerified?: boolean;
  eventsHosted?: string[];
};

// ====== EVENT PARAMS
export type CreateEventParams = {
  userId: string;
  event: {
    title: string;
    description: string;
    location: string;
    imageUrl: string;
    venue?: string;
    startDateTime: Date;
    endDateTime: Date;
    categoryId: string;
    price: string;
    isFree: boolean;
    url: string;
  };
  path: string;
};

export type UpdateEventParams = {
  userId: string;
  event: {
    _id: string;
    title: string;
    imageUrl: string;
    description: string;
    location: string;
    startDateTime: Date;
    venue?: string;
    endDateTime: Date;
    categoryId: string;
    price: string;
    isFree: boolean;
    url: string;
  };
  path: string;
};

export type DeleteEventParams = {
  eventId: string;
  path: string;
};

export type GetAllEventsParams = {
  query: string;
  category: string;
  limit: number;
  page: number;
};

export type GetEventsByUserParams = {
  userId: string;
  limit?: number;
  page: number;
};

export type GetRelatedEventsByCategoryParams = {
  categoryId: string;
  eventId: string;
  limit?: number;
  page: number | string;
};

// export type Event = {
//   _id: string;
//   title: string;
//   description: string;
//   price: string;
//   isFree: boolean;
//   imageUrl: string;
//   location: string;
//   startDateTime: Date;
//   endDateTime: Date;
//   url: string;
//   venue?: string;
//   organizer: {
//     _id: string;
//     firstName: string;
//     lastName: string;
//   };
//   category: {
//     _id: string;
//     name: string;
//   };
// };

// ====== CATEGORY PARAMS
export type CreateCategoryParams = {
  _id?: string;
  categoryName: string;
  path: string;
};

export type updateCategoryParams = {
  categoryId: string;
  category: string;
  path: string;
};

export type DeleteCategoryParams = {
  categoryId: string;
  path: string;
};

export type GetAllCategorysParams = {};

// ====== ORDER PARAMS
export type CheckoutOrderParams = {
  eventTitle: string;
  eventId: string;
  price: string;
  isFree: boolean;
  buyerId: string;
};

export type CreateOrderParams = {
  stripeId: string;
  eventId: string;
  buyerId: string;
  totalAmount: string;
  createdAt: Date;
};

export type GetOrdersByEventParams = {
  eventId: string;
  searchString: string;
};

export type GetOrdersByUserParams = {
  userId: string | null;
  limit?: number;
  page: string | number | null;
};

// ====== URL QUERY PARAMS
export type UrlQueryParams = {
  params: string;
  key: string;
  value: string | null;
};

export type RemoveUrlQueryParams = {
  params: string;
  keysToRemove: string[];
};

export type SearchParamProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// my types dashboard
// types/index.ts
export enum EventStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  USER = 'USER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  venueId: string;
  venueName: string;
  categoryId?: string;
  categoryName?: string;
  isFree: boolean;
  featured: boolean;
  publishedStatus: string;
  attendeeLimit?: number;
  ticketsSold: number;
  totalRevenue: number;
}

export interface Order {
  id: string;
  createdAt: Date;
  totalAmount: number;
  quantity: number;
  paymentStatus: OrderStatus;
  eventId: string;
  eventTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
}

export interface DashboardStats {
  totalRevenue: number;
  previousMonthRevenue: number;
  activeEvents: number;
  previousMonthEvents: number;
  ticketSales: number;
  previousMonthTicketSales: number;
  activeUsers: number;
  previousMonthActiveUsers: number;
}

export interface TopEvent {
  name: string;
  category: string;
  ticketsSold: number;
  ticketsTotal: number;
  revenue: string;
  percentageSold: number;
}

export interface RecentOrder {
  id: string;
  event: string;
  customer: {
    name: string;
    email: string;
    image?: string;
  };
  status: string;
  date: string;
  amount: string;
  tickets: number;
}

export interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
}

export interface CityStat {
  name: string;
  count: number;
  percentage: number;
}

export interface UserStat {
  role: UserRole;
  count: number;
  percentage: number;
}

export interface Revenue {
  date: string;
  value: number;
}

export interface TicketSale {
  date: string;
  count: number;
}

export interface ChartData {
  name: string;
  revenue: number;
  tickets: number;
}
