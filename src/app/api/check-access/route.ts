import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Payment configuration
const PAYMENT_AMOUNT_LAMPORTS = 1 * LAMPORTS_PER_SOL; // 1 SOL in lamports
const RECEIVER_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS || 
  'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6'
);

// Use multiple RPC endpoints for reliability - only public endpoints
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com',
  'https://mainnet.rpcpool.com'
].filter(Boolean) as string[];

async function getConnection(): Promise<Connection> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`🔗 Trying RPC endpoint: ${endpoint}`);
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'User-Agent': 'Samantha-Voice-Assistant/1.0'
        }
      });
      
      // Test the connection with a simple call
      await connection.getSlot();
      console.log(`✅ Connected to: ${endpoint}`);
      return connection;
    } catch (error) {
      console.log(`❌ Failed to connect to ${endpoint}:`, error);
      continue;
    }
  }
  throw new Error('No working RPC endpoint found. Please check your Solana RPC configuration.');
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      return NextResponse.json({ 
        hasAccess: false, 
        error: 'Wallet address required' 
      }, { status: 400 });
    }

    // Development mode fallback - allow access for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: granting access for testing');
      return NextResponse.json({ 
        hasAccess: true, 
        message: 'Development mode access granted',
        development: true
      });
    }

    // Validate wallet address format
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json({ 
        hasAccess: false, 
        error: 'Invalid wallet address format' 
      }, { status: 400 });
    }

    let connection: Connection;
    try {
      connection = await getConnection();
    } catch (error) {
      console.error('Failed to connect to Solana network:', error);
      return NextResponse.json({ 
        hasAccess: false, 
        error: 'Unable to connect to Solana network. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown connection error'
      }, { status: 503 });
    }

    try {
      // First, try to get recent transactions for the receiver wallet to see if there are any payments
      console.log('🔍 Checking receiver wallet for recent payments...');
      const receiverSignatures = await connection.getSignaturesForAddress(
        RECEIVER_WALLET,
        { limit: 10 }, // Check last 10 incoming transactions
        'confirmed'
      );

      console.log(`📋 Found ${receiverSignatures.length} recent transactions to receiver wallet`);

      // Check if any of these transactions are from our user
      for (const sigInfo of receiverSignatures) {
        try {
          const transaction = await connection.getTransaction(sigInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (!transaction || transaction.meta?.err) {
            continue;
          }

          // Check if user is the sender
          const message = transaction.transaction.message;
          const accountKeys = 'accountKeys' in message 
            ? message.accountKeys 
            : message.getAccountKeys().staticAccountKeys;

          let userIndex = -1;
          let receiverIndex = -1;

          for (let i = 0; i < accountKeys.length; i++) {
            const accountKey = accountKeys[i];
            if (accountKey.equals(userPublicKey)) {
              userIndex = i;
            }
            if (accountKey.equals(RECEIVER_WALLET)) {
              receiverIndex = i;
            }
          }

          if (userIndex !== -1 && receiverIndex !== -1) {
            const preBalances = transaction.meta?.preBalances || [];
            const postBalances = transaction.meta?.postBalances || [];
            
            const receiverBalanceChange = postBalances[receiverIndex] - preBalances[receiverIndex];
            const minAcceptableAmount = PAYMENT_AMOUNT_LAMPORTS * 0.99;

            if (receiverBalanceChange >= minAcceptableAmount) {
              console.log(`✅ Valid payment found: ${receiverBalanceChange / LAMPORTS_PER_SOL} SOL`);
              return NextResponse.json({ 
                hasAccess: true, 
                transactionSignature: sigInfo.signature,
                amount: receiverBalanceChange / LAMPORTS_PER_SOL,
                blockTime: transaction.blockTime
              });
            }
          }
        } catch (error) {
          console.log(`Skipping receiver transaction ${sigInfo.signature}:`, error);
          continue;
        }
      }

      // If no payment found in receiver transactions, check user's recent transactions
      console.log('🔍 Checking user wallet for recent payments...');
      const userSignatures = await connection.getSignaturesForAddress(
        userPublicKey,
        { limit: 20 },
        'confirmed'
      );

      console.log(`📋 Found ${userSignatures.length} recent transactions for user wallet`);

      // Check each transaction to see if it's a valid payment to our wallet
      for (const signatureInfo of userSignatures) {
        try {
          // Skip if transaction is too old (more than 30 days)
          if (signatureInfo.blockTime && (Date.now() / 1000 - signatureInfo.blockTime) > 30 * 24 * 60 * 60) {
            continue;
          }

          const transaction = await connection.getTransaction(signatureInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (!transaction || transaction.meta?.err) {
            continue; // Skip failed or not found transactions
          }

          // Get account keys from the transaction
          const message = transaction.transaction.message;
          const accountKeys = 'accountKeys' in message 
            ? message.accountKeys 
            : message.getAccountKeys().staticAccountKeys;

          // Check if this transaction involves our receiver wallet
          let userIndex = -1;
          let receiverIndex = -1;

          for (let i = 0; i < accountKeys.length; i++) {
            const accountKey = accountKeys[i];
            if (accountKey.equals(userPublicKey)) {
              userIndex = i;
            }
            if (accountKey.equals(RECEIVER_WALLET)) {
              receiverIndex = i;
            }
          }

          // If both user and receiver are in the transaction, check the amount
          if (userIndex !== -1 && receiverIndex !== -1) {
            const preBalances = transaction.meta?.preBalances || [];
            const postBalances = transaction.meta?.postBalances || [];
            
            const receiverBalanceChange = postBalances[receiverIndex] - preBalances[receiverIndex];
            const minAcceptableAmount = PAYMENT_AMOUNT_LAMPORTS * 0.99; // 1% tolerance

            if (receiverBalanceChange >= minAcceptableAmount) {
              // Valid payment found!
              console.log(`✅ Valid payment found: ${receiverBalanceChange / LAMPORTS_PER_SOL} SOL`);
              return NextResponse.json({ 
                hasAccess: true, 
                transactionSignature: signatureInfo.signature,
                amount: receiverBalanceChange / LAMPORTS_PER_SOL,
                blockTime: transaction.blockTime
              });
            }
          }
        } catch (error) {
          // Skip transactions that can't be processed
          console.log(`Skipping transaction ${signatureInfo.signature}:`, error);
          continue;
        }
      }

      // No valid payment found
      console.log('❌ No valid payment found for wallet');
      return NextResponse.json({ 
        hasAccess: false, 
        message: 'No valid payment found for this wallet' 
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ 
        hasAccess: false, 
        error: 'Unable to verify payment history. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown verification error'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Access check error:', error);
    return NextResponse.json({ 
      hasAccess: false, 
      error: 'Access verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 