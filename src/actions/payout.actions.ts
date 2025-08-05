'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/actions/notification.actions';
import { getSetting } from '@/actions/platform-settings.actions';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface BankAccountVerification {
  account_number: string;
  bank_code: string;
  account_name?: string;
}

// Verify bank account with Paystack
export async function verifyBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<ActionResponse<any>> {
  try {
    // Debug: Log what we're trying to fetch
    // console.log('🔍 Debug: Starting bank account verification');
    // console.log('🔍 Debug: Account number:', accountNumber);
    // console.log('🔍 Debug: Bank code:', bankCode);

    // Try to get from platform settings first, then fallback to env
    // console.log('🔍 Debug: Fetching Paystack key from platform settings...');
    let paystackSecretKey = await getSetting('financial.paystackSecretKey');
    // console.log(
    //   '🔍 Debug: Platform settings key:',
    //   paystackSecretKey ? 'Found' : 'Not found'
    // );

    if (!paystackSecretKey) {
      //   console.log('🔍 Debug: Falling back to environment variable...');
      paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      //   console.log(
      //     '🔍 Debug: Environment key:',
      //     paystackSecretKey ? 'Found' : 'Not found'
      //   );
    }

    if (!paystackSecretKey) {
      //   console.log('❌ Debug: No Paystack key found in either location');
      //   return {
      //     success: false,
      //     message: 'Payment system not configured. Please contact administrator.',
      //   };
    }

    // console.log(
    //   '🔍 Debug: Using Paystack key:',
    //   paystackSecretKey.substring(0, 10) + '...'
    // );

    // Build URL with query parameters
    const url = new URL('https://api.paystack.co/bank/resolve');
    url.searchParams.set('account_number', accountNumber);
    url.searchParams.set('bank_code', bankCode);

    // console.log('🔍 Debug: Making request to:', url.toString());

    const verifyResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // console.log('🔍 Debug: Response status:', verifyResponse.status);

    const data = await verifyResponse.json();
    // console.log('🔍 Debug: Response data:', JSON.stringify(data, null, 2));

    if (data.status) {
      //   console.log('✅ Debug: Bank verification successful');
      return {
        success: true,
        data: {
          account_number: accountNumber,
          bank_code: bankCode,
          account_name: data.data.account_name,
        },
      };
    }

    console.log('❌ Debug: Bank verification failed:', data.message);
    return {
      success: false,
      message: data.message || 'Failed to verify bank account',
    };
  } catch (error) {
    console.error('❌ Debug: Error in verifyBankAccount:', error);
    return {
      success: false,
      message: 'Failed to verify bank account',
    };
  }
}

// Update organizer bank details
export async function updateOrganizerBankDetails(
  bankData: BankAccountVerification
): Promise<ActionResponse<any>> {
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

  try {
    // Verify bank account first
    const verification = await verifyBankAccount(
      bankData.account_number,
      bankData.bank_code
    );

    if (!verification.success) {
      return verification;
    }

    // Import the organizer actions function
    const { updateOrganizerBankDetails: updateBankDetails } = await import(
      '@/actions/organizer.actions'
    );

    // Update organizer profile with bank details
    const result = await updateBankDetails(
      bankData.account_number,
      bankData.bank_code,
      verification.data?.account_name
    );

    return result;
  } catch (error) {
    console.error('Error updating bank details:', error);
    return {
      success: false,
      message: 'Failed to update bank details',
    };
  }
}

// Request payout
export async function requestPayout(): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.subRole !== 'ORGANIZER') {
    return {
      success: false,
      message: 'Only organizers can request payouts',
    };
  }

  try {
    // Check if organizer has bank details
    const organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!organizerProfile?.bankAccount || !organizerProfile?.bankCode) {
      return {
        success: false,
        message: 'Please add your bank details before requesting a payout',
      };
    }

    // Check for recent payout request (14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentPayout = await prisma.payout.findFirst({
      where: {
        organizerId: session.user.id,
        createdAt: {
          gte: fourteenDaysAgo,
        },
      },
    });

    if (recentPayout) {
      return {
        success: false,
        message: 'You can only request a payout every 14 days',
      };
    }

    // Calculate payout amount
    const payoutCalculation = await calculateOrganizerPayout(session.user.id);

    if (payoutCalculation.netAmount <= 0) {
      return {
        success: false,
        message: 'No funds available for payout',
      };
    }

    // Create payout request
    const payout = await prisma.payout.create({
      data: {
        organizerId: session.user.id,
        amount: payoutCalculation.grossAmount,
        platformFee: payoutCalculation.platformFee,
        netAmount: payoutCalculation.netAmount,
        status: 'PENDING',
        bankAccount: organizerProfile.bankAccount,
        bankCode: organizerProfile.bankCode,
        accountName: organizerProfile.accountName,
        periodStart: payoutCalculation.periodStart,
        periodEnd: payoutCalculation.periodEnd,
      },
    });

    // Create notification for admins
    await createNotification({
      type: 'PAYMENT_RECEIVED',
      title: 'New Payout Request',
      message: `${session.user.name} has requested a payout of ₦${payoutCalculation.netAmount.toLocaleString()}`,
      actionUrl: `/admin/dashboard/payouts/${payout.id}`,
      isAdminNotification: true,
      metadata: {
        payoutId: payout.id,
        organizerName: session.user.name,
        organizerEmail: session.user.email,
        payoutAmount: payoutCalculation.netAmount,
        requestedAt: new Date().toISOString(),
      },
      sendEmail: true,
    });

    revalidatePath('/dashboard/analytics');

    return {
      success: true,
      message:
        'Payout request submitted successfully. It will be processed within 24 hours.',
      data: payout,
    };
  } catch (error) {
    console.error('Error requesting payout:', error);
    return {
      success: false,
      message: 'Failed to request payout',
    };
  }
}

// Calculate organizer payout
async function calculateOrganizerPayout(organizerId: string) {
  // Get all completed orders for organizer's events since last payout
  const lastPayout = await prisma.payout.findFirst({
    where: {
      organizerId,
      status: { in: ['COMPLETED', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  const periodStart = lastPayout ? new Date(lastPayout.createdAt) : new Date(0);
  const periodEnd = new Date();

  const orders = await prisma.order.findMany({
    where: {
      event: {
        userId: organizerId,
      },
      paymentStatus: 'COMPLETED',
      createdAt: {
        gt: periodStart,
        lte: periodEnd,
      },
    },
  });

  const grossAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const platformFee = orders.reduce(
    (sum, order) => sum + (order.platformFee || order.totalAmount * 0.05),
    0
  );
  const netAmount = grossAmount - platformFee;

  return {
    grossAmount,
    platformFee,
    netAmount,
    periodStart,
    periodEnd,
    orderCount: orders.length,
  };
}

// Get organizer payouts
export async function getOrganizerPayouts(): Promise<ActionResponse<any[]>> {
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

  try {
    const payouts = await prisma.payout.findMany({
      where: { organizerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payouts,
    };
  } catch (error) {
    console.error('Error fetching organizer payouts:', error);
    return {
      success: false,
      message: 'Failed to fetch payouts',
    };
  }
}

// Admin: Get all payout requests
export async function getAllPayoutRequests(): Promise<ActionResponse<any[]>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const payouts = await prisma.payout.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            organizerProfile: {
              select: {
                organizationName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payouts,
    };
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    return {
      success: false,
      message: 'Failed to fetch payout requests',
    };
  }
}

// Admin: Process payout (approve/reject)
export async function processPayout(
  payoutId: string,
  approve: boolean,
  notes?: string
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payout) {
      return {
        success: false,
        message: 'Payout request not found',
      };
    }

    if (payout.status !== 'PENDING') {
      return {
        success: false,
        message: 'Payout has already been processed',
      };
    }

    if (!approve) {
      // Reject payout
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          failureReason: notes || 'Rejected by admin',
        },
      });

      // Notify organizer
      await createNotification({
        type: 'PAYMENT_RECEIVED',
        title: 'Payout Request Rejected',
        message: `Your payout request of ₦${payout.netAmount.toLocaleString()} has been rejected. ${notes || ''}`,
        actionUrl: '/dashboard/analytics',
        userId: payout.organizerId,
        metadata: {
          payoutId: payout.id,
          rejectionReason: notes,
          rejectedAt: new Date().toISOString(),
        },
        sendEmail: true,
      });

      return {
        success: true,
        message: 'Payout request rejected',
      };
    }

    // Approve and process payout
    const updatedPayout = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
      },
    });

    // Simulate Paystack transfer (implement actual transfer in production)
    // const transferResult = await initiatePaystackTransfer(payout);

    // For now, mark as completed
    await prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Notify organizer
    await createNotification({
      type: 'PAYMENT_RECEIVED',
      title: 'Payout Processed Successfully',
      message: `Your payout of ₦${payout.netAmount.toLocaleString()} has been processed and will reflect in your account within 24 hours.`,
      actionUrl: '/dashboard/analytics',
      userId: payout.organizerId,
      metadata: {
        payoutId: payout.id,
        payoutAmount: payout.netAmount,
        processedAt: new Date().toISOString(),
      },
      sendEmail: true,
    });

    revalidatePath('/admin/dashboard/payouts');

    return {
      success: true,
      message: 'Payout processed successfully',
      data: updatedPayout,
    };
  } catch (error) {
    console.error('Error processing payout:', error);
    return {
      success: false,
      message: 'Failed to process payout',
    };
  }
}

// Admin: Bulk process payouts
export async function bulkProcessPayouts(
  payoutIds: string[],
  approve: boolean
): Promise<ActionResponse<any>> {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    return {
      success: false,
      message: 'Admin access required',
    };
  }

  try {
    const results = await Promise.allSettled(
      payoutIds.map((id) => processPayout(id, approve))
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return {
      success: true,
      message: `Processed ${successful} payouts successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      data: { successful, failed },
    };
  } catch (error) {
    console.error('Error bulk processing payouts:', error);
    return {
      success: false,
      message: 'Failed to bulk process payouts',
    };
  }
}

// Get organizer revenue analytics
export async function getOrganizerRevenueAnalytics(): Promise<
  ActionResponse<any>
> {
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

  try {
    // Calculate pending payout amount
    const pendingPayoutData = await calculateOrganizerPayout(session.user.id);

    // Get payout history
    const payoutHistory = await prisma.payout.findMany({
      where: { organizerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get total earnings
    const totalEarnings = await prisma.payout.aggregate({
      where: {
        organizerId: session.user.id,
        status: 'COMPLETED',
      },
      _sum: { netAmount: true },
    });

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      where: {
        event: { userId: session.user.id },
        paymentStatus: 'COMPLETED',
      },
      include: {
        event: { select: { title: true } },
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      success: true,
      data: {
        pendingPayout: {
          amount: pendingPayoutData.netAmount,
          orderCount: pendingPayoutData.orderCount,
          canRequest: pendingPayoutData.netAmount > 0,
        },
        totalEarnings: totalEarnings._sum.netAmount || 0,
        payoutHistory,
        recentOrders,
      },
    };
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return {
      success: false,
      message: 'Failed to fetch revenue analytics',
    };
  }
}
