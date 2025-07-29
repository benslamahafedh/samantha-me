import { NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET() {
  try {
    const database = Database.getInstance();
    
    // Get usage statistics
    const stats = await database.getUsageStats();
    
    return NextResponse.json({
      success: true,
      status: 'running',
      system: {
        dailyLimit: '5 minutes',
        resetTime: 'midnight local timezone',
        mode: 'daily-limit'
      },
      users: {
        total: stats.totalUsers,
        active: stats.activeUsers,
        totalDailyUsage: stats.totalDailyUsage,
        averageUsagePerUser: stats.averageUsagePerUser
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Status check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 