// Minimal auto-transfer implementation for build safety
// This version has no Solana dependencies and won't cause build issues

export interface IMinimalAutoTransfer {
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

// Minimal implementation that logs but doesn't actually transfer
const minimalAutoTransfer: IMinimalAutoTransfer = {
  transferFromUserWallet: async (sessionId: string) => {
    console.log(`🔄 [MINIMAL] Auto-transfer requested for session: ${sessionId}`);
    console.log(`⚠️ [MINIMAL] Auto-transfer is disabled during build. Will be enabled at runtime.`);
    return { 
      success: false, 
      error: 'Auto-transfer disabled during build. Will be enabled at runtime.' 
    };
  },
  transferFromAllWallets: async () => {
    console.log(`🔄 [MINIMAL] Bulk auto-transfer requested`);
    console.log(`⚠️ [MINIMAL] Auto-transfer is disabled during build. Will be enabled at runtime.`);
    return { 
      success: false, 
      totalTransferred: 0, 
      transferredCount: 0, 
      failedCount: 0, 
      errors: ['Auto-transfer disabled during build. Will be enabled at runtime.'] 
    };
  },
  getTransferStats: async () => {
    console.log(`📊 [MINIMAL] Auto-transfer stats requested`);
    return { 
      ownerWallet: 'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6', 
      minTransferAmount: 0.0001, 
      gasReserve: 0.000005, 
      isPeriodicTransfersActive: false 
    };
  },
  stopPeriodicTransfers: () => {
    console.log(`⏹️ [MINIMAL] Stop periodic transfers requested`);
  }
};

// Export the minimal implementation
export const getMinimalAutoTransfer = (): IMinimalAutoTransfer => {
  return minimalAutoTransfer;
};

// Async version for API routes
export const getMinimalAutoTransferAsync = async (): Promise<IMinimalAutoTransfer> => {
  return minimalAutoTransfer;
}; 