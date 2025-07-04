'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  Volume2,
  Calendar,
  Ticket,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { toast } from 'sonner';

export function NotificationPreferences() {
  const { preferences, updatePreferences, resetPreferences, isLoading } =
    useNotificationPreferences();
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
    toast.success('Preference updated');
  };

  const handleReset = () => {
    resetPreferences();
    toast.success('Preferences reset to default');
  };

  const handleTestSound = () => {
    if (preferences.soundEnabled) {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        toast.error(
          'Unable to play sound. Please check your browser settings.'
        );
      });
    } else {
      toast.info('Sound notifications are disabled');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">
            Customize how and when you receive notifications
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Default
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications via email
              </div>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) =>
                handleToggle('emailNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Push Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive browser push notifications
              </div>
            </div>
            <Switch
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) =>
                handleToggle('pushNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium flex items-center gap-2">
                Sound Notifications
                <Button variant="ghost" size="sm" onClick={handleTestSound}>
                  <Volume2 className="w-3 h-3" />
                  Test
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Play sound for new notifications
              </div>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) =>
                handleToggle('soundEnabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">Auto Mark as Read</div>
              <div className="text-sm text-muted-foreground">
                Automatically mark notifications as read when viewed
              </div>
            </div>
            <Switch
              checked={preferences.autoMarkAsRead}
              onCheckedChange={(checked) =>
                handleToggle('autoMarkAsRead', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium">
                Group Similar Notifications
              </div>
              <div className="text-sm text-muted-foreground">
                Group related notifications together
              </div>
            </div>
            <Switch
              checked={preferences.groupNotifications}
              onCheckedChange={(checked) =>
                handleToggle('groupNotifications', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Event Reminders
              </div>
              <div className="text-sm text-muted-foreground">
                Get notified about upcoming events
              </div>
            </div>
            <Switch
              checked={preferences.eventReminders}
              onCheckedChange={(checked) =>
                handleToggle('eventReminders', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Ticket Updates
              </div>
              <div className="text-sm text-muted-foreground">
                Notifications about ticket purchases and updates
              </div>
            </div>
            <Switch
              checked={preferences.ticketUpdates}
              onCheckedChange={(checked) =>
                handleToggle('ticketUpdates', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Notifications
              </div>
              <div className="text-sm text-muted-foreground">
                Updates about payments and refunds
              </div>
            </div>
            <Switch
              checked={preferences.paymentNotifications}
              onCheckedChange={(checked) =>
                handleToggle('paymentNotifications', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-base font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Marketing Emails
                <Badge variant="secondary">Optional</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Promotional emails about new features and events
              </div>
            </div>
            <Switch
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) =>
                handleToggle('marketingEmails', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Browser Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-medium">
                  Notification Permission
                </div>
                <div className="text-sm text-muted-foreground">
                  Current status:{' '}
                  {typeof window !== 'undefined' && 'Notification' in window
                    ? Notification.permission
                    : 'Not supported'}
                </div>
              </div>
              {typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'default' && (
                  <Button
                    variant="outline"
                    onClick={() => Notification.requestPermission()}
                  >
                    Enable Notifications
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
