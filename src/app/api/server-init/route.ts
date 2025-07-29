import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

let isInitialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!isInitialized) {
      console.log('🚀 Initializing server components...');
      
      // Initialize database
      const database = Database.getInstance();
      console.log('✅ Database initialized');
      
      // Test the database
      const stats = await database.getUsageStats();
      console.log('📊 Usage stats:', stats);
      
      isInitialized = true;
      
      return NextResponse.json({
        success: true,
        message: 'Server initialized successfully',
        stats
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Server already initialized'
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown initialization error'
    }, { status: 500 });
  }
} 