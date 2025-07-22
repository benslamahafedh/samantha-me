import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

// Only import Solana libraries on server-side
let Connection: any, PublicKey: any, Keypair: any, LAMPORTS_PER_SOL: any, Transaction: any, SystemProgram: any;

if (typeof window === 'undefined') {
  const solanaWeb3 = require('@solana/web3.js');
  Connection = solanaWeb3.Connection;
  PublicKey = solanaWeb3.PublicKey;
  Keypair = solanaWeb3.Keypair;
  LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;
  Transaction = solanaWeb3.Transaction;
  SystemProgram = solanaWeb3.SystemProgram;
}

export async function POST(req: NextRequest) {
  try {
    const { ownerWallet, rpcUrl = 'https://api.mainnet-beta.solana.com', batchSize = 10 } = await req.json();

    if (!ownerWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'Owner wallet address is required' 
      }, { status: 400 });
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
    const successfulCollections: Array<{wallet: string, amount: number}> = [];

    // Process users in batches for better performance
    const processBatch = async (batch: any[]) => {
      const batchPromises = batch.map(async (user) => {
        try {
          // Reconstruct user's keypair from stored private key
          const privateKeyBytes = Buffer.from(user.privateKey, 'base64');
          const userKeypair = Keypair.fromSecretKey(privateKeyBytes);
          
          // Get user wallet balance
          const balance = await connection.getBalance(userKeypair.publicKey);
          
          if (balance <= 0) {
            console.log(`No balance in wallet ${user.walletAddress}`);
            return null;
          }

          // Calculate transfer amount (leave some for transaction fees)
          const transferAmount = balance - (0.000005 * LAMPORTS_PER_SOL); // Leave 0.000005 SOL for fees
          
          if (transferAmount <= 0) {
            console.log(`Insufficient balance in wallet ${user.walletAddress}`);
            return null;
          }

          // Create transfer transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: userKeypair.publicKey,
              toPubkey: ownerPublicKey,
              lamports: transferAmount,
            })
          );

          // Get recent blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = userKeypair.publicKey;

          // Sign and send transaction
          transaction.sign(userKeypair);
          const signature = await connection.sendRawTransaction(transaction.serialize());
          
          // Wait for confirmation (with timeout)
          const confirmation = await Promise.race([
            connection.confirmTransaction(signature, 'confirmed'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
          ]);
          
          const collectedAmount = transferAmount / LAMPORTS_PER_SOL;
          console.log(`Successfully collected ${collectedAmount} SOL from ${user.walletAddress}`);
          
          return {
            wallet: user.walletAddress,
            amount: collectedAmount,
            signature
          };
          
        } catch (error) {
          console.error(`Failed to collect from ${user.walletAddress}:`, error);
          failedCollections.push(user.walletAddress);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          totalCollected += result.value.amount;
          collectedCount++;
          successfulCollections.push({
            wallet: result.value.wallet,
            amount: result.value.amount
          });
        }
      });
    };

    // Process in batches
    for (let i = 0; i < paidUsers.length; i += batchSize) {
      const batch = paidUsers.slice(i, i + batchSize);
      await processBatch(batch);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < paidUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      totalCollected: totalCollected.toFixed(6),
      collectedCount,
      failedCollections,
      successfulCollections,
      totalUsers: paidUsers.length,
      successRate: ((collectedCount / paidUsers.length) * 100).toFixed(1) + '%',
      message: `Collected ${totalCollected.toFixed(6)} SOL from ${collectedCount}/${paidUsers.length} wallets (${((collectedCount / paidUsers.length) * 100).toFixed(1)}% success rate)`
    });

  } catch (error: unknown) {
    console.error('Batch payment collection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown collection error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 