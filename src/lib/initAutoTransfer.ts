import { autoTransferManager } from './autoTransferManager';

// Initialize auto-transfer manager
export function initializeAutoTransfer() {
  try {
    console.log('🚀 Initializing auto-transfer manager...');
    
    // The autoTransferManager singleton will automatically start periodic transfers
    // when it's first instantiated
    
    console.log('✅ Auto-transfer manager initialized successfully');
    console.log('🔄 Periodic transfers will run every 30 minutes');
    console.log('🎯 Target wallet: HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6');
    
  } catch (error) {
    console.error('❌ Failed to initialize auto-transfer manager:', error);
  }
}

// Export the manager instance for direct access if needed
export { autoTransferManager }; 