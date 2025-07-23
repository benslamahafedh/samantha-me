import { NextRequest, NextResponse } from 'next/server';
import { getAutoTransferManagerInstance } from '@/lib/autoTransferManager';
import { Database } from '@/lib/database';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Manual test transfer triggered...');
    
    const autoTransferManager = getAutoTransferManagerInstance();
    const database = Database.getInstance();
    
    // Get all users for debugging
    const allUsers = await database.getAllUsers();
    console.log(`🔍 Total users in database: ${allUsers.length}`);
    
    // Show all users
    allUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        sessionId: user.sessionId?.substring(0, 8) + '...',
        isPaid: user.isPaid,
        amountReceived: user.amountReceived,
        walletAddress: user.walletAddress?.substring(0, 8) + '...',
        createdAt: user.createdAt
      });
    });
    
    // Trigger auto-transfer
    console.log('🔄 Triggering auto-transfer...');
    const result = await autoTransferManager.transferFromAllWallets();
    
    return NextResponse.json({
      success: true,
      result,
      debug: {
        totalUsers: allUsers.length,
        paidUsers: allUsers.filter(u => u.isPaid).length,
        allUsers: allUsers.map(u => ({
          sessionId: u.sessionId?.substring(0, 8) + '...',
          isPaid: u.isPaid,
          amountReceived: u.amountReceived,
          walletAddress: u.walletAddress?.substring(0, 8) + '...'
        }))
      }
    });

  } catch (error: unknown) {
    console.error('Test transfer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const autoTransferManager = getAutoTransferManagerInstance();
    const database = Database.getInstance();
    
    // Get stats
    const stats = await autoTransferManager.getTransferStats();
    const allUsers = await database.getAllUsers();
    const paidUsers = allUsers.filter(user => user.isPaid);
    
    return NextResponse.json({
      success: true,
      stats,
      users: {
        total: allUsers.length,
        paid: paidUsers.length,
        details: allUsers.map(u => ({
          sessionId: u.sessionId?.substring(0, 8) + '...',
          isPaid: u.isPaid,
          amountReceived: u.amountReceived,
          walletAddress: u.walletAddress?.substring(0, 8) + '...'
        }))
      }
    });

  } catch (error: unknown) {
    console.error('Test transfer stats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 