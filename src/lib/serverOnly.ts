// Server-only module for Solana operations
// This prevents build-time import issues

export interface ISolanaManager {
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

// Mock implementation for build-time
const mockSolanaManager: ISolanaManager = {
  transferFromUserWallet: async () => ({ success: false, error: 'Server-side only' }),
  transferFromAllWallets: async () => ({ success: false, totalTransferred: 0, transferredCount: 0, failedCount: 0, errors: ['Server-side only'] }),
  getTransferStats: async () => ({ ownerWallet: '', minTransferAmount: 0, gasReserve: 0, isPeriodicTransfersActive: false }),
  stopPeriodicTransfers: () => {}
};

// Dynamic import function
export const getSolanaManager = async (): Promise<ISolanaManager> => {
  if (typeof window !== 'undefined') {
    return mockSolanaManager;
  }

  try {
    // Dynamic import to prevent build-time issues
    const { getAutoTransferManagerInstance } = await import('./autoTransferManager');
    return getAutoTransferManagerInstance();
  } catch (error) {
    console.error('Failed to load Solana manager:', error);
    return mockSolanaManager;
  }
};

// Synchronous getter for runtime
export const getSolanaManagerSync = (): ISolanaManager => {
  if (typeof window !== 'undefined') {
    return mockSolanaManager;
  }
  
  // This should only be called after initialization
  console.warn('Solana manager not initialized, returning mock');
  return mockSolanaManager;
}; 