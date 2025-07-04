'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createNotification } from '@/actions/notification.actions';

export function NotificationDebugPanel() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    type: 'SYSTEM_UPDATE',
    title: '',
    message: '',
    userId: '',
    isAdminNotification: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const result = await createNotification({
        type: formData.type as any,
        title: formData.title,
        message: formData.message,
        userId: formData.isAdminNotification ? undefined : formData.userId,
        isAdminNotification: formData.isAdminNotification,
        metadata: {
          debug: true,
          createdAt: new Date().toISOString(),
        },
      });

      if (result.success) {
        toast.success('Test notification created successfully');
        setFormData({
          type: 'SYSTEM_UPDATE',
          title: '',
          message: '',
          userId: '',
          isAdminNotification: false,
        });
      } else {
        toast.error(result.message || 'Failed to create notification');
      }
    } catch (error) {
      toast.error('Error creating test notification');
      console.error('Debug notification error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-800">
          🧪 Notification Debug Panel (Development Only)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Notification Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM_UPDATE">System Update</SelectItem>
                  <SelectItem value="EVENT_APPROVED">Event Approved</SelectItem>
                  <SelectItem value="EVENT_REJECTED">Event Rejected</SelectItem>
                  <SelectItem value="TICKET_PURCHASED">
                    Ticket Purchased
                  </SelectItem>
                  <SelectItem value="REFUND_PROCESSED">
                    Refund Processed
                  </SelectItem>
                  <SelectItem value="PAYMENT_RECEIVED">
                    Payment Received
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target">Target</Label>
              <Select
                value={formData.isAdminNotification ? 'admin' : 'user'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    isAdminNotification: value === 'admin',
                    userId: value === 'admin' ? '' : formData.userId,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Specific User</SelectItem>
                  <SelectItem value="admin">All Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!formData.isAdminNotification && (
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
                placeholder="Enter user ID"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Notification title"
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Notification message"
              required
            />
          </div>

          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? 'Creating...' : 'Create Test Notification'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
