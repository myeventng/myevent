'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface ActionResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface PlatformSettings {
  general: {
    platformName: string;
    platformDescription: string;
    supportEmail: string;
    maintenanceMode: boolean;
    allowRegistrations: boolean;
  };
  financial: {
    defaultPlatformFeePercentage: number;
    minimumWithdrawal: number;
    maximumRefundDays: number;
    autoApproveRefunds: boolean;
    paystackPublicKey: string;
    paystackSecretKey: string;
  };
}

// Validate admin permission
const validateAdminPermission = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
};

// Get platform settings
export async function getPlatformSettings(): Promise<
  ActionResponse<PlatformSettings>
> {
  try {
    await validateAdminPermission();

    // Get all settings from database
    const settings = await prisma.platformSettings.findMany();

    // Convert to structured format
    const structuredSettings: PlatformSettings = {
      general: {
        platformName: 'MyEvent.com.ng',
        platformDescription: "Nigeria's premier event management platform",
        supportEmail: 'support@myevent.com.ng',
        maintenanceMode: false,
        allowRegistrations: true,
      },
      financial: {
        defaultPlatformFeePercentage: 5,
        minimumWithdrawal: 1000,
        maximumRefundDays: 30,
        autoApproveRefunds: false,
        paystackPublicKey: '',
        paystackSecretKey: '',
      },
    };

    // Populate with actual settings from database
    settings.forEach((setting) => {
      const keys = setting.key.split('.');
      if (keys.length === 2) {
        const section = keys[0] as keyof PlatformSettings;
        const key = keys[1];
        if (structuredSettings[section] && key in structuredSettings[section]) {
          (structuredSettings[section] as any)[key] = setting.value;
        }
      }
    });

    return {
      success: true,
      data: structuredSettings,
    };
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return {
      success: false,
      message: 'Failed to fetch platform settings',
    };
  }
}

// Update platform settings
export async function updatePlatformSettings(
  settings: PlatformSettings
): Promise<ActionResponse<PlatformSettings>> {
  try {
    const session = await validateAdminPermission();

    // Flatten settings for database storage
    const flatSettings = [
      { key: 'general.platformName', value: settings.general.platformName },
      {
        key: 'general.platformDescription',
        value: settings.general.platformDescription,
      },
      { key: 'general.supportEmail', value: settings.general.supportEmail },
      {
        key: 'general.maintenanceMode',
        value: settings.general.maintenanceMode,
      },
      {
        key: 'general.allowRegistrations',
        value: settings.general.allowRegistrations,
      },
      {
        key: 'financial.defaultPlatformFeePercentage',
        value: settings.financial.defaultPlatformFeePercentage,
      },
      {
        key: 'financial.minimumWithdrawal',
        value: settings.financial.minimumWithdrawal,
      },
      {
        key: 'financial.maximumRefundDays',
        value: settings.financial.maximumRefundDays,
      },
      {
        key: 'financial.autoApproveRefunds',
        value: settings.financial.autoApproveRefunds,
      },
      {
        key: 'financial.paystackPublicKey',
        value: settings.financial.paystackPublicKey,
      },
      {
        key: 'financial.paystackSecretKey',
        value: settings.financial.paystackSecretKey,
      },
    ];

    // Update or create settings in database
    await Promise.all(
      flatSettings.map(async (setting) => {
        await prisma.platformSettings.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: setting,
        });
      })
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entity: 'PLATFORM_SETTINGS',
        newValues: JSON.stringify(settings),
        ipAddress: null,
        userAgent: null,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/');

    return {
      success: true,
      message: 'Platform settings updated successfully',
      data: settings,
    };
  } catch (error) {
    console.error('Error updating platform settings:', error);
    return {
      success: false,
      message: 'Failed to update platform settings',
    };
  }
}

// Get specific setting value
export async function getSetting(key: string): Promise<any> {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key },
    });

    return setting?.value || null;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

// Check if maintenance mode is enabled
export async function isMaintenanceModeEnabled(): Promise<boolean> {
  try {
    const maintenanceMode = await getSetting('general.maintenanceMode');
    return maintenanceMode === true;
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

// Get platform fee percentage
export async function getPlatformFeePercentage(): Promise<number> {
  try {
    const feePercentage = await getSetting(
      'financial.defaultPlatformFeePercentage'
    );
    return feePercentage || 5; // Default to 5%
  } catch (error) {
    console.error('Error fetching platform fee percentage:', error);
    return 5;
  }
}

// Process refund (approve/reject)
export async function processRefund(
  orderId: string,
  approve: boolean,
  adminNotes?: string
): Promise<ActionResponse<any>> {
  try {
    const session = await validateAdminPermission();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        buyer: true,
      },
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      };
    }

    if (!approve) {
      // Reject refund
      await prisma.order.update({
        where: { id: orderId },
        data: {
          refundStatus: null,
        },
      });

      return {
        success: true,
        message: 'Refund request rejected',
      };
    }

    // Process refund with Paystack if not a free event
    let paystackRefundSuccess = true;

    if (!order.event.isFree && order.totalAmount > 0) {
      const paystackSecretKey = await getSetting('financial.paystackSecretKey');

      if (!paystackSecretKey) {
        return {
          success: false,
          message: 'Paystack configuration not found',
        };
      }

      const refundResponse = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: order.paystackId,
          amount: order.totalAmount * 100, // Convert to kobo
        }),
      });

      const refundData = await refundResponse.json();
      paystackRefundSuccess = refundData.status;

      if (!paystackRefundSuccess) {
        return {
          success: false,
          message: 'Failed to process refund with payment provider',
        };
      }
    }

    // Update order and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'REFUNDED',
          refundStatus: 'PROCESSED',
        },
      });

      // Mark all related tickets as refunded
      await tx.ticket.updateMany({
        where: {
          orderId: orderId,
        },
        data: {
          status: 'REFUNDED',
        },
      });

      return updatedOrder;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROCESS_REFUND',
        entity: 'ORDER',
        entityId: orderId,
        newValues: {
          approved: approve,
          adminNotes,
        },
      },
    });

    revalidatePath('/admin/dashboard/refunds');
    revalidatePath('/dashboard/tickets');

    return {
      success: true,
      message: 'Refund processed successfully',
      data: result,
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      message: 'Failed to process refund',
    };
  }
}
