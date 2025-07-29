import { Database } from './database';
import crypto from 'crypto';

interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  userAgent: string;
  ipAddress: string;
  dailyUsageStart?: Date;
  dailyUsageMinutes?: number;
}

// SECURITY FIX: Server-side session storage with expiration
declare global {
  var activeSessions: Map<string, SessionData> | undefined;
}

// Only initialize on server-side
if (typeof window === 'undefined' && !global.activeSessions) {
  global.activeSessions = new Map();
}

export class SessionManager {
  private static instance: SessionManager;
  private database: Database;
  private sessions: Map<string, SessionData>;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DAILY_LIMIT_MINUTES = 5; // 5 minutes per day
  private readonly DAILY_RESET_HOURS = 24; // Reset every 24 hours

  private constructor() {
    this.database = Database.getInstance();
    this.sessions = global.activeSessions!;
    
    // Only start cleanup on server-side
    if (typeof window === 'undefined') {
      // Clean up expired sessions periodically
      setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Every 5 minutes
    }
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

  // Check if daily limit has been reset
  private isDailyLimitReset(session: SessionData): boolean {
    if (!session.dailyUsageStart) return true;
    
    const now = new Date();
    const lastUsage = new Date(session.dailyUsageStart);
    const hoursSinceLastUsage = (now.getTime() - lastUsage.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastUsage >= this.DAILY_RESET_HOURS;
  }

  // Get remaining daily usage time
  private getRemainingDailyTime(session: SessionData): number {
    if (this.isDailyLimitReset(session)) {
      return this.DAILY_LIMIT_MINUTES * 60 * 1000; // 5 minutes in milliseconds
    }
    
    const usedMinutes = session.dailyUsageMinutes || 0;
    const remainingMinutes = Math.max(0, this.DAILY_LIMIT_MINUTES - usedMinutes);
    return remainingMinutes * 60 * 1000; // Convert to milliseconds
  }

  // Update daily usage
  private updateDailyUsage(session: SessionData, usedMinutes: number): SessionData {
    const now = new Date();
    
    if (this.isDailyLimitReset(session)) {
      // Reset daily usage
      return {
        ...session,
        dailyUsageStart: now,
        dailyUsageMinutes: usedMinutes
      };
    } else {
      // Add to existing usage
      const currentUsage = session.dailyUsageMinutes || 0;
      return {
        ...session,
        dailyUsageMinutes: currentUsage + usedMinutes
      };
    }
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
      ipAddress: ipAddress || 'unknown',
      dailyUsageStart: now,
      dailyUsageMinutes: 0
    };

    this.sessions.set(sessionId, sessionData);

    // Create user in database
    const user = await this.database.createAnonymousUser(sessionId, this.DAILY_LIMIT_MINUTES);

    return {
      sessionId,
      isNew: true,
      user
    };
  }

  // Check access with daily limit validation
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

  // Update session usage time
  async updateSessionUsage(sessionId: string, usedMinutes: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const updatedSession = this.updateDailyUsage(session, usedMinutes);
    this.sessions.set(sessionId, updatedSession);
    
    return true;
  }

  // Get remaining daily time for a session
  async getRemainingDailyTimeForSession(sessionId: string): Promise<number> {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    return this.getRemainingDailyTime(session);
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
    activeUsers: number;
    totalDailyUsage: number;
    averageUsagePerUser: number;
  }> {
    return await this.database.getUsageStats();
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