'use client';

import { Calendar, Ticket, DollarSign, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface UserStatsProps {
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
}

export default function UserStats({ stats }: UserStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.totalEvents}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">
                {stats.totalTicketsSold.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Tickets Sold</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">
                {stats.averageRating.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Avg Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
