'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Jan 15', revenue: 1800, tickets: 100 },
  { name: 'Jan 22', revenue: 2200, tickets: 145 },
  { name: 'Jan 29', revenue: 3000, tickets: 170 },
  { name: 'Feb 5', revenue: 2700, tickets: 155 },
  { name: 'Feb 12', revenue: 2300, tickets: 140 },
  { name: 'Feb 19', revenue: 3100, tickets: 180 },
  { name: 'Feb 26', revenue: 3500, tickets: 210 },
  { name: 'Mar 5', revenue: 3900, tickets: 235 },
  { name: 'Mar 12', revenue: 4100, tickets: 250 },
  { name: 'Mar 19', revenue: 4800, tickets: 275 },
];

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="left"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₦${value}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Legend />
        <Bar
          yAxisId="left"
          dataKey="revenue"
          fill="#8884d8"
          name="Revenue (₦)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="right"
          dataKey="tickets"
          fill="#82ca9d"
          name="Tickets Sold"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
