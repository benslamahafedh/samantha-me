import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    const sessionManager = SessionManager.getInstance();
    
    // Get client information
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIpAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Get or create session
    const result = await sessionManager.getOrCreateSession(sessionId, userAgent, clientIpAddress);

    // Check access status
    const accessResult = await sessionManager.checkAccess(result.sessionId, userAgent, clientIpAddress);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      isNew: result.isNew,
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      trialExpiresAt: accessResult.trialExpiresAt,
      accessExpiresAt: accessResult.accessExpiresAt,
      user: {
        sessionId: (result.user as any).sessionId,
        dailyUsageMinutes: (result.user as any).dailyUsageMinutes,
        lastUsageDate: (result.user as any).lastUsageDate,
        createdAt: (result.user as any).createdAt,
        trialExpiresAt: (result.user as any).trialExpiresAt
      }
    });

  } catch (error: unknown) {
    console.error('Session creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown session error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();
    
    // Get client information
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIpAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Check access status
    const accessResult = await sessionManager.checkAccess(sessionId, userAgent, clientIpAddress);

    return NextResponse.json({
      success: true,
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      trialExpiresAt: accessResult.trialExpiresAt,
      accessExpiresAt: accessResult.accessExpiresAt,
      user: accessResult.user
    });

  } catch (error: unknown) {
    console.error('Session check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown session error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 