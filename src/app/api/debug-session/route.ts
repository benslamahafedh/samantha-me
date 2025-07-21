import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();
    const accessResult = await sessionManager.checkAccess(sessionId);
    
    // Get detailed user info
    const user = (accessResult.user as any);
    
    const debugInfo = {
      sessionId,
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      user: user ? {
        sessionId: user.sessionId,
        walletAddress: user.walletAddress,
        referenceId: user.referenceId,
        isPaid: user.isPaid,
        trialExpiresAt: user.trialExpiresAt,
        accessExpiresAt: user.accessExpiresAt,
        amountReceived: user.amountReceived,
        paymentReceivedAt: user.paymentReceivedAt,
        txId: user.txId
      } : null,
      environment: {
        hasHeliusApiKey: !!process.env.HELIUS_API_KEY,
        hasSolanaRpc: !!(process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL),
        nodeEnv: process.env.NODE_ENV
      }
    };

    return NextResponse.json({
      success: true,
      debugInfo
    });

  } catch (error: unknown) {
    console.error('Debug session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown debug error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 