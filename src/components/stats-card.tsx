import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  change,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="w-4 h-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p
            className={`text-xs ${
              change.isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
          </p>
        )}
        {description && (
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
