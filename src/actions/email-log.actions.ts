// src/actions/email-log.actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { resendOrderTickets } from "@/actions/order.actions";

export interface EmailLogFilters {
  page?: number;
  pageSize?: number;
  status?: "ALL" | "SENT" | "DELIVERED" | "BOUNCED" | "COMPLAINED" | "FAILED";
  type?: "ALL" | "ORDER_TICKETS" | "TICKET_RESEND";
  search?: string; // recipient email, ticket id, order id or event title
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, message: "Not authenticated" };

  const { role, subRole } = session.user as any;
  if (role !== "ADMIN" || !["STAFF", "SUPER_ADMIN"].includes(subRole)) {
    return { ok: false as const, message: "Not authorized" };
  }
  return { ok: true as const };
}

export async function getEmailLogs(filters: EmailLogFilters = {}) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false as const, message: guard.message };

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(filters.pageSize) || 25));
  const search = filters.search?.trim();

  const where: any = {};

  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.type && filters.type !== "ALL") where.type = filters.type;

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(`${filters.from}T00:00:00+01:00`); // Lagos
    if (filters.to) where.createdAt.lte = new Date(`${filters.to}T23:59:59.999+01:00`);
  }

  if (search) {
    where.OR = [
      { toEmail: { contains: search, mode: "insensitive" } },
      { eventTitle: { contains: search, mode: "insensitive" } },
      { orderId: { contains: search } },
      { ticketIds: { has: search } },
    ];
  }

  try {
    const [logs, total, grouped] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailLog.count({ where }),
      // Counts per status for the summary cards (ignores the status filter so
      // the cards always show the full picture for the chosen search/dates).
      prisma.emailLog.groupBy({
        by: ["status"],
        where: { ...where, status: undefined },
        _count: { _all: true },
      }),
    ]);

    const counts = { SENT: 0, DELIVERED: 0, BOUNCED: 0, COMPLAINED: 0, FAILED: 0 };
    grouped.forEach((g) => {
      counts[g.status as keyof typeof counts] = g._count._all;
    });

    return {
      success: true as const,
      data: {
        logs: logs.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
          deliveredAt: l.deliveredAt?.toISOString() ?? null,
          bouncedAt: l.bouncedAt?.toISOString() ?? null,
          complainedAt: l.complainedAt?.toISOString() ?? null,
        })),
        total,
        counts,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (error) {
    console.error("getEmailLogs failed:", error);
    return { success: false as const, message: "Failed to load email log" };
  }
}

/** Retry a failed purchase email by re-sending the whole order's tickets. */
export async function retryEmailFromLog(logId: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, message: guard.message };

  const log = await prisma.emailLog.findUnique({ where: { id: logId } });
  if (!log) return { success: false, message: "Log entry not found" };
  if (!log.orderId) {
    return { success: false, message: "This entry has no order to retry" };
  }

  const result = await resendOrderTickets(log.orderId);
  revalidatePath("/admin/dashboard/tickets/emails");
  return result;
}
