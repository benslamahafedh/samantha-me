import { NextRequest, NextResponse } from 'next/server';
import { isValidToken } from '@/lib/adminAuth';
import { InputValidator } from '@/lib/inputValidation';

export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = InputValidator.checkRateLimit(`admin_verify_${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    const { token } = await req.json();

    // SECURITY FIX: Token validation
    const tokenValidation = InputValidator.validateToken(token);
    if (!tokenValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: tokenValidation.error 
      }, { status: 400 });
    }

    // Verify token
    if (isValidToken(token)) {
      return NextResponse.json({
        success: true,
        message: 'Token is valid'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, { status: 401 });
    }

  } catch (error: unknown) {
    console.error('Admin token verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 