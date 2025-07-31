import { NextRequest, NextResponse } from 'next/server';
import {
  getPlatformSettings,
  updatePlatformSettings,
} from '@/actions/platform-settings.actions';

// GET - Fetch platform settings
export async function GET(request: NextRequest) {
  try {
    const result = await getPlatformSettings();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update platform settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.general || !body.financial) {
      return NextResponse.json(
        { success: false, message: 'Invalid settings structure' },
        { status: 400 }
      );
    }

    // Additional validation
    const { general, financial } = body;

    // Validate general settings
    if (!general.platformName || !general.supportEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'Platform name and support email are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(general.supportEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate financial settings
    if (
      financial.defaultPlatformFeePercentage < 0 ||
      financial.defaultPlatformFeePercentage > 50
    ) {
      return NextResponse.json(
        { success: false, message: 'Platform fee must be between 0% and 50%' },
        { status: 400 }
      );
    }

    const result = await updatePlatformSettings(body);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/admin/settings:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
