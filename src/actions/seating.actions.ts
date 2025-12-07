'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { TableShape } from '@/generated/prisma';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== TABLE MANAGEMENT ====================

// CREATE SEATING TABLE
export async function createSeatingTable(data: {
  inviteOnlyEventId: string;
  tableNumber: number;
  tableName?: string;
  capacity: number;
  shape?: TableShape;
  notes?: string;
  positionX?: number;
  positionY?: number;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    // Check if table number already exists
    const existingTable = await prisma.seatingTable.findUnique({
      where: {
        inviteOnlyEventId_tableNumber: {
          inviteOnlyEventId: data.inviteOnlyEventId,
          tableNumber: data.tableNumber,
        },
      },
    });

    if (existingTable) {
      return {
        success: false,
        message: 'A table with this number already exists',
      };
    }

    const table = await prisma.seatingTable.create({
      data: {
        inviteOnlyEventId: data.inviteOnlyEventId,
        tableNumber: data.tableNumber,
        tableName: data.tableName,
        capacity: data.capacity,
        shape: data.shape || TableShape.ROUND,
        notes: data.notes,
        positionX: data.positionX,
        positionY: data.positionY,
      },
      include: {
        seats: true,
      },
    });

    // Automatically create seats based on capacity
    const seats = [];
    for (let i = 1; i <= data.capacity; i++) {
      seats.push({
        tableId: table.id,
        seatNumber: i,
      });
    }

    await prisma.seat.createMany({
      data: seats,
    });

    const tableWithSeats = await prisma.seatingTable.findUnique({
      where: { id: table.id },
      include: {
        seats: {
          include: {
            invitation: {
              select: {
                id: true,
                guestName: true,
                guestEmail: true,
                status: true,
              },
            },
          },
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Seating table created successfully',
      data: tableWithSeats,
    };
  } catch (error) {
    console.error('Error creating seating table:', error);
    return {
      success: false,
      message: 'Failed to create seating table',
    };
  }
}

// UPDATE SEATING TABLE
export async function updateSeatingTable(data: {
  id: string;
  tableNumber?: number;
  tableName?: string;
  capacity?: number;
  shape?: TableShape;
  notes?: string;
  positionX?: number;
  positionY?: number;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const existingTable = await prisma.seatingTable.findUnique({
      where: { id: data.id },
      include: { seats: true },
    });

    if (!existingTable) {
      return {
        success: false,
        message: 'Table not found',
      };
    }

    // If capacity is being increased, add more seats
    if (data.capacity && data.capacity > existingTable.capacity) {
      const newSeats = [];
      for (let i = existingTable.capacity + 1; i <= data.capacity; i++) {
        newSeats.push({
          tableId: existingTable.id,
          seatNumber: i,
        });
      }
      await prisma.seat.createMany({
        data: newSeats,
      });
    }

    // If capacity is being decreased, remove excess seats (only unassigned ones)
    if (data.capacity && data.capacity < existingTable.capacity) {
      const seatsToRemove = existingTable.seats
        .filter(
          (seat) => seat.seatNumber > data.capacity! && !seat.invitationId
        )
        .map((seat) => seat.id);

      if (seatsToRemove.length > 0) {
        await prisma.seat.deleteMany({
          where: {
            id: { in: seatsToRemove },
          },
        });
      }

      // Check if there are assigned seats that would be removed
      const assignedSeatsToRemove = existingTable.seats.filter(
        (seat) => seat.seatNumber > data.capacity! && seat.invitationId
      );

      if (assignedSeatsToRemove.length > 0) {
        return {
          success: false,
          message: `Cannot reduce capacity below ${existingTable.capacity}. There are guests assigned to seats ${data.capacity! + 1}-${existingTable.capacity}.`,
        };
      }
    }

    const updatedTable = await prisma.seatingTable.update({
      where: { id: data.id },
      data: {
        tableNumber: data.tableNumber,
        tableName: data.tableName,
        capacity: data.capacity,
        shape: data.shape,
        notes: data.notes,
        positionX: data.positionX,
        positionY: data.positionY,
      },
      include: {
        seats: {
          include: {
            invitation: {
              select: {
                id: true,
                guestName: true,
                guestEmail: true,
                status: true,
              },
            },
          },
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Seating table updated successfully',
      data: updatedTable,
    };
  } catch (error) {
    console.error('Error updating seating table:', error);
    return {
      success: false,
      message: 'Failed to update seating table',
    };
  }
}

// DELETE SEATING TABLE
export async function deleteSeatingTable(
  id: string
): Promise<ActionResponse<null>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    // Check if table has assigned seats
    const table = await prisma.seatingTable.findUnique({
      where: { id },
      include: {
        seats: {
          where: {
            invitationId: {
              not: null,
            },
          },
        },
      },
    });

    if (table && table.seats.length > 0) {
      return {
        success: false,
        message:
          'Cannot delete table with assigned guests. Please unassign guests first.',
      };
    }

    await prisma.seatingTable.delete({
      where: { id },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Seating table deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting seating table:', error);
    return {
      success: false,
      message: 'Failed to delete seating table',
    };
  }
}

// GET ALL TABLES FOR EVENT
export async function getSeatingTables(
  inviteOnlyEventId: string
): Promise<ActionResponse<any>> {
  try {
    const tables = await prisma.seatingTable.findMany({
      where: { inviteOnlyEventId },
      include: {
        seats: {
          include: {
            invitation: {
              select: {
                id: true,
                guestName: true,
                guestEmail: true,
                status: true,
                plusOnesConfirmed: true,
              },
            },
          },
          orderBy: {
            seatNumber: 'asc',
          },
        },
      },
      orderBy: {
        tableNumber: 'asc',
      },
    });

    // Calculate statistics
    const stats = {
      totalTables: tables.length,
      totalSeats: tables.reduce((sum, table) => sum + table.capacity, 0),
      assignedSeats: tables.reduce(
        (sum, table) =>
          sum + table.seats.filter((seat) => seat.invitationId).length,
        0
      ),
      reservedSeats: tables.reduce(
        (sum, table) =>
          sum +
          table.seats.filter((seat) => seat.isReserved && !seat.invitationId)
            .length,
        0
      ),
      availableSeats: 0,
    };

    stats.availableSeats =
      stats.totalSeats - stats.assignedSeats - stats.reservedSeats;

    return {
      success: true,
      data: {
        tables,
        stats,
      },
    };
  } catch (error) {
    console.error('Error fetching seating tables:', error);
    return {
      success: false,
      message: 'Failed to fetch seating tables',
    };
  }
}

// ==================== SEAT ASSIGNMENT ====================

// ASSIGN GUEST TO SEAT
export async function assignGuestToSeat(data: {
  seatId: string;
  invitationId: string;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    // Check if seat is available
    const seat = await prisma.seat.findUnique({
      where: { id: data.seatId },
      include: { invitation: true },
    });

    if (!seat) {
      return {
        success: false,
        message: 'Seat not found',
      };
    }

    if (seat.invitationId && seat.invitationId !== data.invitationId) {
      return {
        success: false,
        message: 'Seat is already assigned to another guest',
      };
    }

    // Check if invitation is already assigned to another seat
    const existingAssignment = await prisma.seat.findFirst({
      where: {
        invitationId: data.invitationId,
        id: { not: data.seatId },
      },
      include: {
        table: true,
      },
    });

    if (existingAssignment) {
      return {
        success: false,
        message: `Guest is already assigned to Table ${existingAssignment.table.tableNumber}, Seat ${existingAssignment.seatNumber}`,
      };
    }

    const updatedSeat = await prisma.seat.update({
      where: { id: data.seatId },
      data: {
        invitationId: data.invitationId,
        isReserved: false,
        reservedFor: null,
      },
      include: {
        invitation: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            status: true,
          },
        },
        table: true,
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Guest assigned to seat successfully',
      data: updatedSeat,
    };
  } catch (error) {
    console.error('Error assigning guest to seat:', error);
    return {
      success: false,
      message: 'Failed to assign guest to seat',
    };
  }
}

// UNASSIGN GUEST FROM SEAT
export async function unassignGuestFromSeat(
  seatId: string
): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const updatedSeat = await prisma.seat.update({
      where: { id: seatId },
      data: {
        invitationId: null,
      },
      include: {
        table: true,
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Guest unassigned from seat',
      data: updatedSeat,
    };
  } catch (error) {
    console.error('Error unassigning guest from seat:', error);
    return {
      success: false,
      message: 'Failed to unassign guest from seat',
    };
  }
}

// RESERVE SEAT (without assigning guest)
export async function reserveSeat(data: {
  seatId: string;
  reservedFor?: string;
  notes?: string;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const seat = await prisma.seat.findUnique({
      where: { id: data.seatId },
    });

    if (!seat) {
      return {
        success: false,
        message: 'Seat not found',
      };
    }

    if (seat.invitationId) {
      return {
        success: false,
        message: 'Cannot reserve a seat that is already assigned',
      };
    }

    const updatedSeat = await prisma.seat.update({
      where: { id: data.seatId },
      data: {
        isReserved: true,
        reservedFor: data.reservedFor,
        notes: data.notes,
      },
      include: {
        table: true,
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Seat reserved successfully',
      data: updatedSeat,
    };
  } catch (error) {
    console.error('Error reserving seat:', error);
    return {
      success: false,
      message: 'Failed to reserve seat',
    };
  }
}

// UNRESERVE SEAT
export async function unreserveSeat(
  seatId: string
): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const updatedSeat = await prisma.seat.update({
      where: { id: seatId },
      data: {
        isReserved: false,
        reservedFor: null,
      },
      include: {
        table: true,
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: 'Seat unreserved',
      data: updatedSeat,
    };
  } catch (error) {
    console.error('Error unreserving seat:', error);
    return {
      success: false,
      message: 'Failed to unreserve seat',
    };
  }
}

// AUTO-ASSIGN GUESTS TO AVAILABLE SEATS
export async function autoAssignGuests(
  inviteOnlyEventId: string
): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    // Get unassigned guests
    const unassignedGuests = await prisma.invitation.findMany({
      where: {
        inviteOnlyEventId,
        seat: null,
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get available seats
    const availableSeats = await prisma.seat.findMany({
      where: {
        table: {
          inviteOnlyEventId,
        },
        invitationId: null,
        isReserved: false,
      },
      include: {
        table: true,
      },
      orderBy: [{ table: { tableNumber: 'asc' } }, { seatNumber: 'asc' }],
    });

    if (unassignedGuests.length === 0) {
      return {
        success: false,
        message: 'No unassigned guests to assign',
      };
    }

    if (availableSeats.length < unassignedGuests.length) {
      return {
        success: false,
        message: `Not enough available seats. Need ${unassignedGuests.length}, have ${availableSeats.length}`,
      };
    }

    // Assign guests to seats
    const assignments = [];
    for (let i = 0; i < unassignedGuests.length; i++) {
      assignments.push(
        prisma.seat.update({
          where: { id: availableSeats[i].id },
          data: { invitationId: unassignedGuests[i].id },
        })
      );
    }

    await prisma.$transaction(assignments);

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: `Successfully assigned ${unassignedGuests.length} guests to seats`,
      data: { assignedCount: unassignedGuests.length },
    };
  } catch (error) {
    console.error('Error auto-assigning guests:', error);
    return {
      success: false,
      message: 'Failed to auto-assign guests',
    };
  }
}

// GET UNASSIGNED GUESTS
export async function getUnassignedGuests(
  inviteOnlyEventId: string
): Promise<ActionResponse<any>> {
  try {
    const unassignedGuests = await prisma.invitation.findMany({
      where: {
        inviteOnlyEventId,
        seat: null,
      },
      orderBy: {
        guestName: 'asc',
      },
    });

    return {
      success: true,
      data: unassignedGuests,
    };
  } catch (error) {
    console.error('Error fetching unassigned guests:', error);
    return {
      success: false,
      message: 'Failed to fetch unassigned guests',
    };
  }
}

// ENABLE/DISABLE SEATING ARRANGEMENT
export async function toggleSeatingArrangement(data: {
  inviteOnlyEventId: string;
  enabled: boolean;
}): Promise<ActionResponse<any>> {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
      };
    }

    const updatedEvent = await prisma.inviteOnlyEvent.update({
      where: { id: data.inviteOnlyEventId },
      data: {
        enableSeatingArrangement: data.enabled,
      },
    });

    revalidatePath('/dashboard/events');

    return {
      success: true,
      message: `Seating arrangement ${data.enabled ? 'enabled' : 'disabled'}`,
      data: updatedEvent,
    };
  } catch (error) {
    console.error('Error toggling seating arrangement:', error);
    return {
      success: false,
      message: 'Failed to update seating arrangement setting',
    };
  }
}
