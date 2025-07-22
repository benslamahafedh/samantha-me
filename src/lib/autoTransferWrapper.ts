// Wrapper for auto-transfer manager to prevent build-time import issues
export interface IAutoTransferManager {
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

// Mock implementation for client-side
const mockAutoTransferManager: IAutoTransferManager = {
  transferFromUserWallet: async () => ({ success: false, error: 'Server-side only' }),
  transferFromAllWallets: async () => ({ success: false, totalTransferred: 0, transferredCount: 0, failedCount: 0, errors: ['Server-side only'] }),
  getTransferStats: async () => ({ ownerWallet: '', minTransferAmount: 0, gasReserve: 0, isPeriodicTransfersActive: false }),
  stopPeriodicTransfers: () => {}
};

// Dynamic import wrapper
let autoTransferManagerInstance: IAutoTransferManager | null = null;

export const getAutoTransferManager = async (): Promise<IAutoTransferManager> => {
  if (typeof window !== 'undefined') {
    // Client-side: return mock
    return mockAutoTransferManager;
  }

  // Server-side: lazy load the real implementation
  if (!autoTransferManagerInstance) {
    try {
      const { getAutoTransferManagerInstance } = await import('./autoTransferManager');
      autoTransferManagerInstance = getAutoTransferManagerInstance();
    } catch (error) {
      console.error('Failed to load auto-transfer manager:', error);
      return mockAutoTransferManager;
    }
  }

  return autoTransferManagerInstance;
};

// Synchronous getter for cases where we know we're on server-side
export const getAutoTransferManagerSync = (): IAutoTransferManager => {
  if (typeof window !== 'undefined') {
    return mockAutoTransferManager;
  }
  
  if (!autoTransferManagerInstance) {
    // This should only be called after initialization
    console.warn('Auto-transfer manager not initialized, returning mock');
    return mockAutoTransferManager;
  }
  
  return autoTransferManagerInstance;
}; 