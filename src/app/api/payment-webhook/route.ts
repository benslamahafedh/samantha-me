import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { SessionManager } from '@/lib/sessionManager';

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

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
      
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        sessionId: (user as any).sessionId
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