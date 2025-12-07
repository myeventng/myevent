// ===== FILE 1: app/admin/dashboard/tickets/refunds/page.tsx =====

import { Suspense } from 'react';
import { RefundManagement } from '@/components/admin/refund-management';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { processRefund } from '@/actions/platform-settings.actions';
import { RefundStatus } from '@/generated/prisma';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

// ✅ Updated interface to match actual data - buyer can be null
interface RefundRequestData {
  id: string;
  orderId: string;
  totalAmount: number;
  refundStatus: RefundStatus | null;
  createdAt: string;
  buyer: {
    name: string;
    email: string;
  } | null; // ✅ Changed to allow null
  event: {
    title: string;
    startDateTime: string;
  };
  requestReason?: string;
}

async function getRefundRequests(): Promise<RefundRequestData[]> {
  const refundRequests = await prisma.order.findMany({
    where: {
      OR: [
        { refundStatus: 'INITIATED' },
        { refundStatus: 'PROCESSED' },
        { refundStatus: 'REJECTED' },
        { refundStatus: 'FAILED' },
      ],
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
      event: {
        select: {
          title: true,
          startDateTime: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return refundRequests.map((order) => ({
    id: order.id,
    orderId: order.id,
    totalAmount: order.totalAmount,
    refundStatus: order.refundStatus,
    createdAt: order.createdAt.toISOString(),
    buyer: order.buyer, // ✅ This can now be null
    event: {
      title: order.event.title,
      startDateTime: order.event.startDateTime.toISOString(),
    },
    requestReason: undefined,
  }));
}

async function RefundsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const refundRequests = await getRefundRequests();

  const handleRefundAction = async (
    orderId: string,
    approve: boolean,
    notes?: string
  ): Promise<void> => {
    'use server';

    try {
      const result = await processRefund(orderId, approve, notes);

      if (!result.success) {
        console.error('Refund processing failed:', result.message);
        throw new Error(result.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error in handleRefundAction:', error);
      throw error;
    }
  };

  return (
    <DashboardLayout session={session}>
      <div className="container mx-auto py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-64">
              <div className="text-lg">Loading refund requests...</div>
            </div>
          }
        >
          <RefundManagement
            refundRequests={refundRequests}
            onRefundAction={handleRefundAction}
            userRole={session.user.role}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

export default RefundsPage;
