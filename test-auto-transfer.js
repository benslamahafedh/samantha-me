// Test script to diagnose auto-transfer issues
// Run with: node test-auto-transfer.js

const fetch = require('node-fetch');

async function testAutoTransfer() {
  console.log('🔍 Testing auto-transfer system...\n');
  
  try {
    // Test 1: Check debug info
    console.log('1️⃣ Getting debug information...');
    const debugResponse = await fetch('http://localhost:3000/api/debug-auto-transfer');
    const debugData = await debugResponse.json();
    
    if (debugData.success) {
      console.log('✅ Debug info retrieved successfully');
      console.log('📊 Summary:');
      console.log(`   - Total users: ${debugData.debugInfo.users.total}`);
      console.log(`   - Paid users: ${debugData.debugInfo.users.paid}`);
      console.log(`   - Owner wallet balance: ${debugData.debugInfo.ownerWallet.balanceSol} SOL`);
      console.log(`   - Total available SOL: ${debugData.debugInfo.totalAvailableSol} SOL`);
      console.log(`   - Periodic transfers: ${debugData.debugInfo.autoTransferStats.isPeriodicTransfersActive ? 'Active' : 'Inactive'}`);
      
      if (debugData.debugInfo.recommendations.length > 0) {
        console.log('\n⚠️  Recommendations:');
        debugData.debugInfo.recommendations.forEach(rec => console.log(`   - ${rec}`));
      }
      
      if (debugData.debugInfo.users.userBalances.length > 0) {
        console.log('\n💰 User wallet balances:');
        debugData.debugInfo.users.userBalances.forEach(user => {
          console.log(`   - ${user.walletAddress}: ${user.balanceSol} SOL (can transfer: ${user.canTransfer})`);
        });
      }
      
      // Test 2: Force transfer all if there are paid users
      if (debugData.debugInfo.users.paid > 0) {
        console.log('\n2️⃣ Testing force transfer all...');
        const transferResponse = await fetch('http://localhost:3000/api/debug-auto-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'force_transfer_all' })
        });
        
        const transferData = await transferResponse.json();
        
        if (transferData.success) {
          console.log('✅ Force transfer completed');
          console.log(`   - Transferred: ${transferData.result.transferredCount} wallets`);
          console.log(`   - Failed: ${transferData.result.failedCount} wallets`);
          console.log(`   - Total SOL: ${transferData.result.totalTransferred.toFixed(6)} SOL`);
          
          if (transferData.result.errors.length > 0) {
            console.log('\n❌ Transfer errors:');
            transferData.result.errors.forEach(error => console.log(`   - ${error}`));
          }
        } else {
          console.log('❌ Force transfer failed:', transferData.error);
        }
      } else {
        console.log('\n⏭️  Skipping force transfer - no paid users found');
      }
      
      // Test 3: Check admin auto-transfer endpoint
      console.log('\n3️⃣ Testing admin auto-transfer endpoint...');
      const adminResponse = await fetch('http://localhost:3000/api/admin/auto-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_all' })
      });
      
      const adminData = await adminResponse.json();
      
      if (adminData.success) {
        console.log('✅ Admin auto-transfer completed');
        console.log(`   - Message: ${adminData.message}`);
      } else {
        console.log('❌ Admin auto-transfer failed:', adminData.error);
      }
      
    } else {
      console.log('❌ Failed to get debug info:', debugData.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🏁 Test completed');
}

// Run the test
testAutoTransfer(); 