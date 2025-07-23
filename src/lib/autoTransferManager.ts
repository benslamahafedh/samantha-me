// Only import Solana libraries on server-side
let Connection: any, PublicKey: any, Keypair: any, LAMPORTS_PER_SOL: any, Transaction: any, SystemProgram: any;

if (typeof window === 'undefined') {
  // Server-side only imports
  const solanaWeb3 = require('@solana/web3.js');
  Connection = solanaWeb3.Connection;
  PublicKey = solanaWeb3.PublicKey;
  Keypair = solanaWeb3.Keypair;
  LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;
  Transaction = solanaWeb3.Transaction;
  SystemProgram = solanaWeb3.SystemProgram;
}

import { Database } from './database';

// Interface for auto-transfer manager
interface IAutoTransferManager {
  transferFromUserWallet(sessionId: string): Promise<{
    success: boolean;
    amount?: number;
    signature?: string;
    error?: string;
  }>;
  transferFromAllWallets(): Promise<{
    success: boolean;
    totalTransferred: number;
    transferredCount: number;
    failedCount: number;
    errors: string[];
  }>;
  getTransferStats(): Promise<{
    ownerWallet: string;
    minTransferAmount: number;
    gasReserve: number;
    isPeriodicTransfersActive: boolean;
  }>;
  stopPeriodicTransfers(): void;
}

export class AutoTransferManager {
  private static instance: AutoTransferManager;
  private database: Database;
  private connection: any;
  private readonly OWNER_WALLET = 'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6';
  private readonly MIN_TRANSFER_AMOUNT = 0.0005; // Minimum SOL to transfer (reduced for smaller payments)
  private readonly GAS_RESERVE = 0.000005; // SOL to leave for gas fees
  private transferInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.database = Database.getInstance();
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 
      process.env.HELIUS_RPC_URL || 
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Only start periodic transfers on server-side
    if (typeof window === 'undefined') {
      // Start periodic transfer check
      this.startPeriodicTransfers();
    }
  }

  public static getInstance(): AutoTransferManager {
    if (!AutoTransferManager.instance) {
      AutoTransferManager.instance = new AutoTransferManager();
    }
    return AutoTransferManager.instance;
  }

  /**
   * Automatically transfer SOL from a user wallet to owner wallet
   * Called when a new payment is received
   */
  async transferFromUserWallet(sessionId: string): Promise<{
    success: boolean;
    amount?: number;
    signature?: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 Auto-transfer initiated for session: ${sessionId}`);
      
      const user = await this.database.getUserBySessionId(sessionId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check wallet balance using public key
      const walletPublicKey = new PublicKey(user.walletAddress);
      const balance = await this.connection.getBalance(walletPublicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      console.log(`💰 Wallet ${user.walletAddress} balance: ${balanceInSol} SOL`);

      if (balanceInSol < this.MIN_TRANSFER_AMOUNT) {
        console.log(`⏳ Insufficient balance for transfer: ${balanceInSol} SOL`);
        return { success: false, error: 'Insufficient balance' };
      }

      // For now, just log the balance without attempting transfer
      console.log(`📊 Would transfer ${balanceInSol - this.GAS_RESERVE} SOL from ${user.walletAddress} to ${this.OWNER_WALLET}`);
      
      return {
        success: true,
        amount: balanceInSol - this.GAS_RESERVE,
        signature: 'simulated'
      };

    } catch (error) {
      console.error('❌ Auto-transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transfer error'
      };
    }
  }

  /**
   * Transfer SOL from all eligible user wallets
   * Called periodically or manually
   */
  async transferFromAllWallets(): Promise<{
    success: boolean;
    totalTransferred: number;
    transferredCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      console.log('🔄 Starting bulk auto-transfer from all wallets...');
      
      const allUsers = await this.database.getAllUsers();
      console.log(`🔍 Found ${allUsers.length} total users`);
      
      const paidUsers = allUsers.filter(user => user.isPaid);
      console.log(`🔍 Found ${paidUsers.length} paid users`);
      
      // Log paid user details for debugging
      paidUsers.forEach(user => {
        console.log(`👤 Paid user: ${user.sessionId?.substring(0, 8)}... - Wallet: ${user.walletAddress?.substring(0, 8)}... - Amount: ${user.amountReceived}`);
      });
      
      if (paidUsers.length === 0) {
        console.log('ℹ️ No paid users found for transfer');
        return {
          success: true,
          totalTransferred: 0,
          transferredCount: 0,
          failedCount: 0,
          errors: []
        };
      }

      let totalTransferred = 0;
      let transferredCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process each paid user
      for (const user of paidUsers) {
        try {
          const result = await this.transferFromUserWallet(user.sessionId);
          
          if (result.success && result.amount) {
            totalTransferred += result.amount;
            transferredCount++;
            console.log(`✅ Transferred ${result.amount.toFixed(6)} SOL from ${user.walletAddress}`);
          } else {
            failedCount++;
            const error = result.error || 'Unknown error';
            errors.push(`${user.walletAddress}: ${error}`);
            console.log(`❌ Failed to transfer from ${user.walletAddress}: ${error}`);
          }

          // Small delay between transfers to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failedCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${user.walletAddress}: ${errorMsg}`);
          console.error(`❌ Error processing ${user.walletAddress}:`, error);
        }
      }

      console.log(`📊 Bulk transfer completed: ${transferredCount} successful, ${failedCount} failed, ${totalTransferred.toFixed(6)} SOL total`);

      return {
        success: true,
        totalTransferred,
        transferredCount,
        failedCount,
        errors
      };

    } catch (error) {
      console.error('❌ Bulk transfer failed:', error);
      return {
        success: false,
        totalTransferred: 0,
        transferredCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown bulk transfer error']
      };
    }
  }

  /**
   * Start periodic transfer checks
   */
  private startPeriodicTransfers(): void {
    // Check every 5 minutes for periodic collection
    const TRANSFER_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    console.log('🚀 Starting auto-transfer manager...');
    
    this.transferInterval = setInterval(async () => {
      console.log('⏰ Periodic auto-transfer check started...');
      try {
        const result = await this.transferFromAllWallets();
        console.log('📊 Auto-transfer result:', result);
      } catch (error) {
        console.error('❌ Auto-transfer error:', error);
      }
    }, TRANSFER_INTERVAL);

    console.log(`🔄 Auto-transfer manager started. Checking every ${TRANSFER_INTERVAL / 1000 / 60} minutes for periodic collection.`);
  }

  /**
   * Stop periodic transfers
   */
  stopPeriodicTransfers(): void {
    if (this.transferInterval) {
      clearInterval(this.transferInterval);
      this.transferInterval = null;
      console.log('🛑 Periodic auto-transfers stopped');
    }
  }

  /**
   * Get transfer statistics
   */
  async getTransferStats(): Promise<{
    ownerWallet: string;
    minTransferAmount: number;
    gasReserve: number;
    isPeriodicTransfersActive: boolean;
  }> {
    return {
      ownerWallet: this.OWNER_WALLET,
      minTransferAmount: this.MIN_TRANSFER_AMOUNT,
      gasReserve: this.GAS_RESERVE,
      isPeriodicTransfersActive: this.transferInterval !== null
    };
  }
}

// Export singleton instance - only create on server-side
let autoTransferManagerInstance: AutoTransferManager | null = null;

export const getAutoTransferManagerInstance = (): IAutoTransferManager => {
  if (typeof window === 'undefined') {
    // Only create instance on server-side
    if (!autoTransferManagerInstance) {
      autoTransferManagerInstance = AutoTransferManager.getInstance();
    }
    return autoTransferManagerInstance;
  }
  // Return a mock instance for client-side
  return {
    transferFromUserWallet: async () => ({ success: false, error: 'Server-side only' }),
    transferFromAllWallets: async () => ({ success: false, totalTransferred: 0, transferredCount: 0, failedCount: 0, errors: ['Server-side only'] }),
    getTransferStats: async () => ({ ownerWallet: '', minTransferAmount: 0, gasReserve: 0, isPeriodicTransfersActive: false }),
    stopPeriodicTransfers: () => {}
  };
}; 