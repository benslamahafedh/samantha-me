import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { InputValidator } from '@/lib/inputValidation';
import { addToken } from '@/lib/adminAuth';

// Admin credentials (in production, use environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'samantha2024!';

// In-memory token store (in production, use Redis or database)
const validTokens = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Rate limiting for admin login
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = InputValidator.checkRateLimit(`admin_login_${clientIp}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Too many login attempts. Please try again later.' 
      }, { status: 429 });
    }

    const { username, password } = await req.json();

    // SECURITY FIX: Comprehensive input validation
    const credentialValidation = InputValidator.validateAdminCredentials(username, password);
    if (!credentialValidation.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: credentialValidation.error 
      }, { status: 400 });
    }

    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      // Store token with expiration
      addToken(token);
      
      // Clean up expired tokens
      setTimeout(() => {
        import('@/lib/adminAuth').then(({ removeToken }) => {
          removeToken(token);
        });
      }, 24 * 60 * 60 * 1000);

      return NextResponse.json({
        success: true,
        token,
        expiresAt,
        message: 'Login successful'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid username or password' 
      }, { status: 401 });
    }

  } catch (error: unknown) {
    console.error('Admin login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown login error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 