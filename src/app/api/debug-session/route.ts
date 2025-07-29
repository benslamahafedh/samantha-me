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
        dailyUsageMinutes: user.dailyUsageMinutes,
        lastUsageDate: user.lastUsageDate,
        trialExpiresAt: user.trialExpiresAt,
        createdAt: user.createdAt
      } : null,
      environment: {
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