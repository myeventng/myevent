'use client';

import {
  Calendar,
  CalendarCell,
  CalendarDay,
  CalendarDays,
  CalendarHeader,
  CalendarMonthName,
  CalendarNext,
  CalendarPrevious,
  CalendarTable,
} from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

const upcomingEvents = [
  {
    id: 'evt-001',
    name: 'Business Networking',
    date: 'Mar 19, 2025',
    time: '18:00 - 21:00',
    location: 'Downtown Conference Center',
  },
  {
    id: 'evt-002',
    name: 'Jazz Night',
    date: 'Mar 20, 2025',
    time: '20:00 - 23:00',
    location: 'Blue Note Jazz Club',
  },
  {
    id: 'evt-003',
    name: 'Cooking Workshop',
    date: 'Mar 21, 2025',
    time: '11:00 - 14:00',
    location: 'Culinary Institute',
  },
  {
    id: 'evt-004',
    name: 'Photography Exhibition',
    date: 'Mar 22, 2025',
    time: '10:00 - 17:00',
    location: 'Modern Art Gallery',
  },
  {
    id: 'evt-005',
    name: 'Startup Pitch Day',
    date: 'Mar 23, 2025',
    time: '09:00 - 18:00',
    location: 'Innovation Hub',
  },
];

export function CalendarView() {
  return (
    <div className="space-y-4">
      {upcomingEvents.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{event.name}</h4>
                <div className="text-sm text-muted-foreground mt-1">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{event.time}</span>
                  </div>
                  <div className="mt-1">{event.location}</div>
                </div>
              </div>
              <Badge>{event.date}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
