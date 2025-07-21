import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

export async function POST(req: NextRequest) {
  try {
    const { address, expectedAmount } = await req.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      
      const expectedLamports = expectedAmount ? parseFloat(expectedAmount) * 1e9 : 0;
      
      console.log(`🔍 Manual payment verification:`);
      console.log(`   Address: ${address}`);
      console.log(`   Expected: ${expectedLamports} lamports (${expectedAmount || 'unknown'} SOL)`);
      console.log(`   Current: ${balance} lamports (${balance / 1e9} SOL)`);
      console.log(`   Network: ${connection.rpcEndpoint}`);
      console.log(`   Sufficient: ${balance >= expectedLamports ? 'YES' : 'NO'}`);

      return NextResponse.json({ 
        success: true,
        address,
        expectedAmount: expectedAmount || 'unknown',
        expectedLamports,
        currentBalance: balance / 1e9, // Convert to SOL
        currentLamports: balance,
        isSufficient: balance >= expectedLamports,
        network: connection.rpcEndpoint
      });

    } catch (error) {
      console.error('Error checking balance:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid address or network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 