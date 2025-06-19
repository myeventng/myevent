'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserActivityProps {
  activity: any[];
}

export default function UserActivity({ activity }: UserActivityProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length > 0 ? (
          <div className="space-y-4">
            {activity.map((item, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-4 border rounded-lg"
              >
                <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activity recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
