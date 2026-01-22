"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mail,
  Plus,
  Trash2,
  UserPlus,
  Send,
  Armchair,
  MapPin,
  Users,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  resendInvitation,
  createInvitation,
} from "@/actions/invite-only.action";
import { getEventById } from "@/actions/event.actions";
import { SeatingArrangement } from "@/components/events/seating-arrangement";

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
  inviteOnlyEventId?: string;
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
  const [resendingInvites, setResendingInvites] = useState<Set<string>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState("guests");
  const [highlightedGuestId, setHighlightedGuestId] = useState<string | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [newGuest, setNewGuest] = useState<Omit<Guest, "id">>({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    plusOnesAllowed: 0,
    specialRequirements: "",
    organizerNotes: "",
  });

  const guests: Guest[] = formData.guests || [];
  const inviteOnly = formData.inviteOnly || {};
  const seatingEnabled = inviteOnly.enableSeatingArrangement || false;

  const [previousTab, setPreviousTab] = useState(activeTab);

  // ✅ OPTIMIZED: Only auto-refresh when switching FROM seating TO guests
  useEffect(() => {
    if (
      isEditMode &&
      inviteOnlyEventId &&
      previousTab === "seating" &&
      activeTab === "guests"
    ) {
      handleRefreshGuests();
    }
    setPreviousTab(activeTab);
  }, [activeTab, isEditMode, inviteOnlyEventId]);

  // ✅ FIXED: In edit mode, save directly to database
  const handleAddGuest = async () => {
    if (!newGuest.guestName || !newGuest.guestEmail) {
      toast.error("Guest name and email are required");
      return;
    }

    if (guests.some((g) => g.guestEmail === newGuest.guestEmail)) {
      toast.error("A guest with this email already exists");
      return;
    }

    // ✅ FIX: In edit mode, save directly to database
    if (isEditMode && inviteOnlyEventId) {
      setIsAdding(true);
      try {
        const result = await createInvitation({
          inviteOnlyEventId,
          guestName: newGuest.guestName,
          guestEmail: newGuest.guestEmail,
          guestPhone: newGuest.guestPhone,
          plusOnesAllowed: newGuest.plusOnesAllowed,
          specialRequirements: newGuest.specialRequirements,
          organizerNotes: newGuest.organizerNotes,
          sendEmail: false,
        });

        if (result.success) {
          toast.success("Guest added successfully");
          setNewGuest({
            guestName: "",
            guestEmail: "",
            guestPhone: "",
            plusOnesAllowed: 0,
            specialRequirements: "",
            organizerNotes: "",
          });
          setIsAddDialogOpen(false);

          // Refresh to show the new guest
          await handleRefreshGuests();
        } else {
          toast.error(result.message || "Failed to add guest");
        }
      } catch (error) {
        console.error("Error adding guest:", error);
        toast.error("Failed to add guest");
      } finally {
        setIsAdding(false);
      }
    } else {
      // ✅ For create mode, use temporary ID
      const guestToAdd: Guest = {
        ...newGuest,
        id: `temp-${Date.now()}`,
      };

      updateFormData({
        guests: [...guests, guestToAdd],
      });

      setNewGuest({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        plusOnesAllowed: 0,
        specialRequirements: "",
        organizerNotes: "",
      });
      setIsAddDialogOpen(false);
      toast.success("Guest added successfully");
    }
  };

  const handleEditGuest = () => {
    if (!editingGuest) return;

    if (!editingGuest.guestName || !editingGuest.guestEmail) {
      toast.error("Guest name and email are required");
      return;
    }

    if (
      guests.some(
        (g) =>
          g.guestEmail === editingGuest.guestEmail && g.id !== editingGuest.id,
      )
    ) {
      toast.error("A guest with this email already exists");
      return;
    }

    updateFormData({
      guests: guests.map((g) => (g.id === editingGuest.id ? editingGuest : g)),
    });

    setEditingGuest(null);
    setIsEditDialogOpen(false);
    toast.success("Guest updated successfully");
  };

  const handleDeleteGuest = (guestId: string) => {
    if (confirm("Are you sure you want to remove this guest?")) {
      updateFormData({
        guests: guests.filter((g) => g.id !== guestId),
      });

      if (onDeleteGuest) {
        onDeleteGuest(guestId);
      }

      toast.success("Guest removed");
    }
  };

  const handleResendInvitation = async (
    guestId: string,
    guestEmail: string,
  ) => {
    if (guestId.startsWith("temp-")) {
      toast.error(
        "Cannot resend invitation for unsaved guests. Please save the event first.",
      );
      return;
    }

    setResendingInvites((prev) => new Set(prev).add(guestId));

    try {
      const result = await resendInvitation(guestId);

      if (result.success) {
        toast.success(`Invitation resent to ${guestEmail}`);
      } else {
        toast.error(result.message || "Failed to resend invitation");
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setResendingInvites((prev) => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  };

  const handleBulkImport = () => {
    toast.info("Bulk import feature coming soon!");
  };

  const handleAssignSeat = (guest: Guest) => {
    if (guest.id.startsWith("temp-")) {
      toast.error(
        "Please save the event first before assigning seats to guests.",
      );
      return;
    }

    setHighlightedGuestId(guest.id);
    setActiveTab("seating");
    toast.info(
      `Switched to Seating tab. Click an empty seat to assign ${guest.guestName}`,
      {
        duration: 5000,
      },
    );

    // Clear highlight after 10 seconds
    setTimeout(() => {
      setHighlightedGuestId(null);
    }, 10000);
  };

  const handleViewSeat = (guest: Guest) => {
    setActiveTab("seating");
    toast.info(
      `Viewing seat assignment for ${guest.guestName}: Table ${guest.seat?.table.tableNumber}, Seat ${guest.seat?.seatNumber}`,
    );
  };

  const getSeatingBadge = (guest: Guest) => {
    if (!seatingEnabled) return null;

    if (guest.seat) {
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 text-xs"
        >
          <Armchair className="h-3 w-3 mr-1" />
          Table {guest.seat.table.tableNumber}, Seat {guest.seat.seatNumber}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs text-orange-600">
        <MapPin className="h-3 w-3 mr-1" />
        Not Assigned
      </Badge>
    );
  };

  // ✅ FIXED: Properly handle the seat assignment updates (no temp guests in edit mode)
  const handleRefreshGuests = async () => {
    if (!inviteOnlyEventId || !formData.id) {
      console.log("DEBUG: Missing IDs", {
        inviteOnlyEventId,
        formDataId: formData.id,
      });
      return;
    }

    setIsRefreshing(true);

    try {
      console.log("DEBUG: Fetching event with ID:", formData.id);

      const result = await getEventById(formData.id);

      console.log("DEBUG: getEventById result:", result);

      if (result.success && result.data?.inviteOnlyEvent?.invitations) {
        console.log(
          "DEBUG: Raw invitations data:",
          result.data.inviteOnlyEvent.invitations,
        );

        // ✅ Map all guests from database (no temp guests in edit mode)
        const updatedGuests = result.data.inviteOnlyEvent.invitations.map(
          (inv: any) => {
            console.log("DEBUG: Processing invitation:", {
              id: inv.id,
              guestName: inv.guestName,
              hasSeat: !!inv.seat,
              seatData: inv.seat,
            });

            return {
              id: inv.id,
              guestName: inv.guestName,
              guestEmail: inv.guestEmail,
              guestPhone: inv.guestPhone || "",
              plusOnesAllowed: inv.plusOnesAllowed || 0,
              specialRequirements: inv.specialRequirements || "",
              organizerNotes: inv.organizerNotes || "",
              seat: inv.seat
                ? {
                    id: inv.seat.id,
                    seatNumber: inv.seat.seatNumber,
                    table: {
                      tableNumber: inv.seat.table.tableNumber,
                      tableName: inv.seat.table.tableName || undefined,
                    },
                  }
                : undefined,
            };
          },
        );

        console.log("DEBUG: Updated guests array:", updatedGuests);

        updateFormData({ guests: updatedGuests });
        toast.success("Guest list refreshed");
      } else {
        console.log("DEBUG: No invitations found or result failed", {
          success: result.success,
          hasInviteOnlyEvent: !!result.data?.inviteOnlyEvent,
          hasInvitations: !!result.data?.inviteOnlyEvent?.invitations,
        });
      }
    } catch (error) {
      console.error("DEBUG: Error refreshing guests:", error);
      toast.error("Failed to refresh guest list");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ NEW: Manual refresh button handler
  const handleManualRefresh = async () => {
    await handleRefreshGuests();
  };

  // Render guest table rows
  const renderGuestRow = (guest: Guest) => (
    <TableRow key={guest.id}>
      <TableCell className="font-medium">{guest.guestName}</TableCell>
      <TableCell>{guest.guestEmail}</TableCell>
      <TableCell>{guest.guestPhone || "-"}</TableCell>
      <TableCell>{guest.plusOnesAllowed}</TableCell>
      {seatingEnabled && <TableCell>{getSeatingBadge(guest)}</TableCell>}
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode && !guest.id.startsWith("temp-") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleResendInvitation(guest.id, guest.guestEmail)}
              disabled={resendingInvites.has(guest.id)}
              className="gap-1"
            >
              <Send className="h-3 w-3" />
              {resendingInvites.has(guest.id) ? "Sending..." : "Resend"}
            </Button>
          )}

          {/* Seat Assignment Buttons - Only in Edit Mode with Seating Enabled */}
          {seatingEnabled && isEditMode && !guest.seat && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => handleAssignSeat(guest)}
              disabled={guest.id.startsWith("temp-")}
              className="gap-1"
              title={
                guest.id.startsWith("temp-")
                  ? "Save event first to assign seats"
                  : "Assign seat to this guest"
              }
            >
              <Armchair className="h-3 w-3" />
              Assign Seat
            </Button>
          )}

          {seatingEnabled && isEditMode && guest.seat && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleViewSeat(guest)}
              className="gap-1"
              title="View seat assignment"
            >
              <Eye className="h-3 w-3" />
              View Seat
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Guest Management</h2>
        <p className="text-muted-foreground">
          Add and manage your event guests
          {seatingEnabled && " • Seating arrangement enabled"}
        </p>
      </div>

      {/* Conditional Rendering: Tabs vs Regular View */}
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
                {/* ✅ NEW: Manual Refresh Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button type="button" className="gap-2" disabled={isAdding}>
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
                              setNewGuest({
                                ...newGuest,
                                guestName: e.target.value,
                              })
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
                              setNewGuest({
                                ...newGuest,
                                guestEmail: e.target.value,
                              })
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
                              setNewGuest({
                                ...newGuest,
                                guestPhone: e.target.value,
                              })
                            }
                            placeholder="+234 800 000 0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="plusOnesAllowed">
                            Plus Ones Allowed
                          </Label>
                          <Input
                            id="plusOnesAllowed"
                            type="number"
                            min="0"
                            max={inviteOnly.maxPlusOnes || 10}
                            value={newGuest.plusOnesAllowed}
                            onChange={(e) =>
                              setNewGuest({
                                ...newGuest,
                                plusOnesAllowed:
                                  parseInt(e.target.value, 10) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="specialRequirements">
                          Special Requirements
                        </Label>
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
                        <Label htmlFor="organizerNotes">
                          Organizer Notes (Private)
                        </Label>
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
                      <Button
                        type="button"
                        onClick={handleAddGuest}
                        disabled={isAdding}
                      >
                        {isAdding ? "Adding..." : "Add Guest"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Guest List ({guests.length}
                  {inviteOnly.maxInvitations
                    ? ` / ${inviteOnly.maxInvitations}`
                    : ""}
                  )
                </CardTitle>
                <CardDescription>
                  Manage your event guests and their invitation details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {guests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No guests added yet
                    </p>
                    <p className="text-sm mb-4">
                      Start building your guest list by adding guests
                      individually or importing in bulk
                    </p>
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      className="gap-2"
                    >
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
                        {guests.map((guest) => renderGuestRow(guest))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seating" className="mt-6">
            <SeatingArrangement
              inviteOnlyEventId={inviteOnlyEventId}
              invitations={guests}
              highlightedGuestId={highlightedGuestId}
              onSeatingUpdate={handleRefreshGuests}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {seatingEnabled && !isEditMode && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Armchair className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">
                    Seating Arrangement Enabled
                  </h4>
                  <p className="text-sm text-blue-800 mt-1">
                    After saving the event, you&apos;ll be able to:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
                    <li>
                      Create tables with custom layouts (Round, Rectangle, etc.)
                    </li>
                    <li>Manually assign guests to specific seats</li>
                    <li>Use auto-assign to quickly fill all tables</li>
                    <li>View seating charts and make adjustments anytime</li>
                  </ul>
                  <p className="text-sm text-blue-800 mt-2 font-medium">
                    💡 Tip: You can add more guests later and assign them to
                    seats at any time.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                        <Label htmlFor="guestName-2">Guest Name *</Label>
                        <Input
                          id="guestName-2"
                          value={newGuest.guestName}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              guestName: e.target.value,
                            })
                          }
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="guestEmail-2">Email Address *</Label>
                        <Input
                          id="guestEmail-2"
                          type="email"
                          value={newGuest.guestEmail}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              guestEmail: e.target.value,
                            })
                          }
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="guestPhone-2">Phone Number</Label>
                        <Input
                          id="guestPhone-2"
                          type="tel"
                          value={newGuest.guestPhone}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              guestPhone: e.target.value,
                            })
                          }
                          placeholder="+234 800 000 0000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="plusOnesAllowed-2">
                          Plus Ones Allowed
                        </Label>
                        <Input
                          id="plusOnesAllowed-2"
                          type="number"
                          min="0"
                          max={inviteOnly.maxPlusOnes || 10}
                          value={newGuest.plusOnesAllowed}
                          onChange={(e) =>
                            setNewGuest({
                              ...newGuest,
                              plusOnesAllowed:
                                parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="specialRequirements-2">
                        Special Requirements
                      </Label>
                      <Textarea
                        id="specialRequirements-2"
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
                      <Label htmlFor="organizerNotes-2">
                        Organizer Notes (Private)
                      </Label>
                      <Textarea
                        id="organizerNotes-2"
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Guest List ({guests.length}
                {inviteOnly.maxInvitations
                  ? ` / ${inviteOnly.maxInvitations}`
                  : ""}
                )
              </CardTitle>
              <CardDescription>
                Manage your event guests and their invitation details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    No guests added yet
                  </p>
                  <p className="text-sm mb-4">
                    Start building your guest list by adding guests individually
                    or importing in bulk
                  </p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="gap-2"
                  >
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
                      {guests.map((guest) => renderGuestRow(guest))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Guest Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
            <DialogDescription>
              Update the guest details below
            </DialogDescription>
          </DialogHeader>
          {editingGuest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-guestName">Guest Name *</Label>
                  <Input
                    id="edit-guestName"
                    value={editingGuest.guestName}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        guestName: e.target.value,
                      })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-guestEmail">Email Address *</Label>
                  <Input
                    id="edit-guestEmail"
                    type="email"
                    value={editingGuest.guestEmail}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        guestEmail: e.target.value,
                      })
                    }
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-guestPhone">Phone Number</Label>
                  <Input
                    id="edit-guestPhone"
                    type="tel"
                    value={editingGuest.guestPhone || ""}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        guestPhone: e.target.value,
                      })
                    }
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-plusOnesAllowed">
                    Plus Ones Allowed
                  </Label>
                  <Input
                    id="edit-plusOnesAllowed"
                    type="number"
                    min="0"
                    max={inviteOnly.maxPlusOnes || 10}
                    value={editingGuest.plusOnesAllowed}
                    onChange={(e) =>
                      setEditingGuest({
                        ...editingGuest,
                        plusOnesAllowed: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-specialRequirements">
                  Special Requirements
                </Label>
                <Textarea
                  id="edit-specialRequirements"
                  value={editingGuest.specialRequirements || ""}
                  onChange={(e) =>
                    setEditingGuest({
                      ...editingGuest,
                      specialRequirements: e.target.value,
                    })
                  }
                  placeholder="Dietary restrictions, accessibility needs, etc."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-organizerNotes">
                  Organizer Notes (Private)
                </Label>
                <Textarea
                  id="edit-organizerNotes"
                  value={editingGuest.organizerNotes || ""}
                  onChange={(e) =>
                    setEditingGuest({
                      ...editingGuest,
                      organizerNotes: e.target.value,
                    })
                  }
                  placeholder="Internal notes about this guest..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingGuest(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleEditGuest}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button type="button" onClick={onNext} disabled={guests.length === 0}>
          {guests.length === 0 ? "Add at least one guest" : "Next: Preview"}
        </Button>
      </div>
    </div>
  );
}
