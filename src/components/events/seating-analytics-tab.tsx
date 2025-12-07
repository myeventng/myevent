'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Armchair,
    Users,
    AlertCircle,
    Circle,
    Square,
    Minus,
    UserCheck,
    Clock,
    MapPin,
} from 'lucide-react';
import { getSeatingTables } from '@/actions/seating.actions';
import { TableShape } from '@/generated/prisma';

interface SeatingAnalyticsTabProps {
    inviteOnlyEventId: string;
}

export function SeatingAnalyticsTab({ inviteOnlyEventId }: SeatingAnalyticsTabProps) {
    const [tables, setTables] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalTables: 0,
        totalSeats: 0,
        assignedSeats: 0,
        reservedSeats: 0,
        availableSeats: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSeatingData();
    }, [inviteOnlyEventId]);

    const loadSeatingData = async () => {
        setIsLoading(true);
        try {
            const result = await getSeatingTables(inviteOnlyEventId);

            if (result.success && result.data) {
                setTables(result.data.tables);
                setStats(result.data.stats);
            }
        } catch (error) {
            console.error('Error loading seating data:', error);
        } finally {
            setIsLoading(false);
        }
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
                <Badge variant="default" className="text-xs bg-green-600">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Assigned
                </Badge>
            );
        }
        if (seat.isReserved) {
            return (
                <Badge variant="secondary" className="text-xs bg-yellow-600 text-white">
                    <Clock className="h-3 w-3 mr-1" />
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                    <p className="text-muted-foreground">Loading seating arrangement...</p>
                </div>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className="text-center py-12">
                <Armchair className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Seating Arrangement</h3>
                <p className="text-muted-foreground mb-4">
                    No tables have been set up for this event yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

            {/* Capacity Alert */}
            {stats.availableSeats === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-amber-900">At Full Capacity</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                All seats have been assigned or reserved. Consider adding more tables
                                if you need to accommodate additional guests.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table) => {
                    const assignedCount = table.seats.filter(
                        (seat: any) => seat.invitation
                    ).length;
                    const reservedCount = table.seats.filter(
                        (seat: any) => seat.isReserved && !seat.invitation
                    ).length;
                    const availableCount = table.capacity - assignedCount - reservedCount;

                    return (
                        <Card key={table.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
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
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {table.shape} • {table.capacity} seats
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div className="text-green-600 font-medium">
                                            {assignedCount} assigned
                                        </div>
                                        {reservedCount > 0 && (
                                            <div className="text-yellow-600">
                                                {reservedCount} reserved
                                            </div>
                                        )}
                                        {availableCount > 0 && (
                                            <div className="text-blue-600">
                                                {availableCount} available
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {table.seats.map((seat: any) => (
                                            <div
                                                key={seat.id}
                                                className="flex items-center justify-between p-2 border rounded hover:bg-accent"
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
                                                {getSeatStatusBadge(seat)}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {table.notes && (
                                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                                        <strong>Notes:</strong> {table.notes}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Seating Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Occupancy Rate</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full"
                                        style={{
                                            width: `${stats.totalSeats > 0 ? (stats.assignedSeats / stats.totalSeats) * 100 : 0}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-medium">
                                    {stats.totalSeats > 0
                                        ? Math.round((stats.assignedSeats / stats.totalSeats) * 100)
                                        : 0}
                                    %
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Total Capacity</h4>
                            <p className="text-2xl font-bold">{stats.totalSeats}</p>
                            <p className="text-xs text-muted-foreground">
                                Across {stats.totalTables} tables
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Remaining Capacity</h4>
                            <p className="text-2xl font-bold text-blue-600">
                                {stats.availableSeats}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Available seats
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}