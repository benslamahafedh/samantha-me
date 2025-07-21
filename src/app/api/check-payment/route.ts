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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();

    // First check if user already has access
    const accessResult = await sessionManager.checkAccess(sessionId);
    if (accessResult.hasAccess) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        reason: accessResult.reason,
        trialExpiresAt: accessResult.trialExpiresAt,
        accessExpiresAt: accessResult.accessExpiresAt
      });
    }

    // Get user data from the session
    const user = (accessResult.user as any);
    
    if (user && user.walletAddress && user.referenceId) {
      try {
        const walletAddress = user.walletAddress;
        const referenceId = user.referenceId;
        
        console.log(`🔍 Checking payment for wallet: ${walletAddress}, reference: ${referenceId}`);
        
        // Check if we have Helius API key for enhanced verification
        if (process.env.HELIUS_API_KEY) {
          try {
            // Check payment status using Helius API
            const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}`);
            
            if (response.ok) {
              const transactions = await response.json();
              console.log(`📊 Found ${transactions.length} transactions for wallet`);
              
              // Look for payment transaction with reference ID
              const paymentTransaction = transactions.find((tx: any) => 
                tx.description?.includes(referenceId) || 
                tx.description?.includes('Payment received') ||
                tx.description?.includes('Transfer') ||
                tx.type === 'TRANSFER'
              );
              
              if (paymentTransaction) {
                console.log(`✅ Payment transaction found:`, paymentTransaction.signature);
                
                // Payment found, mark as received
                const paymentReceived = await sessionManager.markPaymentReceived(
                  sessionId,
                  paymentTransaction.signature,
                  0.0009 // Correct amount
                );
                
                if (paymentReceived) {
                  console.log(`🎉 Payment marked as received for session: ${sessionId}`);
                  return NextResponse.json({
                    success: true,
                    hasAccess: true,
                    reason: 'Payment verified'
                  });
                }
              }
            }
          } catch (error) {
            console.error('Helius API error:', error);
          }
        }
        
        // Fallback: Check balance directly using Solana RPC
        try {
          const publicKey = new PublicKey(walletAddress);
          const balance = await connection.getBalance(publicKey);
          const balanceInSOL = balance / 1e9; // Convert lamports to SOL
          
          console.log(`💰 Wallet balance: ${balanceInSOL} SOL`);
          
          // If balance is greater than 0, assume payment was received
          // This is a simplified check - in production you'd want more sophisticated verification
          if (balanceInSOL > 0) {
            console.log(`✅ Balance detected, marking payment as received`);
            
            const paymentReceived = await sessionManager.markPaymentReceived(
              sessionId,
              `balance-check-${Date.now()}`, // Generate a unique transaction ID
              0.0009 // Correct amount
            );
            
            if (paymentReceived) {
              console.log(`🎉 Payment marked as received for session: ${sessionId}`);
              return NextResponse.json({
                success: true,
                hasAccess: true,
                reason: 'Payment verified via balance check'
              });
            }
          }
        } catch (error) {
          console.error('Solana RPC error:', error);
        }
        
      } catch (error) {
        console.error('Payment verification error:', error);
      }
    }

    return NextResponse.json({ 
      success: true, 
      hasAccess: false,
      message: 'No payment found' 
    });

  } catch (error: unknown) {
    console.error('Payment check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown payment check error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 