import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
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
  private connection: Connection;
  private readonly OWNER_WALLET = 'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6';
  private readonly MIN_TRANSFER_AMOUNT = 0.0001; // Minimum SOL to transfer
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

      // Derive private key for the user wallet
      const privateKeyBase64 = await this.database.derivePrivateKey(sessionId);
      if (!privateKeyBase64) {
        return { success: false, error: 'Failed to derive private key' };
      }

      const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');
      
      // Validate private key size
      if (privateKeyBytes.length !== 64) {
        console.error(`❌ Invalid private key size: ${privateKeyBytes.length} bytes (expected 64)`);
        return { success: false, error: 'Invalid private key size' };
      }

      let userKeypair: Keypair;
      try {
        userKeypair = Keypair.fromSecretKey(privateKeyBytes);
      } catch (error) {
        console.error('❌ Failed to create keypair from private key:', error);
        return { success: false, error: 'Invalid private key format' };
      }
      
      // Check wallet balance
      const balance = await this.connection.getBalance(userKeypair.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;

      console.log(`💰 Wallet ${user.walletAddress} balance: ${balanceInSol} SOL`);

      if (balanceInSol < this.MIN_TRANSFER_AMOUNT) {
        console.log(`⏳ Insufficient balance for transfer: ${balanceInSol} SOL`);
        return { success: false, error: 'Insufficient balance' };
      }

      // Calculate transfer amount (leave some for gas)
      const transferAmount = balanceInSol - this.GAS_RESERVE;
      const transferLamports = Math.floor(transferAmount * LAMPORTS_PER_SOL);

      if (transferLamports <= 0) {
        console.log(`⏳ Transfer amount too small: ${transferAmount} SOL`);
        return { success: false, error: 'Transfer amount too small' };
      }

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userKeypair.publicKey,
          toPubkey: new PublicKey(this.OWNER_WALLET),
          lamports: transferLamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userKeypair.publicKey;

      // Sign and send transaction
      transaction.sign(userKeypair);
      const signature = await this.connection.sendRawTransaction(transaction.serialize());
      
      // Wait for confirmation
      const confirmation = await Promise.race([
        this.connection.confirmTransaction(signature, 'confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
      ]);

      console.log(`✅ Auto-transfer successful: ${transferAmount.toFixed(6)} SOL from ${user.walletAddress} to ${this.OWNER_WALLET}`);
      console.log(`🔗 Transaction: https://solscan.io/tx/${signature}`);

      return {
        success: true,
        amount: transferAmount,
        signature
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
      const paidUsers = allUsers.filter(user => user.isPaid && user.amountReceived && user.amountReceived > 0);
      
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
    // Check every 30 minutes for transfers
    const TRANSFER_INTERVAL = 30 * 60 * 1000; // 30 minutes
    
    this.transferInterval = setInterval(async () => {
      console.log('⏰ Periodic auto-transfer check started...');
      await this.transferFromAllWallets();
    }, TRANSFER_INTERVAL);

    console.log(`🔄 Auto-transfer manager started. Checking every ${TRANSFER_INTERVAL / 60000} minutes.`);
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

export const autoTransferManager: IAutoTransferManager = (() => {
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
})(); 