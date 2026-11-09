// src/actions/ticket.actions.ts
"use server";

import { getEventPhysicalInventory, getPhysicalInventoryForEvents } from "@/lib/ticket-generation/offline-sales";
import { ONLINE_SOLD_WHERE, PHYSICAL_ISSUED_WHERE } from "@/lib/ticket-stats";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCachedSetting } from "@/lib/platform-settings";
import { aggregateOrderFinancials, resolveCommission, bpsToPercent } from "@/lib/commission-service";
import { validateScan, getScannerMode } from "@/lib/scanner/validate";
import { signScanSession, channelAllowed } from "@/lib/scanner/session";
import { can, isOwnerOrAdmin, resolveEventAccess } from "@/lib/staff/access";
interface TicketTypeInput {
  name: string;
  price: number;
  quantity: number; // ONLINE stock
  physicalQuantity?: number; // PHYSICAL stock (independent; omit to leave unchanged on update)
  eventId: string;
}

interface UpdateTicketTypeInput extends TicketTypeInput {
  id: string;
}

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  alreadyUsed?: boolean;
}

// Enhanced ticket type with guest information
interface TicketWithGuestInfo {
  id: string;
  ticketId: string;
  status: string;
  purchasedAt: Date;
  userId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  ticketType: any;
  order: any;
  validations?: any[];
  guestInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

function extractGuestInfo(order: any) {
  if (!order?.purchaseNotes) return null;

  try {
    const notes = JSON.parse(order.purchaseNotes);
    if (notes.isGuestPurchase) {
      return {
        name: notes.guestName,
        email: notes.guestEmail,
        phone: notes.guestPhone,
      };
    }
  } catch (error) {
    console.error("Failed to parse guest info:", error);
  }

  return null;
}

// Helper function to get validation window settings
async function getValidationWindows() {
  const [earlyEntry, lateEntry] = await Promise.all([
    getCachedSetting("events.earlyEntryHours"),
    getCachedSetting("events.lateEntryHours"),
  ]);

  return {
    earlyEntryHours: earlyEntry || 1, // Default 1 hour before
    lateEntryHours: lateEntry || 2, // Default 2 hours after
  };
}

// Validate ticket for event entry.
// All decision logic lives in src/lib/scanner/validate.ts (atomic check-in, permission
// re-check on every scan, signed scan session, per-event scanner mode).
export async function validateTicket(
  ticketId: string,
  eventId: string,
  sessionToken: string,
): Promise<ActionResponse<any> & { outcome?: string; alreadyUsed?: boolean; firstScan?: { at: string; by: string | null } }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, message: "Not authenticated" };

  try {
    const result = await validateScan({
      actor: { id: session.user.id, role: session.user.role as "ADMIN" | "USER" },
      eventId,
      code: ticketId,
      sessionToken,
      windows: await getValidationWindows(),
    });
    if (result.success) {
      revalidatePath("/dashboard/scanner");
      revalidatePath("/admin/dashboard/events");
    }
    return {
      success: result.success,
      message: result.message,
      outcome: result.outcome,
      alreadyUsed: result.outcome === "ALREADY_USED",
      firstScan: result.firstScan,
      data: result.ticket
        ? { ticketId: result.ticket.serial, ticketType: { name: result.ticket.typeName }, user: result.ticket.holderName ? { name: result.ticket.holderName } : null, source: result.ticket.source, usedAt: result.ticket.usedAt }
        : undefined,
    };
  } catch (error) {
    console.error("Error validating ticket:", error);
    return { success: false, message: "Failed to validate ticket" };
  }
}

// Issue a short-lived, channel-bound scan session. The channel is checked against the
// event's CURRENT scanner mode on the server before a session is handed out and again on every scan.
export async function getScanSession(
  eventId: string,
  channel: "CAMERA" | "KEYBOARD",
): Promise<ActionResponse<{ token: string; expiresAt: number; mode: "INBUILT_ONLY" | "UNIVERSAL" }>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, message: "Not authenticated" };
  if (channel !== "CAMERA" && channel !== "KEYBOARD") return { success: false, message: "Invalid channel" };
  const access = await resolveEventAccess({ id: session.user.id, role: session.user.role as "ADMIN" | "USER" }, eventId);
  if (!can(access, "SCAN_TICKETS")) return { success: false, message: "You do not have permission to scan tickets for this event" };
  const mode = await getScannerMode(eventId);
  if (!channelAllowed(mode, channel)) return { success: false, message: "This event only accepts the in-built camera scanner" };
  const { token, expiresAt } = signScanSession(session.user.id, eventId, channel);
  return { success: true, data: { token, expiresAt, mode } };
}

// Get validation history for an event
export async function getTicketValidations(
  eventId: string,
  page: number = 1,
  limit: number = 50,
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    // Check permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
      };
    }

    const vAccess = await resolveEventAccess({ id: session.user.id, role: session.user.role as "ADMIN" | "USER" }, eventId);
    if (!can(vAccess, "SCAN_TICKETS") && !can(vAccess, "VIEW_CHECKIN_STATS")) {
      return {
        success: false,
        message:
          "You do not have permission to view validations for this event",
      };
    }

    const skip = (page - 1) * limit;

    const [validations, totalCount] = await Promise.all([
      prisma.ticketValidation.findMany({
        where: { eventId },
        include: {
          ticket: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              ticketType: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
          validator: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { validatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ticketValidation.count({
        where: { eventId },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: {
        validations,
        totalCount,
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching ticket validations:", error);
    return {
      success: false,
      message: "Failed to fetch validations",
    };
  }
}

// Get ticket statistics for an event
export async function getEventTicketStats(
  eventId: string,
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    // Check permissions
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        user: true,
      },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
      };
    }

    const sAccess = await resolveEventAccess({ id: session.user.id, role: session.user.role as "ADMIN" | "USER" }, eventId);
    if (!can(sAccess, "VIEW_CHECKIN_STATS")) {
      return {
        success: false,
        message: "You do not have permission to view stats for this event",
      };
    }
    const canSeeFinancials = isOwnerOrAdmin(sAccess);

    // Get ticket statistics
    // Sales figures count ONLINE tickets only; physical inventory is reported separately below.
    const ticketStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: {
        ticketType: {
          eventId,
        },
        source: "ONLINE",
      },
      _count: true,
    });
    const physicalStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: {
        ticketType: { eventId },
        source: { in: ["ADMIN_PHYSICAL", "ORGANIZER_PHYSICAL"] },
      },
      _count: true,
    });

    const physicalInv = await getEventPhysicalInventory(eventId);

    // Door view = every ticket that can be scanned (online + physical). `overview` stays online-only
    // because it feeds sales figures; scanner/attendance screens use `door`.
    const doorStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: { ticketType: { eventId } },
      _count: true,
    });
    const doorTotal = doorStats.reduce((s, d) => s + d._count, 0);
    const doorUsed = doorStats.find((d) => d.status === "USED")?._count || 0;
    const doorUnused = doorStats.find((d) => d.status === "UNUSED")?._count || 0;

    // Get orders statistics
    const orderStats = await prisma.order.groupBy({
      by: ["paymentStatus"],
      where: { eventId },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Get refund statistics
    const refundStats = await prisma.order.groupBy({
      by: ["refundStatus"],
      where: {
        eventId,
        refundStatus: { not: null },
      },
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Calculate totals
    const totalTickets = ticketStats.reduce(
      (sum, stat) => sum + stat._count,
      0,
    );
    const usedTickets =
      ticketStats.find((s) => s.status === "USED")?._count || 0;
    const unusedTickets =
      ticketStats.find((s) => s.status === "UNUSED")?._count || 0;
    const refundedTickets =
      ticketStats.find((s) => s.status === "REFUNDED")?._count || 0;

    const totalRevenue = orderStats
      .filter((s) => s.paymentStatus === "COMPLETED")
      .reduce((sum, stat) => sum + (stat._sum.totalAmount || 0), 0);

    const totalRefunded = refundStats
      .filter((s) => s.refundStatus === "PROCESSED")
      .reduce((sum, stat) => sum + (stat._sum.totalAmount || 0), 0);

    const netRevenue = totalRevenue - totalRefunded;

    // Commission comes from the snapshots persisted on each order — never re-derived from today's rates.
    const eventFinancials = await aggregateOrderFinancials({ eventId: event.id });
    const platformFee = eventFinancials.netFeeNaira;
    // Blended rate actually charged; before any revenue, the rate that applies to this event right now.
    const platformFeePercentage =
      eventFinancials.effectivePercent ??
      bpsToPercent((await resolveCommission({ eventId })).bps);
    const organizerRevenue = netRevenue - platformFee;

    // Get ticket type breakdown
    const ticketTypeStats = await Promise.all(
      event.ticketTypes.map(async (ticketType) => {
        // Online sales only: physical tickets are not sales and must not inflate sold/revenue.
        const sold = await prisma.ticket.count({
          where: { ticketTypeId: ticketType.id, ...ONLINE_SOLD_WHERE },
        });

        const used = await prisma.ticket.count({
          where: { ticketTypeId: ticketType.id, source: "ONLINE", status: "USED" },
        });

        const physicalIssued = await prisma.ticket.count({
          where: { ticketTypeId: ticketType.id, ...PHYSICAL_ISSUED_WHERE },
        });
        const physicalUsed = await prisma.ticket.count({
          where: {
            ticketTypeId: ticketType.id,
            source: { in: ["ADMIN_PHYSICAL", "ORGANIZER_PHYSICAL"] },
            status: "USED",
          },
        });

        const revenue = sold * ticketType.price;

        return {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price,
          totalQuantity: ticketType.quantity + sold,
          sold,
          used,
          remaining: ticketType.quantity,
          revenue,
          physicalRemaining: ticketType.physicalQuantity,
          physicalIssued,
          physicalUsed,
          // Offline inventory: sold outside the platform (organizer-recorded) vs still unsold in hand.
          soldOffline: physicalInv.byType.get(ticketType.id)?.soldOffline ?? 0,
          unsoldPhysical: physicalInv.byType.get(ticketType.id)?.unsold ?? 0,
          offlineRevenue: canSeeFinancials ? (physicalInv.byType.get(ticketType.id)?.revenueKobo ?? 0) / 100 : undefined,
        };
      }),
    );

    return {
      success: true,
      data: {
        overview: {
          totalTickets,
          usedTickets,
          unusedTickets,
          refundedTickets,
          attendanceRate:
            totalTickets > 0
              ? Math.round((usedTickets / totalTickets) * 100)
              : 0,
        },
        door: {
          totalTickets: doorTotal,
          usedTickets: doorUsed,
          unusedTickets: doorUnused,
          attendanceRate: doorTotal > 0 ? Math.round((doorUsed / doorTotal) * 100) : 0,
        },
        physical: {
          issued: physicalStats
            .filter((p) => p.status === "UNUSED" || p.status === "USED")
            .reduce((sum, p) => sum + p._count, 0),
          used: physicalStats.find((p) => p.status === "USED")?._count || 0,
          unused: physicalStats.find((p) => p.status === "UNUSED")?._count || 0,
          soldOffline: physicalInv.total.soldOffline,
          unsold: physicalInv.total.unsold,
          offlineRevenue: canSeeFinancials ? physicalInv.total.revenueKobo / 100 : undefined,
        },
        // Staff never receive financial figures; only the owner or an admin does.
        revenue: canSeeFinancials
          ? { totalRevenue, totalRefunded, netRevenue, platformFee, organizerRevenue, platformFeePercentage }
          : null,
        ticketTypes: canSeeFinancials ? ticketTypeStats : ticketTypeStats.map((t: any) => ({ ...t, revenue: undefined })),
        recentValidations: await prisma.ticketValidation.count({
          where: {
            eventId,
            validatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      },
    };
  } catch (error) {
    console.error("Error fetching event ticket stats:", error);
    return {
      success: false,
      message: "Failed to fetch ticket statistics",
    };
  }
}

// Get organizer's overall statistics
export async function getOrganizerStats(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    // Get organizer's events
    const events = await prisma.event.findMany({
      where: { userId: session.user.id },
      include: {
        orders: {
          where: { paymentStatus: "COMPLETED" },
        },
        ticketTypes: {
          include: {
            // Sales only: physical (pre-generated) tickets are inventory, not sales.
            tickets: { where: { source: "ONLINE" } },
          },
        },
      },
    });

    // Calculate overall statistics
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalRefunded = 0;
    const totalEvents = events.length;
    let activeEvents = 0;

    const offlineInv = await getPhysicalInventoryForEvents(events.map((e) => e.id));
    let totalOfflineSold = 0;
    let totalOfflineRevenue = 0;
    let totalPhysicalUnsold = 0;

    const eventStats = events.map((event) => {
      const off = offlineInv.byEvent.get(event.id);
      totalOfflineSold += off?.soldOffline ?? 0;
      totalOfflineRevenue += (off?.revenueKobo ?? 0) / 100;
      totalPhysicalUnsold += off?.unsold ?? 0;
      const eventRevenue = event.orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      );
      const ticketsSold = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.tickets.length,
        0,
      );

      totalRevenue += eventRevenue;
      totalTicketsSold += ticketsSold;

      if (new Date(event.endDateTime) > new Date()) {
        activeEvents++;
      }

      return {
        id: event.id,
        title: event.title,
        revenue: eventRevenue,
        ticketsSold,
        offlineSold: off?.soldOffline ?? 0,
        physicalUnsold: off?.unsold ?? 0,
        offlineRevenue: (off?.revenueKobo ?? 0) / 100,
        startDateTime: event.startDateTime,
        status: event.publishedStatus,
      };
    });

    // Get refunded amounts
    const refunds = await prisma.order.findMany({
      where: {
        event: { userId: session.user.id },
        refundStatus: "PROCESSED",
      },
      select: { totalAmount: true },
    });

    totalRefunded = refunds.reduce(
      (sum, refund) => sum + refund.totalAmount,
      0,
    );

    const netRevenue = totalRevenue - totalRefunded;
    const organizerFinancials = await aggregateOrderFinancials({ event: { userId: session.user.id } });
    const platformFee = organizerFinancials.netFeeNaira;
    const platformFeePercentage =
      organizerFinancials.effectivePercent ??
      bpsToPercent((await resolveCommission({ organizerId: session.user.id })).bps);
    const organizerEarnings = netRevenue - platformFee;

    return {
      success: true,
      data: {
        overview: {
          totalEvents,
          activeEvents,
          totalTicketsSold,
          // Physical tickets sold outside the platform (organizer-recorded). Kept separate: never part of
          // online sales, platform revenue, commission or payouts.
          totalOfflineSold,
          totalPhysicalUnsold,
          totalOfflineRevenue,
          totalRevenue,
          totalRefunded,
          netRevenue,
          platformFee,
          organizerEarnings,
          platformFeePercentage,
        },
        events: eventStats.sort(
          (a, b) =>
            new Date(b.startDateTime).getTime() -
            new Date(a.startDateTime).getTime(),
        ),
        monthlyRevenue: [], // TODO: Calculate monthly breakdown
      },
    };
  } catch (error) {
    console.error("Error fetching organizer stats:", error);
    return {
      success: false,
      message: "Failed to fetch organizer statistics",
    };
  }
}

// Validate if user has permission to manage ticket types for an event
const validateUserPermission = async (eventId: string) => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  const { role, subRole, id: userId } = session.user;

  // Admin with STAFF or SUPER_ADMIN subRole can always manage tickets
  if (role === "ADMIN" && ["STAFF", "SUPER_ADMIN"].includes(subRole)) {
    return {
      success: true,
      data: {
        userId,
        isAdmin: true,
      },
    };
  }

  // Check if event exists and belongs to the user
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return {
      success: false,
      message: "Event not found",
    };
  }

  // If user is an organizer and owns the event
  if (subRole === "ORGANIZER" && event.userId === userId) {
    return {
      success: true,
      data: {
        userId,
        isAdmin: false,
      },
    };
  }

  return {
    success: false,
    message: "You do not have permission to manage tickets for this event",
  };
};

export async function getTicketTypesByEvent(
  eventId: string,
): Promise<ActionResponse<any[]>> {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      orderBy: { price: "asc" },
    });

    return {
      success: true,
      data: ticketTypes,
    };
  } catch (error) {
    console.error(`Error fetching ticket types for event ${eventId}:`, error);
    return {
      success: false,
      message: "Failed to fetch ticket types",
    };
  }
}

export async function getTicketTypeById(
  id: string,
): Promise<ActionResponse<any>> {
  try {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: "Ticket type not found",
      };
    }

    return {
      success: true,
      data: ticketType,
    };
  } catch (error) {
    console.error(`Error fetching ticket type with ID ${id}:`, error);
    return {
      success: false,
      message: "Failed to fetch ticket type",
    };
  }
}

export async function createTicketType(
  data: TicketTypeInput,
): Promise<ActionResponse<any>> {
  // Validate user permission
  const permissionCheck = await validateUserPermission(data.eventId);
  if (!permissionCheck.success) {
    return {
      success: permissionCheck.success,
      message: permissionCheck.message,
    };
  }

  try {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      return {
        success: false,
        message: "Event not found",
      };
    }

    // Create new ticket type
    const newTicketType = await prisma.ticketType.create({
      data: {
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        physicalQuantity: Math.max(0, Math.floor(data.physicalQuantity ?? 0)),
        event: { connect: { id: data.eventId } },
      },
    });

    revalidatePath(`/admin/events/${data.eventId}`);
    revalidatePath(`/dashboard/events/${data.eventId}`);
    revalidatePath(`/events/${data.eventId}`);

    return {
      success: true,
      message: "Ticket type created successfully",
      data: newTicketType,
    };
  } catch (error) {
    console.error("Error creating ticket type:", error);
    return {
      success: false,
      message: "Failed to create ticket type",
    };
  }
}

export async function updateTicketType(
  data: UpdateTicketTypeInput,
): Promise<ActionResponse<any>> {
  try {
    // Check if ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: data.id },
      include: {
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: "Ticket type not found",
      };
    }

    // Validate user permission
    const permissionCheck = await validateUserPermission(ticketType.eventId);
    if (!permissionCheck.success) {
      return {
        success: permissionCheck.success,
        message: permissionCheck.message,
        data: null,
      };
    }

    // Update ticket type
    const updatedTicketType = await prisma.ticketType.update({
      where: { id: data.id },
      data: {
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        // Only touched when explicitly provided, so editing online details can never overwrite
        // physical stock that a batch has just reserved (and vice versa).
        ...(data.physicalQuantity !== undefined
          ? { physicalQuantity: Math.max(0, Math.floor(data.physicalQuantity)) }
          : {}),
      },
    });

    revalidatePath(`/admin/events/${ticketType.eventId}`);
    revalidatePath(`/dashboard/events/${ticketType.eventId}`);
    revalidatePath(`/events/${ticketType.eventId}`);

    return {
      success: true,
      message: "Ticket type updated successfully",
      data: updatedTicketType,
    };
  } catch (error) {
    console.error("Error updating ticket type:", error);
    return {
      success: false,
      message: "Failed to update ticket type",
    };
  }
}

export async function deleteTicketType(
  id: string,
): Promise<ActionResponse<null>> {
  try {
    // Check if ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: {
        tickets: true,
        event: true,
      },
    });

    if (!ticketType) {
      return {
        success: false,
        message: "Ticket type not found",
      };
    }

    // Validate user permission
    const permissionCheck = await validateUserPermission(ticketType.eventId);
    if (!permissionCheck.success) {
      return {
        success: permissionCheck.success,
        message: permissionCheck.message,
        data: null,
      };
    }

    // Check if ticket type has associated tickets
    if (ticketType.tickets.length > 0) {
      return {
        success: false,
        message: "Cannot delete ticket type with sold tickets",
      };
    }

    // Delete ticket type
    await prisma.ticketType.delete({
      where: { id },
    });

    revalidatePath(`/admin/events/${ticketType.eventId}`);
    revalidatePath(`/dashboard/events/${ticketType.eventId}`);
    revalidatePath(`/events/${ticketType.eventId}`);

    return {
      success: true,
      message: "Ticket type deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting ticket type:", error);
    return {
      success: false,
      message: "Failed to delete ticket type",
    };
  }
}

// User ticket actions
export async function getUserTickets(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        ticketType: {
          include: {
            event: {
              include: {
                venue: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    return {
      success: true,
      data: tickets,
    };
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return {
      success: false,
      message: "Failed to fetch tickets",
    };
  }
}

export async function getTicketById(id: string): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketType: {
          include: {
            event: {
              include: {
                venue: true,
                tags: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
      };
    }

    // Admin can view any ticket, but regular users can only view their own tickets
    if (session.user.role !== "ADMIN" && ticket.userId !== session.user.id) {
      return {
        success: false,
        message: "You do not have permission to view this ticket",
      };
    }

    return {
      success: true,
      data: ticket,
    };
  } catch (error) {
    console.error(`Error fetching ticket with ID ${id}:`, error);
    return {
      success: false,
      message: "Failed to fetch ticket",
    };
  }
}

export async function getAdminTickets(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  // Check if user is admin with proper permissions
  const { role, subRole } = session.user;
  if (role !== "ADMIN" || !["STAFF", "SUPER_ADMIN"].includes(subRole)) {
    return {
      success: false,
      message: "You do not have permission to view admin tickets",
    };
  }

  try {
    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startDateTime: true,
                endDateTime: true,
                publishedStatus: true,
                venue: {
                  select: {
                    name: true,
                    address: true,
                    city: {
                      select: {
                        name: true,
                        state: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            paystackId: true,
            paymentStatus: true,
            refundStatus: true,
            totalAmount: true,
            purchaseNotes: true, // IMPORTANT: Include purchase notes for guest info
          },
        },
      },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    // Enhance tickets with guest information
    const ticketsWithGuestInfo = tickets.map((ticket) => {
      if (!ticket.userId && ticket.order) {
        const guestInfo = extractGuestInfo(ticket.order);
        if (guestInfo) {
          return {
            ...ticket,
            guestInfo,
          };
        }
      }
      return ticket;
    });

    return {
      success: true,
      data: ticketsWithGuestInfo,
    };
  } catch (error) {
    console.error("Error fetching admin tickets:", error);
    return {
      success: false,
      message: "Failed to fetch tickets",
    };
  }
}

// Get filtered admin tickets with pagination and search
export async function getFilteredAdminTickets(
  page: number = 1,
  limit: number = 50,
  filters?: {
    status?: string;
    eventId?: string;
    userId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    isGuest?: boolean; // NEW: Filter for guest purchases
    source?: "ONLINE" | "PHYSICAL";
  },
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  // Check permissions
  const { role, subRole } = session.user;
  if (role !== "ADMIN" || !["STAFF", "SUPER_ADMIN"].includes(subRole)) {
    return {
      success: false,
      message: "You do not have permission to view admin tickets",
    };
  }

  try {
    const skip = (page - 1) * limit;

    // Build where clause based on filters
    const whereClause: any = {};

    if (filters?.status && filters.status !== "all") {
      whereClause.status = filters.status;
    }

    if (filters?.eventId) {
      whereClause.ticketType = {
        eventId: filters.eventId,
      };
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId;
    }

    // Filter by how the ticket was issued: sold online vs generated physical tickets.
    if (filters?.source === "ONLINE") {
      whereClause.source = "ONLINE";
    } else if (filters?.source === "PHYSICAL") {
      whereClause.source = { in: ["ADMIN_PHYSICAL", "ORGANIZER_PHYSICAL"] };
    }

    // NEW: Filter by guest purchases
    if (filters?.isGuest !== undefined) {
      if (filters.isGuest) {
        // Show only guest tickets (no userId). Physical tickets also have no user but are not guests.
        whereClause.userId = null;
        if (!whereClause.source) whereClause.source = "ONLINE";
      } else {
        // Show only authenticated tickets (has userId)
        whereClause.userId = { not: null };
      }
    }

    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.purchasedAt = {};
      if (filters.dateFrom) {
        whereClause.purchasedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.purchasedAt.lte = new Date(filters.dateTo);
      }
    }

    // Handle search across multiple fields INCLUDING GUEST INFO
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();

      // First get all tickets to search in purchaseNotes
      const allTickets = await prisma.ticket.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          ticketType: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startDateTime: true,
                  endDateTime: true,
                  publishedStatus: true,
                  venue: {
                    select: {
                      name: true,
                      address: true,
                      city: {
                        select: {
                          name: true,
                          state: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              paystackId: true,
              paymentStatus: true,
              refundStatus: true,
              totalAmount: true,
              purchaseNotes: true,
            },
          },
        },
      });

      // Filter tickets based on search term
      const filteredTickets = allTickets.filter((ticket) => {
        // Search in ticket ID
        if (ticket.ticketId.toLowerCase().includes(searchTerm)) return true;

        // Search in authenticated user info
        if (ticket.user) {
          if (ticket.user.name?.toLowerCase().includes(searchTerm)) return true;
          if (ticket.user.email?.toLowerCase().includes(searchTerm))
            return true;
        }

        // Search in guest info
        if (!ticket.userId && ticket.order) {
          const guestInfo = extractGuestInfo(ticket.order);
          if (guestInfo) {
            if (guestInfo.name?.toLowerCase().includes(searchTerm)) return true;
            if (guestInfo.email?.toLowerCase().includes(searchTerm))
              return true;
          }
        }

        // Search in ticket type and event
        if (ticket.ticketType.name.toLowerCase().includes(searchTerm))
          return true;
        if (ticket.ticketType.event.title.toLowerCase().includes(searchTerm))
          return true;

        return false;
      });

      // Apply pagination to filtered results
      const paginatedTickets = filteredTickets.slice(skip, skip + limit);

      // Enhance with guest info
      const ticketsWithGuestInfo = paginatedTickets.map((ticket) => {
        if (!ticket.userId && ticket.order) {
          const guestInfo = extractGuestInfo(ticket.order);
          if (guestInfo) {
            return { ...ticket, guestInfo };
          }
        }
        return ticket;
      });

      const totalCount = filteredTickets.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: {
          tickets: ticketsWithGuestInfo,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasMore: page < totalPages,
          },
          stats: {
            total: totalCount,
            // Calculate stats from filtered results
            unused: filteredTickets.filter((t) => t.status === "UNUSED").length,
            used: filteredTickets.filter((t) => t.status === "USED").length,
            refunded: filteredTickets.filter((t) => t.status === "REFUNDED")
              .length,
            cancelled: filteredTickets.filter((t) => t.status === "CANCELLED")
              .length,
          },
        },
      };
    }

    // Normal query without search
    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          ticketType: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startDateTime: true,
                  endDateTime: true,
                  publishedStatus: true,
                  venue: {
                    select: {
                      name: true,
                      address: true,
                      city: {
                        select: {
                          name: true,
                          state: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              paystackId: true,
              paymentStatus: true,
              refundStatus: true,
              totalAmount: true,
              purchaseNotes: true,
            },
          },
        },
        orderBy: {
          purchasedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.ticket.count({
        where: whereClause,
      }),
    ]);

    // Enhance tickets with guest information
    const ticketsWithGuestInfo = tickets.map((ticket) => {
      if (!ticket.userId && ticket.order) {
        const guestInfo = extractGuestInfo(ticket.order);
        if (guestInfo) {
          return { ...ticket, guestInfo };
        }
      }
      return ticket;
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Calculate summary statistics for current filter
    const statusStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: whereClause,
      _count: true,
    });

    const stats = {
      total: totalCount,
      unused: statusStats.find((s) => s.status === "UNUSED")?._count || 0,
      used: statusStats.find((s) => s.status === "USED")?._count || 0,
      refunded: statusStats.find((s) => s.status === "REFUNDED")?._count || 0,
      cancelled: statusStats.find((s) => s.status === "CANCELLED")?._count || 0,
    };

    return {
      success: true,
      data: {
        tickets: ticketsWithGuestInfo,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasMore: page < totalPages,
        },
        stats,
      },
    };
  } catch (error) {
    console.error("Error fetching filtered admin tickets:", error);
    return {
      success: false,
      message: "Failed to fetch tickets",
    };
  }
}

// Get ticket details with guest info
export async function getTicketDetails(
  ticketId: string,
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              include: {
                venue: {
                  include: {
                    city: true,
                  },
                },
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
            quantity: true,
            paymentStatus: true,
            purchaseNotes: true,
          },
        },
        validations: {
          include: {
            validator: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            validatedAt: "desc",
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
      };
    }

    // Check permissions
    const isAdmin =
      session.user.role === "ADMIN" &&
      ["STAFF", "SUPER_ADMIN"].includes(session.user.subRole);
    const isEventOwner = ticket.ticketType.event.userId === session.user.id;
    const isTicketOwner = ticket.userId === session.user.id;

    if (!isAdmin && !isEventOwner && !isTicketOwner) {
      return {
        success: false,
        message: "You do not have permission to view this ticket",
      };
    }

    // Add guest info if applicable
    let ticketWithGuestInfo: any = ticket;
    if (!ticket.userId && ticket.order) {
      const guestInfo = extractGuestInfo(ticket.order);
      if (guestInfo) {
        ticketWithGuestInfo = { ...ticket, guestInfo };
      }
    }

    return {
      success: true,
      data: ticketWithGuestInfo,
    };
  } catch (error) {
    console.error("Error fetching ticket details:", error);
    return {
      success: false,
      message: "Failed to fetch ticket details",
    };
  }
}

// Get admin ticket statistics
export async function getAdminTicketStats(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  // Check permissions
  const { role, subRole } = session.user;
  if (role !== "ADMIN" || !["STAFF", "SUPER_ADMIN"].includes(subRole)) {
    return {
      success: false,
      message: "You do not have permission to view admin statistics",
    };
  }

  try {
    // Get ticket status breakdown
    const ticketStats = await prisma.ticket.groupBy({
      by: ["status"],
      where: { source: "ONLINE" },
      _count: true,
    });

    // Get total revenue from completed orders
    const revenueStats = await prisma.order.aggregate({
      where: {
        paymentStatus: "COMPLETED",
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Get refund statistics
    const refundStats = await prisma.order.aggregate({
      where: {
        refundStatus: "PROCESSED",
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // Platform fees are the sum of per-order commission snapshots (historical orders keep their rate).
    const totalRevenue = revenueStats._sum.totalAmount || 0;
    const totalRefunded = refundStats._sum.totalAmount || 0;
    const netRevenue = totalRevenue - totalRefunded;
    const adminFinancials = await aggregateOrderFinancials({});
    const platformFees = adminFinancials.netFeeNaira;
    const platformFeePercentage = adminFinancials.effectivePercent ?? 0;

    const adminPhysical = await getPhysicalInventoryForEvents('ALL');
    // Get recent activity from settings (default to 30 days)
    const activityDays =
      (await getCachedSetting("analytics.recentActivityDays")) || 30;
    const recentActivityDate = new Date();
    recentActivityDate.setDate(recentActivityDate.getDate() - activityDays);

    const recentActivity = await prisma.ticket.count({
      where: {
        purchasedAt: {
          gte: recentActivityDate,
        },
      },
    });

    // Get top events by ticket sales
    const topEvents = await prisma.event.findMany({
      include: {
        ticketTypes: {
          include: {
            tickets: {
              where: { ...ONLINE_SOLD_WHERE },
            },
          },
        },
        venue: {
          select: {
            name: true,
            city: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    const eventStats = topEvents
      .map((event) => {
        const ticketsSold = event.ticketTypes.reduce(
          (sum, tt) => sum + tt.tickets.length,
          0,
        );
        const revenue = event.ticketTypes.reduce(
          (sum, tt) => sum + tt.tickets.length * tt.price,
          0,
        );

        return {
          id: event.id,
          title: event.title,
          startDateTime: event.startDateTime,
          venue: event.venue,
          ticketsSold,
          revenue,
        };
      })
      .sort((a, b) => b.ticketsSold - a.ticketsSold)
      .slice(0, 5);

    const totalTickets = ticketStats.reduce(
      (sum, stat) => sum + stat._count,
      0,
    );

    return {
      success: true,
      data: {
        overview: {
          totalTickets,
          totalRevenue,
          totalRefunded,
          netRevenue,
          platformFees,
          platformFeePercentage,
          recentActivity,
          recentActivityDays: activityDays,
        },
        ticketsByStatus: ticketStats.reduce(
          (acc, stat) => {
            acc[stat.status.toLowerCase()] = stat._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        topEvents: eventStats,
        physical: {
          issued: adminPhysical.total.issued,
          soldOffline: adminPhysical.total.soldOffline,
          unsold: adminPhysical.total.unsold,
          scanned: adminPhysical.total.scanned,
        },
        orders: {
          completed: revenueStats._count,
          refunded: refundStats._count,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching admin ticket statistics:", error);
    return {
      success: false,
      message: "Failed to fetch statistics",
    };
  }
}

// Get ticket types with sold count for editing
export async function getTicketTypesWithSalesData(
  eventId: string,
): Promise<ActionResponse<any[]>> {
  try {
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            tickets: {
              where: { ...ONLINE_SOLD_WHERE }, // Only count online sales
            },
          },
        },
        tickets: {
          where: { ...ONLINE_SOLD_WHERE },
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { price: "asc" },
    });

    // Any issued ticket (online OR physical, any status) blocks deleting the type.
    const anyTickets = await prisma.ticket.groupBy({
      by: ["ticketTypeId"],
      where: { ticketType: { eventId } },
      _count: true,
    });
    const anyCount = new Map(anyTickets.map((t) => [t.ticketTypeId, t._count]));
    const physicalGroups = await prisma.ticket.groupBy({
      by: ["ticketTypeId"],
      where: { ticketType: { eventId }, ...PHYSICAL_ISSUED_WHERE },
      _count: true,
    });
    const physicalCount = new Map(physicalGroups.map((t) => [t.ticketTypeId, t._count]));
    const offlineInv = await getEventPhysicalInventory(eventId);

    // Transform the data to include sold count and deletion capability
    const enhancedTicketTypes = ticketTypes.map((ticketType) => ({
      id: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      quantity: ticketType.quantity, // online stock
      physicalQuantity: ticketType.physicalQuantity,
      physicalGenerated: physicalCount.get(ticketType.id) ?? 0,
      physicalSoldOffline: offlineInv.byType.get(ticketType.id)?.soldOffline ?? 0,
      physicalUnsold: offlineInv.byType.get(ticketType.id)?.unsold ?? 0,
      description: ticketType.description,
      maxPerUser: ticketType.maxPerUser,
      saleStartDate: ticketType.saleStartDate,
      saleEndDate: ticketType.saleEndDate,
      isRefundable: ticketType.isRefundable,
      soldCount: ticketType._count.tickets, // online sales only
      canDelete: (anyCount.get(ticketType.id) ?? 0) === 0, // Can only delete if nothing was ever issued
      tickets: ticketType.tickets,
    }));

    return {
      success: true,
      data: enhancedTicketTypes,
    };
  } catch (error) {
    console.error(
      `Error fetching ticket types with sales data for event ${eventId}:`,
      error,
    );
    return {
      success: false,
      message: "Failed to fetch ticket types with sales data",
    };
  }
}

// Delete ticket - SUPER_ADMIN only
export async function deleteTicket(
  ticketId: string,
): Promise<ActionResponse<null>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    return {
      success: false,
      message: "Not authenticated",
    };
  }

  // Only SUPER_ADMIN can delete tickets
  const isSuperAdmin =
    session.user.role === "ADMIN" && session.user.subRole === "SUPER_ADMIN";

  if (!isSuperAdmin) {
    return {
      success: false,
      message: "Only Super Admins can delete tickets",
    };
  }

  try {
    // Fetch ticket details before deletion for audit log
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Ticket not found",
      };
    }

    // Check if ticket has been used
    if (ticket.status === "USED") {
      return {
        success: false,
        message: "Cannot delete a ticket that has been used",
      };
    }

    // Delete ticket validations first
    await prisma.ticketValidation.deleteMany({
      where: { ticketId },
    });

    // Delete the ticket
    await prisma.ticket.delete({
      where: { id: ticketId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_TICKET",
        entity: "TICKET",
        entityId: ticketId,
        oldValues: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          eventTitle: ticket.ticketType.event.title,
          customerName: ticket.user?.name || "Guest User",
          customerEmail: ticket.user?.email || null,
        },
      },
    });

    return {
      success: true,
      message: `Ticket ${ticket.ticketId} deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return {
      success: false,
      message: "Failed to delete ticket due to an unexpected error",
    };
  }
}
