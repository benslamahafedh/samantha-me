import { NextRequest, NextResponse } from 'next/server';
import { getAutoTransferManagerInstance } from '@/lib/autoTransferManager';

let isInitialized = false;

export async function GET(request: NextRequest) {
  try {
    if (!isInitialized) {
      console.log('🚀 Initializing server components...');
      
      // Initialize auto-transfer manager
      const autoTransferManager = getAutoTransferManagerInstance();
      console.log('✅ Auto-transfer manager initialized');
      
      // Test the manager
      const stats = await autoTransferManager.getTransferStats();
      console.log('📊 Auto-transfer stats:', stats);
      
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