import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';
import { getMinimalAutoTransferAsync } from '@/lib/minimalAutoTransfer';

// Only initialize Solana connection on server-side
let connection: any;

if (typeof window === 'undefined') {
  const { Connection } = require('@solana/web3.js');
  connection = new Connection(
    process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Handle different webhook formats
    let walletAddress: string;
    let amount: number;
    let txId: string;

    // Helius webhook format
    if (body.accountData && body.accountData.account) {
      walletAddress = body.accountData.account;
      amount = body.accountData.nativeBalanceChange / 1e9; // Convert lamports to SOL
      txId = body.signature;
    }
    // Generic webhook format
    else if (body.walletAddress && body.amount && body.txId) {
      walletAddress = body.walletAddress;
      amount = body.amount;
      txId = body.txId;
    }
    // Manual webhook format
    else if (body.address && body.balance && body.signature) {
      walletAddress = body.address;
      amount = body.balance / 1e9; // Convert lamports to SOL
      txId = body.signature;
    }
    else {
      return NextResponse.json({ error: 'Invalid webhook format' }, { status: 400 });
    }

    console.log(`🔔 Webhook received:`);
    console.log(`   Wallet: ${walletAddress}`);
    console.log(`   Amount: ${amount} SOL`);
    console.log(`   TX ID: ${txId}`);

    const sessionManager = SessionManager.getInstance();

    // Find user by wallet address
    const user = await sessionManager.getUserByWalletAddress(walletAddress);
    
    if (!user) {
      console.log(`❌ No user found for wallet: ${walletAddress}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if payment amount is sufficient
    const requiredAmount = 0.0009; // 0.0009 SOL
    if (amount < requiredAmount) {
      console.log(`❌ Insufficient payment: ${amount} SOL (required: ${requiredAmount} SOL)`);
      return NextResponse.json({ 
        error: `Insufficient payment amount. Required: ${requiredAmount} SOL, Received: ${amount} SOL` 
      }, { status: 400 });
    }

    // Mark payment as received
    const success = await sessionManager.markPaymentReceived(
      (user as any).sessionId,
      txId,
      amount
    );

    if (success) {
      console.log(`✅ Payment marked as received for session ${(user as any).sessionId}`);
      
      // 🔄 AUTO-TRANSFER: Automatically transfer SOL to owner wallet
      try {
        console.log(`🔄 Initiating auto-transfer for session ${(user as any).sessionId}...`);
        const autoTransferManager = await getMinimalAutoTransferAsync();
        const transferResult = await autoTransferManager.transferFromUserWallet((user as any).sessionId);
        
        if (transferResult.success) {
          console.log(`✅ Auto-transfer successful: ${transferResult.amount?.toFixed(6)} SOL transferred to owner wallet`);
        } else {
          console.log(`⚠️ Auto-transfer failed: ${transferResult.error} - will retry in next periodic check`);
        }
      } catch (transferError) {
        console.error('❌ Auto-transfer error:', transferError);
        // Don't fail the payment processing if auto-transfer fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        sessionId: (user as any).sessionId,
        autoTransferInitiated: true
      });
    } else {
      console.error(`❌ Failed to mark payment for session ${(user as any).sessionId}`);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to process payment'
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 