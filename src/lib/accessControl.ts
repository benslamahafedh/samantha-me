import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from './sessionManager';
import { InputValidator } from './inputValidation';

export interface AccessControlResult {
  hasAccess: boolean;
  reason: string;
  sessionId?: string;
  user?: any;
  trialExpiresAt?: Date;
  accessExpiresAt?: Date;
}

export class AccessControl {
  private static sessionManager = SessionManager.getInstance();

  /**
   * Get session manager instance (for internal use)
   */
  public static getSessionManager() {
    return this.sessionManager;
  }

  /**
   * Validate session and check access for protected routes
   */
  static async validateAccess(req: NextRequest): Promise<AccessControlResult> {
    try {
      // Get session ID from headers or body
      const sessionId = this.extractSessionId(req);
      
      if (!sessionId) {
        return {
          hasAccess: false,
          reason: 'No session ID provided'
        };
      }

      // Validate session ID format
      const sessionValidation = InputValidator.validateSessionId(sessionId);
      if (!sessionValidation.isValid) {
        return {
          hasAccess: false,
          reason: `Invalid session ID: ${sessionValidation.error}`
        };
      }

      // Get client information for validation
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const clientIp = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

      // Check session access
      const accessResult = await this.sessionManager.checkAccess(
        sessionId, 
        userAgent, 
        clientIp
      );

      return {
        hasAccess: accessResult.hasAccess,
        reason: accessResult.reason,
        sessionId,
        user: accessResult.user,
        trialExpiresAt: accessResult.trialExpiresAt,
        accessExpiresAt: accessResult.accessExpiresAt
      };

    } catch (error) {
      console.error('Access control validation error:', error);
      return {
        hasAccess: false,
        reason: 'Access validation failed'
      };
    }
  }

  /**
   * Extract session ID from request
   */
  private static extractSessionId(req: NextRequest): string | null {
    // Try to get from Authorization header first
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get from X-Session-ID header
    const sessionHeader = req.headers.get('x-session-id');
    if (sessionHeader) {
      return sessionHeader;
    }

    // For POST requests, we'll let the route handlers extract session ID from body
    // This is more reliable than trying to read the body here
    return null;
  }

  /**
   * Create access denied response
   */
  static createAccessDeniedResponse(reason: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Access denied',
      reason,
      requiresPayment: reason.includes('No active access') || reason.includes('Trial expired')
    }, { status: 403 });
  }

  /**
   * Create session required response
   */
  static createSessionRequiredResponse(): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Session required',
      reason: 'Valid session ID is required to access this feature'
    }, { status: 401 });
  }

  /**
   * Log access attempt for security monitoring
   */
  static logAccessAttempt(
    sessionId: string, 
    hasAccess: boolean, 
    reason: string, 
    endpoint: string,
    clientIp: string
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      sessionId: sessionId.substring(0, 8) + '...', // Partial for security
      hasAccess,
      reason,
      endpoint,
      clientIp: clientIp.substring(0, 15) + '...' // Partial for security
    };

    if (hasAccess) {
      console.log(`✅ Access granted: ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`❌ Access denied: ${JSON.stringify(logEntry)}`);
    }
  }

  /**
   * Get remaining trial time for a session
   */
  static async getRemainingTrialTime(sessionId: string): Promise<number> {
    try {
      const accessResult = await this.sessionManager.checkAccess(sessionId);
      
      if (accessResult.reason === 'Trial access active' && accessResult.trialExpiresAt) {
        const now = new Date();
        const timeLeft = Math.max(0, accessResult.trialExpiresAt.getTime() - now.getTime());
        return Math.floor(timeLeft / 1000); // Return seconds
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting remaining trial time:', error);
      return 0;
    }
  }

  /**
   * Check if session is in trial period
   */
  static async isInTrialPeriod(sessionId: string): Promise<boolean> {
    try {
      const accessResult = await this.sessionManager.checkAccess(sessionId);
      return accessResult.reason === 'Trial access active';
    } catch (error) {
      console.error('Error checking trial period:', error);
      return false;
    }
  }

  /**
   * Check if session has paid access
   */
  static async hasPaidAccess(sessionId: string): Promise<boolean> {
    try {
      const accessResult = await this.sessionManager.checkAccess(sessionId);
      return accessResult.reason === 'Paid access active';
    } catch (error) {
      console.error('Error checking paid access:', error);
      return false;
    }
  }
}

/**
 * Middleware function to protect API routes
 */
export function requireAccess(handler: (req: NextRequest, accessResult: AccessControlResult) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // For POST requests, we need to extract session ID from body first
      let sessionId: string | null = null;
      
      if (req.method === 'POST') {
        try {
          // Clone request to read body
          const clonedReq = req.clone();
          
          // Check content type to determine how to parse the body
          const contentType = req.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            // Handle JSON requests
            const body = await clonedReq.json();
            sessionId = body.sessionId || null;
          } else if (contentType.includes('multipart/form-data')) {
            // Handle FormData requests (like transcribe endpoint)
            const formData = await clonedReq.formData();
            sessionId = formData.get('sessionId') as string || null;
          } else {
            // Try JSON as fallback, but don't log error for non-JSON content
            try {
              const body = await clonedReq.json();
              sessionId = body.sessionId || null;
            } catch (jsonError) {
              // Silently ignore JSON parsing errors for non-JSON content
            }
          }
        } catch (error) {
          console.error('Error reading request body for session ID:', error);
        }
      }

      // If we have session ID from body, validate it directly
      if (sessionId) {
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const clientIp = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        'unknown';

        const accessResult = await AccessControl.getSessionManager().checkAccess(
          sessionId, 
          userAgent, 
          clientIp
        );

        // Log access attempt
        AccessControl.logAccessAttempt(
          sessionId,
          accessResult.hasAccess,
          accessResult.reason,
          req.nextUrl.pathname,
          clientIp
        );

        // Check if access is granted
        if (!accessResult.hasAccess) {
          return AccessControl.createAccessDeniedResponse(accessResult.reason);
        }

        // Call the original handler with access result
        return await handler(req, {
          hasAccess: accessResult.hasAccess,
          reason: accessResult.reason,
          sessionId,
          user: accessResult.user,
          trialExpiresAt: accessResult.trialExpiresAt,
          accessExpiresAt: accessResult.accessExpiresAt
        });
      } else {
        // Fallback to header-based validation
        const accessResult = await AccessControl.validateAccess(req);
        
        // Log access attempt
        const clientIp = req.headers.get('x-forwarded-for') || 
                        req.headers.get('x-real-ip') || 
                        'unknown';
        AccessControl.logAccessAttempt(
          accessResult.sessionId || 'unknown',
          accessResult.hasAccess,
          accessResult.reason,
          req.nextUrl.pathname,
          clientIp
        );

        // Check if access is granted
        if (!accessResult.hasAccess) {
          return AccessControl.createAccessDeniedResponse(accessResult.reason);
        }

        // Call the original handler with access result
        return await handler(req, accessResult);
      }

    } catch (error) {
      console.error('Access control middleware error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error during access validation'
      }, { status: 500 });
    }
  };
} 