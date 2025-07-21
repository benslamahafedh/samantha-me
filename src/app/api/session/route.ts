import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';
import { InputValidator } from '@/lib/inputValidation';

export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = InputValidator.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const { sessionId } = await req.json();
    
    // SECURITY FIX: Input validation
    if (sessionId) {
      const sessionValidation = InputValidator.validateSessionId(sessionId);
      if (!sessionValidation.isValid) {
        return NextResponse.json({ 
          success: false, 
          error: sessionValidation.error 
        }, { status: 400 });
      }
    }

    const sessionManager = SessionManager.getInstance();
    
    // SECURITY FIX: Get client information for session validation
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIpAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Get or create session with client validation
    const result = await sessionManager.getOrCreateSession(sessionId, userAgent, clientIpAddress);

    // Check access status with client validation
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
        walletAddress: (result.user as any).walletAddress,
        referenceId: (result.user as any).referenceId,
        isPaid: (result.user as any).isPaid,
        amountReceived: (result.user as any).amountReceived,
        createdAt: (result.user as any).createdAt,
        trialExpiresAt: (result.user as any).trialExpiresAt,
        accessExpiresAt: (result.user as any).accessExpiresAt
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
    // SECURITY FIX: Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = InputValidator.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // SECURITY FIX: Input validation
    const sessionValidation = InputValidator.validateSessionId(sessionId);
    if (!sessionValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: sessionValidation.error 
      }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();
    
    // SECURITY FIX: Get client information for session validation
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIpAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const accessResult = await sessionManager.checkAccess(sessionId, userAgent, clientIpAddress);

    return NextResponse.json({
      success: true,
      sessionId,
      hasAccess: accessResult.hasAccess,
      reason: accessResult.reason,
      trialExpiresAt: accessResult.trialExpiresAt,
      accessExpiresAt: accessResult.accessExpiresAt,
      user: accessResult.user ? {
        sessionId: (accessResult.user as any).sessionId,
        walletAddress: (accessResult.user as any).walletAddress,
        referenceId: (accessResult.user as any).referenceId,
        isPaid: (accessResult.user as any).isPaid,
        createdAt: (accessResult.user as any).createdAt
      } : null
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