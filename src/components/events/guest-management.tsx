'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Plus, Trash2, UserPlus, Send, Armchair, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { resendInvitation } from '@/actions/invite-only.action';
import { SeatingArrangement } from '@/components/events/seating-arrangement';

interface Guest {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  plusOnesAllowed: number;
  specialRequirements?: string;
  organizerNotes?: string;
  seat?: {
    id: string;
    seatNumber: number;
    table: {
      tableNumber: number;
      tableName?: string;
    };
  };
}

interface GuestManagementProps {
  formData: any;
  updateFormData: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  onDeleteGuest?: (guestId: string) => void;
  isEditMode?: boolean;
  inviteOnlyEventId?: string; // For edit mode seating
}

export function GuestManagement({
  formData,
  updateFormData,
  onNext,
  onPrevious,
  onDeleteGuest,
  isEditMode = false,
  inviteOnlyEventId,
}: GuestManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [resendingInvites, setResendingInvites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('guests');

  const [newGuest, setNewGuest] = useState<Omit<Guest, 'id'>>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    plusOnesAllowed: 0,
    specialRequirements: '',
    organizerNotes: '',
  });

  const guests: Guest[] = formData.guests || [];
  const inviteOnly = formData.inviteOnly || {};
  const seatingEnabled = inviteOnly.enableSeatingArrangement || false;

  const handleAddGuest = () => {
    if (!newGuest.guestName || !newGuest.guestEmail) {
      toast.error('Guest name and email are required');
      return;
    }

    if (guests.some(g => g.guestEmail === newGuest.guestEmail)) {
      toast.error('A guest with this email already exists');
      return;
    }

    const guestToAdd: Guest = {
      ...newGuest,
      id: `temp-${Date.now()}`,
    };

    updateFormData({
      guests: [...guests, guestToAdd],
    });

    setNewGuest({
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      plusOnesAllowed: 0,
      specialRequirements: '',
      organizerNotes: '',
    });
    setIsAddDialogOpen(false);
    toast.success('Guest added successfully');
  };

  const handleEditGuest = () => {
    if (!editingGuest) return;

    if (!editingGuest.guestName || !editingGuest.guestEmail) {
      toast.error('Guest name and email are required');
      return;
    }

    if (guests.some(g => g.guestEmail === editingGuest.guestEmail && g.id !== editingGuest.id)) {
      toast.error('A guest with this email already exists');
      return;
    }

    updateFormData({
      guests: guests.map((g) => (g.id === editingGuest.id ? editingGuest : g)),
    });

    setEditingGuest(null);
    setIsEditDialogOpen(false);
    toast.success('Guest updated successfully');
  };

  const handleDeleteGuest = (guestId: string) => {
    if (confirm('Are you sure you want to remove this guest?')) {
      updateFormData({
        guests: guests.filter((g) => g.id !== guestId),
      });

      if (onDeleteGuest) {
        onDeleteGuest(guestId);
      }

      toast.success('Guest removed');
    }
  };

  const handleResendInvitation = async (guestId: string, guestEmail: string) => {
    if (guestId.startsWith('temp-')) {
      toast.error('Cannot resend invitation for unsaved guests. Please save the event first.');
      return;
    }

    setResendingInvites(prev => new Set(prev).add(guestId));

    try {
      const result = await resendInvitation(guestId);

      if (result.success) {
        toast.success(`Invitation resent to ${guestEmail}`);
      } else {
        toast.error(result.message || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  };

  const handleBulkImport = () => {
    toast.info('Bulk import feature coming soon!');
  };

  const getSeatingBadge = (guest: Guest) => {
    if (!seatingEnabled) return null;

    if (guest.seat) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
          <Armchair className="h-3 w-3 mr-1" />
          Table {guest.seat.table.tableNumber}, Seat {guest.seat.seatNumber}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs">
        <MapPin className="h-3 w-3 mr-1" />
        Not Assigned
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Guest Management</h2>
        <p className="text-muted-foreground">
          Add and manage your event guests
          {seatingEnabled && ' • Seating arrangement enabled'}
        </p>
      </div>

      {/* ✅ TABS: Guest List + Seating Arrangement */}
      {seatingEnabled && isEditMode && inviteOnlyEventId ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guests">
              <Users className="h-4 w-4 mr-2" />
              Guest List ({guests.length})
            </TabsTrigger>
            <TabsTrigger value="seating">
              <Armchair className="h-4 w-4 mr-2" />
              Seating Arrangement
            </TabsTrigger>
          </TabsList>

          {/* Guest List Tab */}
          <TabsContent value="guests" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBulkImport}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Bulk Import
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Guest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Guest</DialogTitle>
                      <DialogDescription>
                        Enter the guest details below
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestName">Guest Name *</Label>
                          <Input
                            id="guestName"
                            value={newGuest.guestName}
                            onChange={(e) =>
                              setNewGuest({ ...newGuest, guestName: e.target.value })
                            }
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="guestEmail">Email Address *</Label>
                          <Input
                            id="guestEmail"
                            type="email"
                            value={newGuest.guestEmail}
                            onChange={(e) =>
                              setNewGuest({ ...newGuest, guestEmail: e.target.value })
                            }
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guestPhone">Phone Number</Label>
                          <Input
                            id="guestPhone"
                            type="tel"
                            value={newGuest.guestPhone}
                            onChange={(e) =>
                              setNewGuest({ ...newGuest, guestPhone: e.target.value })
                            }
                            placeholder="+234 800 000 0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="plusOnesAllowed">Plus Ones Allowed</Label>
                          <Input
                            id="plusOnesAllowed"
                            type="number"
                            min="0"
                            max={inviteOnly.maxPlusOnes || 10}
                            value={newGuest.plusOnesAllowed}
                            onChange={(e) =>
                              setNewGuest({
                                ...newGuest,
                                plusOnesAllowed: parseInt(e.target.value, 10) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="specialRequirements">Special Requirements</Label>
                        <Textarea
                          id="specialRequirements"
                          value={newGuest.specialRequirements}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              specialRequirements: e.target.value,
                            })
                          }
                          placeholder="Dietary restrictions, accessibility needs, etc."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="organizerNotes">Organizer Notes (Private)</Label>
                        <Textarea
                          id="organizerNotes"
                          value={newGuest.organizerNotes}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              organizerNotes: e.target.value,
                            })
                          }
                          placeholder="Internal notes about this guest..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleAddGuest}>
                        Add Guest
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Guest List Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Guest List ({guests.length}
                  {inviteOnly.maxInvitations ? ` / ${inviteOnly.maxInvitations}` : ''})
                </CardTitle>
                <CardDescription>
                  Manage your event guests and their invitation details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {guests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No guests added yet</p>
                    <p className="text-sm mb-4">
                      Start building your guest list by adding guests individually or importing in bulk
                    </p>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Your First Guest
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Plus Ones</TableHead>
                          {seatingEnabled && <TableHead>Seating</TableHead>}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guests.map((guest) => (
                          <TableRow key={guest.id}>
                            <TableCell className="font-medium">
                              {guest.guestName}
                            </TableCell>
                            <TableCell>{guest.guestEmail}</TableCell>
                            <TableCell>{guest.guestPhone || '-'}</TableCell>
                            <TableCell>{guest.plusOnesAllowed}</TableCell>
                            {seatingEnabled && (
                              <TableCell>{getSeatingBadge(guest)}</TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isEditMode && !guest.id.startsWith('temp-') && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResendInvitation(guest.id, guest.guestEmail)}
                                    disabled={resendingInvites.has(guest.id)}
                                    className="gap-1"
                                  >
                                    <Send className="h-3 w-3" />
                                    {resendingInvites.has(guest.id) ? 'Sending...' : 'Resend'}
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingGuest(guest);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteGuest(guest.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ✅ Seating Arrangement Tab */}
          <TabsContent value="seating" className="mt-6">
            <SeatingArrangement
              inviteOnlyEventId={inviteOnlyEventId}
              invitations={guests}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // ✅ No tabs during creation - just show notice
        <>
          {seatingEnabled && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Armchair className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Seating Arrangement Enabled</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    After saving the event, you&apos;ll be able to manage table arrangements and assign guests
                    to specific seats right here in the Guest Management tab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Regular Guest Management UI (same as above) */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBulkImport}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Bulk Import
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Guest
                  </Button>
                </DialogTrigger>
                {/* Same dialog content as above */}
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Guest List ({guests.length}
                {inviteOnly.maxInvitations ? ` / ${inviteOnly.maxInvitations}` : ''})
              </CardTitle>
              <CardDescription>
                Manage your event guests and their invitation details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Same guest list table as above */}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Guest Dialog (same as before) */}
      {/* ... */}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={guests.length === 0}
        >
          {guests.length === 0 ? 'Add at least one guest' : 'Next: Preview'}
        </Button>
      </div>
    </div>
  );
}