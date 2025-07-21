import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, walletAddress, referenceId } = await req.json();

    if (!sessionId && !walletAddress && !referenceId) {
      return NextResponse.json({ 
        error: 'At least one identifier is required (sessionId, walletAddress, or referenceId)' 
      }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();
    let recoveryInfo = null;

    // Try to recover by session ID
    if (sessionId) {
      // Get all users and find matching session
      const allUsers = await sessionManager.getAllUsers();
      const matchingUser = allUsers.find((u: any) => u.sessionId === sessionId);
      
      if (matchingUser) {
        recoveryInfo = await sessionManager.getSessionRecoveryInfo((matchingUser as any).sessionId);
      }
    }

    // Try to recover by wallet address
    if (!recoveryInfo && walletAddress) {
      const user = await sessionManager.getUserByWalletAddress(walletAddress);     
      if (user) {
        recoveryInfo = await sessionManager.getSessionRecoveryInfo((user as any).sessionId);
      }
    }

    // Try to recover by reference ID
    if (!recoveryInfo && referenceId) {
      const allUsers = await sessionManager.getAllUsers();
      const user = allUsers.find((u: any) => u.referenceId === referenceId);
      if (user) {
        recoveryInfo = await sessionManager.getSessionRecoveryInfo((user as any).sessionId);
      }
    }

    if (!recoveryInfo) {
      return NextResponse.json({ 
        success: false,
        error: 'Session not found. Please check your identifiers or start a new session.' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session recovered successfully',
      session: recoveryInfo
    });

  } catch (error: unknown) {
    console.error('Session recovery error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown recovery error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 