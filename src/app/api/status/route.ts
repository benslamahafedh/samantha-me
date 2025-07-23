import { NextResponse } from 'next/server';
import { getAutoTransferManagerInstance } from '@/lib/autoTransferManager';
import { Database } from '@/lib/database';

export async function GET() {
  try {
    const autoTransferManager = getAutoTransferManagerInstance();
    const database = Database.getInstance();
    
    // Get auto-transfer stats
    const stats = await autoTransferManager.getTransferStats();
    
    // Get user counts
    const allUsers = await database.getAllUsers();
    const paidUsers = allUsers.filter(user => user.isPaid);
    
    return NextResponse.json({
      success: true,
      status: 'running',
      autoTransfer: {
        isActive: stats.isPeriodicTransfersActive,
        ownerWallet: stats.ownerWallet,
        minTransferAmount: stats.minTransferAmount,
        gasReserve: stats.gasReserve,
        interval: '5 minutes',
        mode: 'balance-check-only'
      },
      users: {
        total: allUsers.length,
        paid: paidUsers.length
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