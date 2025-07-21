import { Database } from './database';
import crypto from 'crypto';

interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  userAgent: string;
  ipAddress: string;
}

// SECURITY FIX: Server-side session storage with expiration
declare global {
  var activeSessions: Map<string, SessionData> | undefined;
}

if (!global.activeSessions) {
  global.activeSessions = new Map();
}

export class SessionManager {
  private static instance: SessionManager;
  private database: Database;
  private sessions: Map<string, SessionData>;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly TRIAL_DURATION = 3 * 60 * 1000; // 3 minutes
  private readonly PAID_DURATION = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.database = Database.getInstance();
    this.sessions = global.activeSessions!;
    
    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Every 5 minutes
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // SECURITY FIX: Generate cryptographically secure session IDs
  private generateSecureSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // SECURITY FIX: Validate session with proper checks
  async validateSession(sessionId: string, userAgent?: string, ipAddress?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const now = new Date();
    
    // Check if session has expired
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // SECURITY FIX: Validate user agent and IP (optional but recommended)
    if (userAgent && session.userAgent !== userAgent) {
      console.warn('Session validation failed: User agent mismatch');
      return false;
  }

    if (ipAddress && session.ipAddress !== ipAddress) {
      console.warn('Session validation failed: IP address mismatch');
      return false;
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionId, session);

    return true;
  }

  // Get or create session with proper validation
  async getOrCreateSession(existingSessionId?: string, userAgent?: string, ipAddress?: string): Promise<{
    sessionId: string;
    isNew: boolean;
    user: unknown;
  }> {
    // SECURITY FIX: Validate existing session if provided
    if (existingSessionId) {
      const isValid = await this.validateSession(existingSessionId, userAgent, ipAddress);
      if (isValid) {
        const user = await this.database.getUserBySessionId(existingSessionId);
        if (user) {
          return {
            sessionId: existingSessionId,
            isNew: false,
            user
          };
        }
      }
    }

    // Create new session
    const sessionId = this.generateSecureSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION);

    // SECURITY FIX: Store session data server-side
    const sessionData: SessionData = {
      sessionId,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      userAgent: userAgent || 'unknown',
      ipAddress: ipAddress || 'unknown'
    };

    this.sessions.set(sessionId, sessionData);

    // Create user in database
    const user = await this.database.createAnonymousUser(sessionId, this.TRIAL_DURATION / 60000);

    return {
      sessionId,
      isNew: true,
      user
    };
  }

  // Check access with session validation
  async checkAccess(sessionId: string, userAgent?: string, ipAddress?: string): Promise<{
    hasAccess: boolean;
    reason: string;
    user?: unknown;
    trialExpiresAt?: Date;
    accessExpiresAt?: Date;
  }> {
    // SECURITY FIX: Validate session first
    const isValidSession = await this.validateSession(sessionId, userAgent, ipAddress);
    if (!isValidSession) {
      return {
        hasAccess: false,
        reason: 'Invalid or expired session'
      };
    }

    // Check database access
    const accessResult = await this.database.hasAccess(sessionId);
    return accessResult;
  }

  // Get payment address for session
  async getPaymentAddress(sessionId: string, userAgent?: string, ipAddress?: string): Promise<{
    walletAddress: string;
    referenceId: string;
    amount: number;
    expiresAt: Date;
  } | null> {
    // SECURITY FIX: Validate session
    const isValidSession = await this.validateSession(sessionId, userAgent, ipAddress);
    if (!isValidSession) {
      return null;
    }

    const user = await this.database.getUserBySessionId(sessionId);
    if (!user) return null;

    return {
      walletAddress: user.walletAddress,
      referenceId: user.referenceId,
      amount: 0.0009, // Fixed amount
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
  }

  // Mark payment received
  async markPaymentReceived(sessionId: string, txId: string, amount: number, userAgent?: string, ipAddress?: string): Promise<boolean> {
    // SECURITY FIX: Validate session
    const isValidSession = await this.validateSession(sessionId, userAgent, ipAddress);
    if (!isValidSession) {
      return false;
    }

    const user = await this.database.markUserAsPaid(sessionId, txId, amount, this.PAID_DURATION / 3600000);
    return user !== null;
  }

  // Get session recovery info
  async getSessionRecoveryInfo(sessionId: string): Promise<{
    sessionId: string;
    walletAddress: string;
    referenceId: string;
    status: 'trial' | 'paid' | 'expired';
    expiresAt: Date | null;
  } | null> {
    const user = await this.database.getUserBySessionId(sessionId);
    if (!user) return null;
    const now = new Date();
    let status: 'trial' | 'paid' | 'expired' = 'expired';
    if (user.isPaid && user.accessExpiresAt && now < user.accessExpiresAt) {
      status = 'paid';
    } else if (now < user.trialExpiresAt) {
      status = 'trial';
    }
    return {
      sessionId: user.sessionId,
      walletAddress: user.walletAddress,
      referenceId: user.referenceId,
      status,
      expiresAt: status === 'paid' ? user.accessExpiresAt : user.trialExpiresAt
    };
  }

  // SECURITY FIX: Clean up expired sessions
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        deletedCount++;
  }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
    }
  }

  // SECURITY FIX: Invalidate session (for logout)
  async invalidateSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  // Get session info (for debugging)
  async getSessionInfo(sessionId?: string): Promise<SessionData | null> {
    if (!sessionId) {
      // Return first available session or null
      const firstSession = this.sessions.values().next().value;
      return firstSession || null;
    }
    return this.sessions.get(sessionId) || null;
  }

  // Stub methods for compatibility with existing components
  canStartSession(): boolean {
    return true; // Always allow session start for now
  }

  startSession(): boolean {
    return true; // Always succeed for now
  }

  getRemainingFreeTime(): number {
    return 300000; // Return 5 minutes in milliseconds
  }

  // Get all users (for admin purposes)
  async getAllUsers(): Promise<unknown[]> {
    return await this.database.getAllUsers();
  }

  // Get admin statistics
  async getAdminStats(): Promise<{
    totalUsers: number;
    trialUsers: number;
    paidUsers: number;
    totalRevenue: number;
    recentPayments: unknown[];
  }> {
    return await this.database.getPaymentStats();
  }

  // Get user by wallet address (for webhook processing)
  async getUserByWalletAddress(walletAddress: string): Promise<unknown | null> {
    return await this.database.getUserByWalletAddress(walletAddress);
  }

  // Event listeners for session management
  private sessionEndListeners: (() => void)[] = [];
  private timeUpdateListeners: ((timeLeft: number) => void)[] = [];

  onSessionEnd(callback: () => void): void {
    this.sessionEndListeners.push(callback);
  }

  onTimeUpdate(callback: (timeLeft: number) => void): void {
    this.timeUpdateListeners.push(callback);
  }

  private notifySessionEnd(): void {
    this.sessionEndListeners.forEach(callback => callback());
  }

  private notifyTimeUpdate(timeLeft: number): void {
    this.timeUpdateListeners.forEach(callback => callback(timeLeft));
  }
}

// SECURITY FIX: Export the getSessionManager function for compatibility
export function getSessionManager(): SessionManager {
  return SessionManager.getInstance();
} 