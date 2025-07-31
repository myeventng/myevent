import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// API to get maintenance page configuration
export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.platformSettings.findMany({
      where: {
        key: {
          in: [
            'general.platformName',
            'general.supportEmail',
            'general.maintenanceMode',
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const config = settings.reduce(
      (acc, setting) => {
        const key = setting.key.split('.')[1];
        acc[key] = setting.value;
        return acc;
      },
      {} as Record<string, any>
    );

    const maintenanceConfig = {
      platformName: config.platformName || 'MyEvent.com.ng',
      supportEmail: config.supportEmail || 'support@myevent.com.ng',
      maintenanceMode: config.maintenanceMode || false,
      estimatedDowntime: "We'll be back soon",
    };

    return NextResponse.json({
      success: true,
      data: maintenanceConfig,
    });
  } catch (error) {
    console.error('Error fetching maintenance page config:', error);

    return NextResponse.json({
      success: true,
      data: {
        platformName: 'MyEvent.com.ng',
        supportEmail: 'support@myevent.com.ng',
        maintenanceMode: false,
        estimatedDowntime: "We'll be back soon",
      },
    });
  }
}
