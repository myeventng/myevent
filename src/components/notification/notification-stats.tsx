'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Ticket,
} from 'lucide-react';

interface NotificationStatsProps {
  isAdmin?: boolean;
}

export function NotificationStats({ isAdmin = false }: NotificationStatsProps) {
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    todayCount: 0,
    weekCount: 0,
    categories: {
      events: 0,
      tickets: 0,
      payments: 0,
      system: 0,
    },
  });

  useEffect(() => {
    // This would fetch actual stats from your API
    // For now, using mock data
    setStats({
      total: 156,
      unread: 12,
      todayCount: 8,
      weekCount: 45,
      categories: {
        events: 34,
        tickets: 67,
        payments: 23,
        system: 32,
      },
    });
  }, []);

  const statCards = [
    {
      title: 'Total Notifications',
      value: stats.total,
      icon: Bell,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Unread',
      value: stats.unread,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Today',
      value: stats.todayCount,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'This Week',
      value: stats.weekCount,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const categoryCards = [
    {
      title: 'Events',
      value: stats.categories.events,
      icon: Calendar,
      color: 'text-orange-600',
    },
    {
      title: 'Tickets',
      value: stats.categories.tickets,
      icon: Ticket,
      color: 'text-blue-600',
    },
    {
      title: 'Payments',
      value: stats.categories.payments,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'System',
      value: stats.categories.system,
      icon: Users,
      color: 'text-gray-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryCards.map((category) => (
              <div key={category.title} className="flex items-center gap-3">
                <category.icon className={`w-5 h-5 ${category.color}`} />
                <div>
                  <p className="font-medium">{category.value}</p>
                  <p className="text-sm text-muted-foreground">
                    {category.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin-only stats */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Email Delivery Rate</span>
                <Badge variant="secondary">98.5%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Push Notification Delivery</span>
                <Badge variant="secondary">94.2%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Response Time</span>
                <Badge variant="secondary">1.2s</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
