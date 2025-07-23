

// Only import Solana libraries on server-side
let Keypair: any, PublicKey: any;

if (typeof window === 'undefined') {
  const solanaWeb3 = require('@solana/web3.js');
  Keypair = solanaWeb3.Keypair;
  PublicKey = solanaWeb3.PublicKey;
}

// In-memory database (in production, use PostgreSQL, MongoDB, etc.)
interface AnonymousUser {
  sessionId: string;
  walletAddress: string;
  createdAt: Date;
  trialExpiresAt: Date;
  isPaid: boolean;
  txId: string | null;
  amountReceived: number | null;
  paymentReceivedAt: Date | null;
  accessExpiresAt: Date | null;
  referenceId: string;
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

  // Create new anonymous user with trial access
  async createAnonymousUser(sessionId: string, trialDurationMinutes: number = 3): Promise<AnonymousUser> {
    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + trialDurationMinutes * 60 * 1000);
    
    // Generate unique wallet address for this user
    let walletAddress: string;
    
    if (typeof window === 'undefined' && Keypair) {
      // Server-side: generate real keypair for address only
      const keypair = Keypair.generate();
      walletAddress = keypair.publicKey.toString();
    } else {
      // Build-time or client-side: generate mock data
      walletAddress = `mock_wallet_${sessionId.substring(0, 8)}`;
    }
    
    // Generate reference ID for tracking
    const referenceId = this.generateReferenceId(sessionId);
    
    const user: AnonymousUser = {
      sessionId,
      walletAddress,
      createdAt: now,
      trialExpiresAt,
      isPaid: false,
      txId: null,
      amountReceived: null,
      paymentReceivedAt: null,
      accessExpiresAt: null,
      referenceId
    };

    this.users.set(sessionId, user);
    return user;
  }



  // Get user by session ID
  async getUserBySessionId(sessionId: string): Promise<AnonymousUser | null> {
    return this.users.get(sessionId) || null;
  }

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<AnonymousUser | null> {
    for (const user of this.users.values()) {
      if (user.walletAddress === walletAddress) {
        return user;
      }
    }
    return null;
  }

  // Update user payment status
  async markUserAsPaid(
    sessionId: string, 
    txId: string, 
    amountReceived: number,
    accessDurationHours: number = 1
  ): Promise<AnonymousUser | null> {
    const user = this.users.get(sessionId);
    if (!user) return null;

    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + accessDurationHours * 60 * 60 * 1000);

    const updatedUser: AnonymousUser = {
      ...user,
      isPaid: true,
      txId,
      amountReceived,
      paymentReceivedAt: now,
      accessExpiresAt
    };

    this.users.set(sessionId, updatedUser);
    return updatedUser;
  }

  // Check if user has access (trial or paid)
  async hasAccess(sessionId: string): Promise<{ hasAccess: boolean; reason: string; user?: AnonymousUser }> {
    const user = this.users.get(sessionId);
    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    const now = new Date();

    // Check if user has paid access
    if (user.isPaid && user.accessExpiresAt && now < user.accessExpiresAt) {
      return { 
        hasAccess: true, 
        reason: 'Paid access active', 
        user 
      };
    }

    // Check if user has trial access
    if (now < user.trialExpiresAt) {
      return { 
        hasAccess: true, 
        reason: 'Trial access active', 
        user 
      };
    }

    return { 
      hasAccess: false, 
      reason: 'No active access', 
      user 
    };
  }

  // Get all users (for admin purposes)
  async getAllUsers(): Promise<AnonymousUser[]> {
    return Array.from(this.users.values());
  }

  // Get payment statistics
  async getPaymentStats(): Promise<{
    totalUsers: number;
    trialUsers: number;
    paidUsers: number;
    totalRevenue: number;
    recentPayments: Omit<AnonymousUser, 'encryptedPrivateKey'>[];
  }> {
    const users = Array.from(this.users.values());
    const now = new Date();

    const trialUsers = users.filter(u => !u.isPaid && now < u.trialExpiresAt).length;
    const paidUsers = users.filter(u => u.isPaid && u.accessExpiresAt && now < u.accessExpiresAt).length;
    const totalRevenue = users
      .filter(u => u.isPaid && u.amountReceived)
      .reduce((sum, u) => sum + (u.amountReceived || 0), 0);

    const recentPayments = users
      .filter(u => u.isPaid && u.paymentReceivedAt)
      .sort((a, b) => (b.paymentReceivedAt?.getTime() || 0) - (a.paymentReceivedAt?.getTime() || 0))
      .slice(0, 10)
      .map(user => user);

    return {
      totalUsers: users.length,
      trialUsers,
      paidUsers,
      totalRevenue,
      recentPayments
    };
  }

  // Clean up expired sessions (optional maintenance)
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, user] of this.users.entries()) {
      const isExpired = user.isPaid 
        ? (user.accessExpiresAt && now > user.accessExpiresAt)
        : (now > user.trialExpiresAt);

      if (isExpired) {
        this.users.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Generate unique reference ID
  private generateReferenceId(sessionId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${sessionId.slice(0, 8)}-${timestamp}-${random}`;
  }

  // Reset database (for testing/debugging)
  async resetDatabase(): Promise<void> {
    this.users.clear();
    console.log('🗑️ Database reset complete');
  }
} 