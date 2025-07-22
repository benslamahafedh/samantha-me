// Build-safe auto-transfer manager
// This version prevents build-time import issues

export interface IBuildSafeAutoTransfer {
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

// Mock implementation for build-time safety
const mockAutoTransfer: IBuildSafeAutoTransfer = {
  transferFromUserWallet: async () => ({ 
    success: false, 
    error: 'Auto-transfer disabled during build' 
  }),
  transferFromAllWallets: async () => ({ 
    success: false, 
    totalTransferred: 0, 
    transferredCount: 0, 
    failedCount: 0, 
    errors: ['Auto-transfer disabled during build'] 
  }),
  getTransferStats: async () => ({ 
    ownerWallet: 'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6', 
    minTransferAmount: 0.0001, 
    gasReserve: 0.000005, 
    isPeriodicTransfersActive: false 
  }),
  stopPeriodicTransfers: () => {}
};

// Runtime-safe getter
export const getBuildSafeAutoTransfer = (): IBuildSafeAutoTransfer => {
  // During build time, always return mock
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    // In production server, try to load the real implementation
    try {
      // This will only be called at runtime, not during build
      const { getAutoTransferManagerInstance } = require('./autoTransferManager');
      return getAutoTransferManagerInstance();
    } catch (error) {
      console.warn('Auto-transfer not available, using mock:', error);
      return mockAutoTransfer;
    }
  }
  
  // During build or client-side, return mock
  return mockAutoTransfer;
};

// Async version for API routes
export const getBuildSafeAutoTransferAsync = async (): Promise<IBuildSafeAutoTransfer> => {
  if (typeof window !== 'undefined') {
    return mockAutoTransfer;
  }

  try {
    // Dynamic import to prevent build-time issues
    const { getAutoTransferManagerInstance } = await import('./autoTransferManager');
    return getAutoTransferManagerInstance();
  } catch (error) {
    console.warn('Auto-transfer not available, using mock:', error);
    return mockAutoTransfer;
  }
}; 