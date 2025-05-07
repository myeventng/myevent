'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const recentOrders = [
  {
    id: 'ORD-001',
    event: 'Summer Music Festival',
    customer: {
      name: 'John Smith',
      email: 'john@example.com',
      image: '/api/placeholder/32/32',
    },
    status: 'completed',
    date: 'Mar 18, 2025',
    amount: '124.00',
    tickets: 2,
  },
  {
    id: 'ORD-002',
    event: 'Tech Conference 2025',
    customer: {
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      image: '/api/placeholder/32/32',
    },
    status: 'completed',
    date: 'Mar 17, 2025',
    amount: '249.99',
    tickets: 1,
  },
  {
    id: 'ORD-003',
    event: 'Food & Wine Festival',
    customer: {
      name: 'Michael Brown',
      email: 'michael@example.com',
      image: '/api/placeholder/32/32',
    },
    status: 'pending',
    date: 'Mar 17, 2025',
    amount: '75.50',
    tickets: 3,
  },
  {
    id: 'ORD-004',
    event: 'Art Exhibition',
    customer: {
      name: 'Emily Davis',
      email: 'emily@example.com',
      image: '/api/placeholder/32/32',
    },
    status: 'completed',
    date: 'Mar 16, 2025',
    amount: '35.00',
    tickets: 2,
  },
  {
    id: 'ORD-005',
    event: 'Charity Gala',
    customer: {
      name: 'Robert Johnson',
      email: 'robert@example.com',
      image: '/api/placeholder/32/32',
    },
    status: 'failed',
    date: 'Mar 16, 2025',
    amount: '120.00',
    tickets: 1,
  },
];

export function RecentOrders() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recentOrders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.id}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={order.customer.image}
                    alt={order.customer.name}
                  />
                  <AvatarFallback>
                    {order.customer.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer.email}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>{order.event}</TableCell>
            <TableCell>
              <Badge
                variant={
                  order.status === 'completed'
                    ? 'default'
                    : order.status === 'pending'
                    ? 'outline'
                    : 'destructive'
                }
              >
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">₦{order.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
