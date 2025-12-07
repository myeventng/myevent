//src/components/events/seating-arrangement.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Armchair,
    Plus,
    MoreVertical,
    Trash2,
    Edit,
    Users,
    UserCheck,
    UserX,
    Shuffle,
    Circle,
    Square,
    Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    createSeatingTable,
    updateSeatingTable,
    deleteSeatingTable,
    getSeatingTables,
    assignGuestToSeat,
    unassignGuestFromSeat,
    reserveSeat,
    unreserveSeat,
    autoAssignGuests,
    getUnassignedGuests,
} from '@/actions/seating.actions';
import { TableShape } from '@/generated/prisma';

interface SeatingArrangementProps {
    inviteOnlyEventId: string;
    invitations: any[];
}

export function SeatingArrangement({
    inviteOnlyEventId,
    invitations,
}: SeatingArrangementProps) {
    const [tables, setTables] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalTables: 0,
        totalSeats: 0,
        assignedSeats: 0,
        reservedSeats: 0,
        availableSeats: 0,
    });
    const [unassignedGuests, setUnassignedGuests] = useState<any[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<any>(null);
    const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
    const [isEditTableDialogOpen, setIsEditTableDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [editingTable, setEditingTable] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [newTable, setNewTable] = useState<{
        tableNumber: number;
        tableName: string;
        capacity: number;
        shape: TableShape;
        notes: string;
    }>({
        tableNumber: 1,
        tableName: '',
        capacity: 8,
        shape: TableShape.ROUND,
        notes: '',
    });


    useEffect(() => {
        loadSeatingData();
    }, [inviteOnlyEventId]);

    const loadSeatingData = async () => {
        setLoading(true);
        try {
            const [tablesResult, guestsResult] = await Promise.all([
                getSeatingTables(inviteOnlyEventId),
                getUnassignedGuests(inviteOnlyEventId),
            ]);

            if (tablesResult.success && tablesResult.data) {
                setTables(tablesResult.data.tables);
                setStats(tablesResult.data.stats);
            }

            if (guestsResult.success && guestsResult.data) {
                setUnassignedGuests(guestsResult.data);
            }
        } catch (error) {
            console.error('Error loading seating data:', error);
            toast.error('Failed to load seating arrangement');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTable = async () => {
        if (!newTable.tableNumber || !newTable.capacity) {
            toast.error('Table number and capacity are required');
            return;
        }

        if (newTable.capacity < 1 || newTable.capacity > 20) {
            toast.error('Capacity must be between 1 and 20');
            return;
        }

        setLoading(true);
        const result = await createSeatingTable({
            inviteOnlyEventId,
            ...newTable,
        });

        if (result.success) {
            toast.success(result.message);
            setIsAddTableDialogOpen(false);
            setNewTable({
                tableNumber: Math.max(...tables.map((t) => t.tableNumber), 0) + 1,
                tableName: '',
                capacity: 8,
                shape: TableShape.ROUND,
                notes: '',
            });
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const handleUpdateTable = async () => {
        if (!editingTable) return;

        setLoading(true);
        const result = await updateSeatingTable({
            id: editingTable.id,
            tableNumber: editingTable.tableNumber,
            tableName: editingTable.tableName,
            capacity: editingTable.capacity,
            shape: editingTable.shape,
            notes: editingTable.notes,
        });

        if (result.success) {
            toast.success(result.message);
            setIsEditTableDialogOpen(false);
            setEditingTable(null);
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const handleDeleteTable = async (tableId: string) => {
        if (!confirm('Are you sure you want to delete this table?')) return;

        setLoading(true);
        const result = await deleteSeatingTable(tableId);

        if (result.success) {
            toast.success(result.message);
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const handleAssignGuest = async (invitationId: string) => {
        if (!selectedSeat) return;

        setLoading(true);
        const result = await assignGuestToSeat({
            seatId: selectedSeat.id,
            invitationId,
        });

        if (result.success) {
            toast.success(result.message);
            setIsAssignDialogOpen(false);
            setSelectedSeat(null);
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const handleUnassignGuest = async (seatId: string) => {
        if (!confirm('Are you sure you want to unassign this guest?')) return;

        setLoading(true);
        const result = await unassignGuestFromSeat(seatId);

        if (result.success) {
            toast.success(result.message);
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const handleAutoAssign = async () => {
        if (
            !confirm(
                'This will automatically assign all unassigned guests to available seats. Continue?'
            )
        ) {
            return;
        }

        setLoading(true);
        const result = await autoAssignGuests(inviteOnlyEventId);

        if (result.success) {
            toast.success(result.message);
            await loadSeatingData();
        } else {
            toast.error(result.message);
        }
        setLoading(false);
    };

    const getTableShapeIcon = (shape: TableShape) => {
        switch (shape) {
            case TableShape.ROUND:
            case TableShape.OVAL:
                return <Circle className="h-4 w-4" />;
            case TableShape.SQUARE:
            case TableShape.RECTANGLE:
                return <Square className="h-4 w-4" />;
            default:
                return <Minus className="h-4 w-4" />;
        }
    };

    const getSeatStatusBadge = (seat: any) => {
        if (seat.invitation) {
            return (
                <Badge variant="default" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assigned
                </Badge>
            );
        }
        if (seat.isReserved) {
            return (
                <Badge variant="secondary" className="text-xs">
                    Reserved
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-xs">
                Available
            </Badge>
        );
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{stats.totalTables}</div>
                            <div className="text-sm text-muted-foreground">Tables</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{stats.totalSeats}</div>
                            <div className="text-sm text-muted-foreground">Total Seats</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {stats.assignedSeats}
                            </div>
                            <div className="text-sm text-muted-foreground">Assigned</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                                {stats.reservedSeats}
                            </div>
                            <div className="text-sm text-muted-foreground">Reserved</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {stats.availableSeats}
                            </div>
                            <div className="text-sm text-muted-foreground">Available</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsAddTableDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Table
                    </Button>
                    {unassignedGuests.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleAutoAssign}
                            disabled={loading || stats.availableSeats < unassignedGuests.length}
                            className="gap-2"
                        >
                            <Shuffle className="h-4 w-4" />
                            Auto-Assign ({unassignedGuests.length})
                        </Button>
                    )}
                </div>
            </div>

            {/* Unassigned Guests */}
            {unassignedGuests.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <UserX className="h-5 w-5" />
                            Unassigned Guests ({unassignedGuests.length})
                        </CardTitle>
                        <CardDescription>
                            These guests need to be assigned to seats
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {unassignedGuests.map((guest) => (
                                <div
                                    key={guest.id}
                                    className="p-2 bg-white rounded border text-sm"
                                >
                                    <div className="font-medium">{guest.guestName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {guest.guestEmail}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Armchair className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Tables Yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Create your first table to start arranging seating
                        </p>
                        <Button onClick={() => setIsAddTableDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create First Table
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tables.map((table) => (
                        <Card key={table.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {getTableShapeIcon(table.shape)}
                                        <div>
                                            <CardTitle className="text-lg">
                                                Table {table.tableNumber}
                                                {table.tableName && (
                                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                                        ({table.tableName})
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {table.shape} • {table.capacity} seats
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setEditingTable(table);
                                                    setIsEditTableDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Table
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteTable(table.id)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Table
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {table.seats.map((seat: any) => (
                                            <div
                                                key={seat.id}
                                                className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                                                onClick={() => {
                                                    if (!seat.invitation) {
                                                        setSelectedSeat(seat);
                                                        setIsAssignDialogOpen(true);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Armchair className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            Seat {seat.seatNumber}
                                                        </div>
                                                        {seat.invitation && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {seat.invitation.guestName}
                                                            </div>
                                                        )}
                                                        {seat.isReserved && !seat.invitation && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Reserved
                                                                {seat.reservedFor && ` for ${seat.reservedFor}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getSeatStatusBadge(seat)}
                                                    {seat.invitation && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnassignGuest(seat.id);
                                                            }}
                                                        >
                                                            <UserX className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Table Dialog */}
            <Dialog open={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Table</DialogTitle>
                        <DialogDescription>
                            Create a new seating table for your event
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tableNumber">Table Number *</Label>
                                <Input
                                    id="tableNumber"
                                    type="number"
                                    min="1"
                                    value={newTable.tableNumber}
                                    onChange={(e) =>
                                        setNewTable({
                                            ...newTable,
                                            tableNumber: parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="capacity">Capacity *</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={newTable.capacity}
                                    onChange={(e) =>
                                        setNewTable({
                                            ...newTable,
                                            capacity: parseInt(e.target.value) || 8,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="tableName">Table Name (Optional)</Label>
                            <Input
                                id="tableName"
                                placeholder="e.g., VIP Table, Family Table"
                                value={newTable.tableName}
                                onChange={(e) =>
                                    setNewTable({ ...newTable, tableName: e.target.value })
                                }
                            />
                        </div>
                        <div>
                            <Label htmlFor="shape">Table Shape</Label>
                            <Select
                                value={newTable.shape as string}
                                onValueChange={(value) =>
                                    setNewTable({ ...newTable, shape: value as TableShape })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ROUND">Round</SelectItem>
                                    <SelectItem value="RECTANGLE">Rectangle</SelectItem>
                                    <SelectItem value="SQUARE">Square</SelectItem>
                                    <SelectItem value="OVAL">Oval</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Any special notes about this table..."
                                value={newTable.notes}
                                onChange={(e) =>
                                    setNewTable({ ...newTable, notes: e.target.value })
                                }
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddTableDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddTable} disabled={loading}>
                            {loading ? 'Creating...' : 'Create Table'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Table Dialog */}
            <Dialog
                open={isEditTableDialogOpen}
                onOpenChange={setIsEditTableDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Table</DialogTitle>
                        <DialogDescription>
                            Update table details and configuration
                        </DialogDescription>
                    </DialogHeader>
                    {editingTable && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-tableNumber">Table Number *</Label>
                                    <Input
                                        id="edit-tableNumber"
                                        type="number"
                                        min="1"
                                        value={editingTable.tableNumber}
                                        onChange={(e) =>
                                            setEditingTable({
                                                ...editingTable,
                                                tableNumber: parseInt(e.target.value) || 1,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-capacity">Capacity *</Label>
                                    <Input
                                        id="edit-capacity"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={editingTable.capacity}
                                        onChange={(e) =>
                                            setEditingTable({
                                                ...editingTable,
                                                capacity: parseInt(e.target.value) || 8,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="edit-tableName">Table Name (Optional)</Label>
                                <Input
                                    id="edit-tableName"
                                    value={editingTable.tableName || ''}
                                    onChange={(e) =>
                                        setEditingTable({
                                            ...editingTable,
                                            tableName: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-shape">Table Shape</Label>
                                <Select
                                    value={editingTable.shape as string}
                                    onValueChange={(value) =>
                                        setEditingTable({
                                            ...editingTable,
                                            shape: value as TableShape,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ROUND">Round</SelectItem>
                                        <SelectItem value="RECTANGLE">Rectangle</SelectItem>
                                        <SelectItem value="SQUARE">Square</SelectItem>
                                        <SelectItem value="OVAL">Oval</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                                <Textarea
                                    id="edit-notes"
                                    value={editingTable.notes || ''}
                                    onChange={(e) =>
                                        setEditingTable({ ...editingTable, notes: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditTableDialogOpen(false);
                                setEditingTable(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateTable} disabled={loading}>
                            {loading ? 'Updating...' : 'Update Table'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Guest Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Guest to Seat</DialogTitle>
                        <DialogDescription>
                            {selectedSeat &&
                                `Select a guest for Table ${selectedSeat.table.tableNumber}, Seat ${selectedSeat.seatNumber}`}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                        <div className="space-y-2">
                            {unassignedGuests.map((guest) => (
                                <Button
                                    key={guest.id}
                                    variant="outline"
                                    className="w-full justify-start h-auto py-3"
                                    onClick={() => handleAssignGuest(guest.id)}
                                    disabled={loading}
                                >
                                    <div className="text-left">
                                        <div className="font-medium">{guest.guestName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {guest.guestEmail}
                                        </div>
                                        {guest.plusOnesConfirmed > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                +{guest.plusOnesConfirmed} guest(s)
                                            </div>
                                        )}
                                    </div>
                                </Button>
                            ))}
                            {unassignedGuests.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    All guests have been assigned
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAssignDialogOpen(false);
                                setSelectedSeat(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}