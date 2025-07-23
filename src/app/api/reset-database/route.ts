import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const database = Database.getInstance();
    await database.resetDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database reset successfully'
    });
  } catch (error) {
    console.error('Failed to reset database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset database'
    }, { status: 500 });
  }
} 