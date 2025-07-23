// Server initialization - ensures auto-transfer manager starts on server startup
import { getAutoTransferManagerInstance } from './autoTransferManager';

// Initialize auto-transfer manager on server startup
if (typeof window === 'undefined') {
  console.log('🚀 Initializing server components...');
  
  try {
    // Initialize auto-transfer manager
    const autoTransferManager = getAutoTransferManagerInstance();
    console.log('✅ Auto-transfer manager initialized');
    
    // Test the manager
    autoTransferManager.getTransferStats().then(stats => {
      console.log('📊 Auto-transfer stats:', stats);
    }).catch(error => {
      console.error('❌ Failed to get auto-transfer stats:', error);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize auto-transfer manager:', error);
  }
}

export {}; 