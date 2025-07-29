

// Solana functionality temporarily disabled for build
let Keypair: any, PublicKey: any;

// TODO: Re-enable Solana functionality after fixing build issues
// if (typeof window === 'undefined') {
//   const solanaWeb3 = require('@solana/web3.js');
//   Keypair = solanaWeb3.Keypair;
//   PublicKey = solanaWeb3.PublicKey;
// }

// In-memory database (in production, use PostgreSQL, MongoDB, etc.)
interface AnonymousUser {
  sessionId: string;
  createdAt: Date;
  trialExpiresAt: Date;
  dailyUsageMinutes: number;
  lastUsageDate: Date;
}

// Global in-memory store (replace with real database in production)
declare global {
  var anonymousUsers: Map<string, AnonymousUser> | undefined;
}

// Only initialize on server-side
if (typeof window === 'undefined' && !global.anonymousUsers) {
  global.anonymousUsers = new Map();
}

export class Database {
  private static instance: Database;
  private users: Map<string, AnonymousUser>;

  private constructor() {
    this.users = global.anonymousUsers!;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Create new anonymous user with daily limit
  async createAnonymousUser(sessionId: string, dailyLimitMinutes: number = 5): Promise<AnonymousUser> {
    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + dailyLimitMinutes * 60 * 1000);
    
    const user: AnonymousUser = {
      sessionId,
      createdAt: now,
      trialExpiresAt,
      dailyUsageMinutes: 0,
      lastUsageDate: now
    };

    this.users.set(sessionId, user);
    return user;
  }

  // Get user by session ID
  async getUserBySessionId(sessionId: string): Promise<AnonymousUser | null> {
    return this.users.get(sessionId) || null;
  }

  // Check if user has access (daily limit)
  async hasAccess(sessionId: string): Promise<{ 
    hasAccess: boolean; 
    reason: string; 
    user?: AnonymousUser;
    trialExpiresAt?: Date;
    accessExpiresAt?: Date;
  }> {
    const user = this.users.get(sessionId);
    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    const now = new Date();

    // Check if it's a new day (reset daily usage)
    const isNewDay = this.isNewDay(user.lastUsageDate, now);
    if (isNewDay) {
      // Reset daily usage
      user.dailyUsageMinutes = 0;
      user.lastUsageDate = now;
      this.users.set(sessionId, user);
    }

    // Check if daily limit is reached (5 minutes)
    if (user.dailyUsageMinutes >= 5) {
      return { 
        hasAccess: false, 
        reason: 'Daily limit reached. Please try again tomorrow.',
        user 
      };
    }

    // Calculate remaining time
    const remainingMinutes = 5 - user.dailyUsageMinutes;
    const expiresAt = new Date(now.getTime() + remainingMinutes * 60 * 1000);

    return { 
      hasAccess: true, 
      reason: 'Daily access active', 
      user,
      trialExpiresAt: expiresAt,
      accessExpiresAt: expiresAt
    };
  }

  // Update user's daily usage
  async updateDailyUsage(sessionId: string, usedMinutes: number): Promise<boolean> {
    const user = this.users.get(sessionId);
    if (!user) return false;

    const now = new Date();
    
    // Check if it's a new day
    if (this.isNewDay(user.lastUsageDate, now)) {
      user.dailyUsageMinutes = usedMinutes;
      user.lastUsageDate = now;
    } else {
      user.dailyUsageMinutes += usedMinutes;
    }

    this.users.set(sessionId, user);
    return true;
  }

  // Check if it's a new day since last usage
  private isNewDay(lastUsageDate: Date, currentDate: Date): boolean {
    const lastDate = new Date(lastUsageDate);
    const currentDateOnly = new Date(currentDate);
    
    lastDate.setHours(0, 0, 0, 0);
    currentDateOnly.setHours(0, 0, 0, 0);
    
    return lastDate.getTime() !== currentDateOnly.getTime();
  }

  // Get all users (for admin purposes)
  async getAllUsers(): Promise<AnonymousUser[]> {
    return Array.from(this.users.values());
  }

  // Get usage statistics
  async getUsageStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalDailyUsage: number;
    averageUsagePerUser: number;
  }> {
    const users = Array.from(this.users.values());
    const now = new Date();
    
    const activeUsers = users.filter(user => 
      this.isNewDay(user.lastUsageDate, now) || user.dailyUsageMinutes < 5
    ).length;
    
    const totalDailyUsage = users.reduce((sum, user) => sum + user.dailyUsageMinutes, 0);
    const averageUsagePerUser = users.length > 0 ? totalDailyUsage / users.length : 0;

    return {
      totalUsers: users.length,
      activeUsers,
      totalDailyUsage,
      averageUsagePerUser
    };
  }

  // Clean up old sessions (older than 7 days)
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [sessionId, user] of this.users.entries()) {
      if (user.createdAt < sevenDaysAgo) {
        this.users.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Reset database (for testing)
  async resetDatabase(): Promise<void> {
    this.users.clear();
  }
} 