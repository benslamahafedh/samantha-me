import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Payment configuration
const PAYMENT_AMOUNT_LAMPORTS = 1 * LAMPORTS_PER_SOL; // 1 SOL in lamports
const RECEIVER_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS || 
  'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6'
);

// Use multiple RPC endpoints for reliability
const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana'
].filter(Boolean) as string[];

async function getConnection(): Promise<Connection> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      // Test the connection
      await connection.getVersion();
      return connection;
    } catch {
      continue;
    }
  }
  throw new Error('No working RPC endpoint found');
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, transactionSignature } = await req.json();
    
    if (!walletAddress || !transactionSignature) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Wallet address and transaction signature required' 
      }, { status: 400 });
    }

    // Validate wallet address format
    let senderPublicKey: PublicKey;
    try {
      senderPublicKey = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json({ 
        verified: false, 
        error: 'Invalid wallet address format' 
      }, { status: 400 });
    }

    const connection = await getConnection();

    // Get transaction details
    const transaction = await connection.getTransaction(transactionSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    // Verify transaction was successful
    if (transaction.meta?.err) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Transaction failed' 
      }, { status: 400 });
    }

    // Check if transaction involves the correct sender and receiver
    const preBalances = transaction.meta?.preBalances || [];
    const postBalances = transaction.meta?.postBalances || [];
    
    // Get account keys from the transaction
    const message = transaction.transaction.message;
    const accountKeys = 'accountKeys' in message 
      ? message.accountKeys 
      : message.getAccountKeys().staticAccountKeys;

    // Find sender and receiver account indices
    let senderIndex = -1;
    let receiverIndex = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      const accountKey = accountKeys[i];
      if (accountKey.equals(senderPublicKey)) {
        senderIndex = i;
      }
      if (accountKey.equals(RECEIVER_WALLET)) {
        receiverIndex = i;
      }
    }

    if (senderIndex === -1) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Sender wallet not found in transaction' 
      }, { status: 400 });
    }

    if (receiverIndex === -1) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Receiver wallet not found in transaction' 
      }, { status: 400 });
    }

    // Calculate the amount transferred
    const receiverBalanceChange = postBalances[receiverIndex] - preBalances[receiverIndex];

    // Verify the payment amount (allowing for small transaction fees)
    const minAcceptableAmount = PAYMENT_AMOUNT_LAMPORTS * 0.99; // 1% tolerance for fees
    
    if (receiverBalanceChange < minAcceptableAmount) {
      return NextResponse.json({ 
        verified: false, 
        error: `Insufficient payment amount. Required: ${PAYMENT_AMOUNT_LAMPORTS / LAMPORTS_PER_SOL} SOL, Received: ${receiverBalanceChange / LAMPORTS_PER_SOL} SOL` 
      }, { status: 400 });
    }

    // Check transaction age (prevent replay attacks with old transactions)
    const transactionTime = transaction.blockTime;
    if (!transactionTime) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Transaction timestamp not available' 
      }, { status: 400 });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 24 * 60 * 60; // 24 hours
    
    if (currentTime - transactionTime > maxAge) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Transaction too old (max 24 hours)' 
      }, { status: 400 });
    }

    // Store verified payment in database/cache (you could add this)
    // For now, we'll rely on blockchain verification each time

    return NextResponse.json({ 
      verified: true, 
      amount: receiverBalanceChange / LAMPORTS_PER_SOL,
      transactionTime,
      blockHash: transaction.transaction.message.recentBlockhash
    });

  } catch {
    console.error('Payment verification error');
    return NextResponse.json({ 
      verified: false, 
      error: 'Payment verification failed' 
    }, { status: 500 });
  }
} 