import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint is used by middleware to check maintenance mode status
export async function GET(request: NextRequest) {
  try {
    // Get maintenance mode setting from database
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'general.maintenanceMode' },
      select: { value: true },
    });

    const maintenanceMode = setting?.value === true;

    return NextResponse.json(
      {
        maintenanceMode,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error checking maintenance mode:', error);

    return NextResponse.json(
      {
        maintenanceMode: false,
        error: 'Failed to check maintenance mode',
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
