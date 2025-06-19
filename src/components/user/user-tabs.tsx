'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserOverview from './user-overview';
import UserEvents from './user-events';
import UserTickets from './user-tickets';
import UserNotifications from './user-notifications';
import UserActivity from './user-activity';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  subRole: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  organizerProfile?: {
    organizationName: string;
    organizationType?: string;
    bio?: string;
    website?: string;
    businessRegistrationNumber?: string;
    taxIdentificationNumber?: string;
  };
  stats: {
    totalEvents: number;
    activeEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalVenues: number;
    averageRating: number;
    totalReviews: number;
    totalTicketsPurchased: number;
    totalOrders: number;
  };
  eventsHosted: any[];
  tickets: any[];
  Notification: any[];
}

interface UserTabsProps {
  user: UserData;
  activity: any[];
}

export default function UserTabs({ user, activity }: UserTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="events">
          Events ({user.stats.totalEvents})
        </TabsTrigger>
        <TabsTrigger value="tickets">
          Tickets ({user.stats.totalTicketsPurchased})
        </TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <UserOverview user={user} />
      </TabsContent>

      <TabsContent value="events">
        <UserEvents events={user.eventsHosted} />
      </TabsContent>

      <TabsContent value="tickets">
        <UserTickets tickets={user.tickets} />
      </TabsContent>

      <TabsContent value="notifications">
        <UserNotifications notifications={user.Notification} />
      </TabsContent>

      <TabsContent value="activity">
        <UserActivity activity={activity} />
      </TabsContent>
    </Tabs>
  );
}
