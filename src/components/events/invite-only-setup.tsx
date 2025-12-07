'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Users, Gift, Lock, CheckCircle, Armchair } from 'lucide-react';

interface InviteOnlySetupProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function InviteOnlySetup({
  formData,
  updateFormData,
  onNext,
  onPrevious,
}: InviteOnlySetupProps) {
  const inviteOnly = formData.inviteOnly || {};

  // Convert empty string to undefined for optional numbers
  const handleMaxInvitationsChange = (value: string) => {
    updateFormData({
      inviteOnly: {
        ...inviteOnly,
        maxInvitations: value === '' ? undefined : parseInt(value, 10),
      },
    });
  };

  const handleMaxPlusOnesChange = (value: string) => {
    updateFormData({
      inviteOnly: {
        ...inviteOnly,
        maxPlusOnes: value === '' ? undefined : parseInt(value, 10),
      },
    });
  };

  const handleReminderDaysChange = (value: string) => {
    updateFormData({
      inviteOnly: {
        ...inviteOnly,
        reminderDaysBefore: value === '' ? 7 : parseInt(value, 10),
      },
    });
  };

  const handleSuggestedDonationChange = (value: string) => {
    updateFormData({
      inviteOnly: {
        ...inviteOnly,
        suggestedDonation: value === '' ? undefined : parseFloat(value),
      },
    });
  };

  const handleMinimumDonationChange = (value: string) => {
    updateFormData({
      inviteOnly: {
        ...inviteOnly,
        minimumDonation: value === '' ? undefined : parseFloat(value),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Invitation Settings</h2>
        <p className="text-muted-foreground">
          Configure how invitations work for your event
        </p>
      </div>

      {/* Maximum Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Guest Capacity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="maxInvitations">Maximum Invitations</Label>
            <Input
              id="maxInvitations"
              type="number"
              min="0"
              placeholder="Leave empty for unlimited"
              value={inviteOnly.maxInvitations || ''}
              onChange={(e) => handleMaxInvitationsChange(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Set a maximum number of people you can invite (leave empty for unlimited)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowPlusOnes">Allow Plus Ones</Label>
              <p className="text-sm text-muted-foreground">
                Let guests bring additional people
              </p>
            </div>
            <Switch
              id="allowPlusOnes"
              checked={inviteOnly.allowPlusOnes || false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, allowPlusOnes: checked },
                })
              }
            />
          </div>

          {inviteOnly.allowPlusOnes && (
            <div>
              <Label htmlFor="maxPlusOnes">Maximum Plus Ones Per Guest</Label>
              <Input
                id="maxPlusOnes"
                type="number"
                min="0"
                placeholder="Leave empty for unlimited"
                value={inviteOnly.maxPlusOnes || ''}
                onChange={(e) => handleMaxPlusOnesChange(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Maximum additional guests each person can bring
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Seating Arrangement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Armchair className="h-5 w-5" />
            Seating Arrangement
          </CardTitle>
          <CardDescription>
            Manage table assignments and seat allocation for your guests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableSeatingArrangement">Enable Seating Arrangement</Label>
              <p className="text-sm text-muted-foreground">
                Create tables and assign guests to specific seats
              </p>
            </div>
            <Switch
              id="enableSeatingArrangement"
              checked={inviteOnly.enableSeatingArrangement || false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, enableSeatingArrangement: checked },
                })
              }
            />
          </div>

          {inviteOnly.enableSeatingArrangement && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                ℹ️ After creating your event, you&apos;ll be able to:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                <li>Create tables with different shapes and capacities</li>
                <li>Assign guests to specific seats at each table</li>
                <li>Reserve seats for VIPs or special guests</li>
                <li>Auto-assign guests to available seats</li>
                <li>Export seating charts for printing</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSVP Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            RSVP Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireRSVP">Require RSVP</Label>
              <p className="text-sm text-muted-foreground">
                Guests must confirm their attendance
              </p>
            </div>
            <Switch
              id="requireRSVP"
              checked={inviteOnly.requireRSVP !== false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, requireRSVP: checked },
                })
              }
            />
          </div>

          {inviteOnly.requireRSVP !== false && (
            <div>
              <Label htmlFor="rsvpDeadline">RSVP Deadline</Label>
              <Input
                id="rsvpDeadline"
                type="datetime-local"
                value={
                  inviteOnly.rsvpDeadline
                    ? new Date(inviteOnly.rsvpDeadline)
                      .toISOString()
                      .slice(0, 16)
                    : ''
                }
                onChange={(e) =>
                  updateFormData({
                    inviteOnly: {
                      ...inviteOnly,
                      rsvpDeadline: e.target.value
                        ? new Date(e.target.value)
                        : undefined,
                    },
                  })
                }
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sendAutoReminders">Send Auto Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Automatically remind guests who haven&apos;t RSVP&apos;d
              </p>
            </div>
            <Switch
              id="sendAutoReminders"
              checked={inviteOnly.sendAutoReminders !== false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, sendAutoReminders: checked },
                })
              }
            />
          </div>

          {inviteOnly.sendAutoReminders !== false && (
            <div>
              <Label htmlFor="reminderDaysBefore">
                Reminder Days Before Event
              </Label>
              <Input
                id="reminderDaysBefore"
                type="number"
                min="1"
                value={inviteOnly.reminderDaysBefore || 7}
                onChange={(e) => handleReminderDaysChange(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Send reminders this many days before the event
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Donation Settings
          </CardTitle>
          <CardDescription>
            Optional: Allow guests to make donations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="acceptDonations">Accept Donations</Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to contribute financially
              </p>
            </div>
            <Switch
              id="acceptDonations"
              checked={inviteOnly.acceptDonations || false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, acceptDonations: checked },
                })
              }
            />
          </div>

          {inviteOnly.acceptDonations && (
            <>
              <div>
                <Label htmlFor="suggestedDonation">
                  Suggested Donation Amount (₦)
                </Label>
                <Input
                  id="suggestedDonation"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 5000"
                  value={inviteOnly.suggestedDonation || ''}
                  onChange={(e) => handleSuggestedDonationChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="minimumDonation">
                  Minimum Donation Amount (₦)
                </Label>
                <Input
                  id="minimumDonation"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 1000"
                  value={inviteOnly.minimumDonation || ''}
                  onChange={(e) => handleMinimumDonationChange(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="donationDescription">Donation Description</Label>
                <Textarea
                  id="donationDescription"
                  placeholder="Explain what donations will be used for..."
                  value={inviteOnly.donationDescription || ''}
                  onChange={(e) =>
                    updateFormData({
                      inviteOnly: {
                        ...inviteOnly,
                        donationDescription: e.target.value,
                      },
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showDonorNames">Show Donor Names</Label>
                  <p className="text-sm text-muted-foreground">
                    Display donor names publicly (unless anonymous)
                  </p>
                </div>
                <Switch
                  id="showDonorNames"
                  checked={inviteOnly.showDonorNames !== false}
                  onCheckedChange={(checked) =>
                    updateFormData({
                      inviteOnly: { ...inviteOnly, showDonorNames: checked },
                    })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPrivate">Private Event</Label>
              <p className="text-sm text-muted-foreground">
                Event details only visible to invited guests
              </p>
            </div>
            <Switch
              id="isPrivate"
              checked={inviteOnly.isPrivate !== false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, isPrivate: checked },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireApproval">Require Approval</Label>
              <p className="text-sm text-muted-foreground">
                Manually approve each guest before sending invitation
              </p>
            </div>
            <Switch
              id="requireApproval"
              checked={inviteOnly.requireApproval || false}
              onCheckedChange={(checked) =>
                updateFormData({
                  inviteOnly: { ...inviteOnly, requireApproval: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button type="button" onClick={onNext}>
          Next: Guest Management
        </Button>
      </div>
    </div>
  );
}