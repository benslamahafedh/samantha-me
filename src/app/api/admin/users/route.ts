import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function GET(req: NextRequest) {
  try {
    const sessionManager = SessionManager.getInstance();
    const allUsers = await sessionManager.getAllUsers();
    
    // Format users for display (exclude sensitive data like private keys)
    const formattedUsers = allUsers.map((user: any) => ({
      sessionId: user.sessionId,
      walletAddress: user.walletAddress,
      referenceId: user.referenceId,
      isPaid: user.isPaid,
      amountReceived: user.amountReceived,
      createdAt: user.createdAt,
      trialExpiresAt: user.trialExpiresAt,
      accessExpiresAt: user.accessExpiresAt,
      paymentReceivedAt: user.paymentReceivedAt,
      txId: user.txId
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      totalCount: formattedUsers.length
    });

  } catch (error: unknown) {
    console.error('Get users error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 