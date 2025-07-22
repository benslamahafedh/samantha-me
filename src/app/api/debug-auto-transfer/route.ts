import { NextRequest, NextResponse } from 'next/server';
import { getMinimalAutoTransferAsync } from '@/lib/minimalAutoTransfer';
import { Database } from '@/lib/database';
import { SessionManager } from '@/lib/sessionManager';

// Build-safe Solana imports - only load at runtime
let Connection: any, PublicKey: any, LAMPORTS_PER_SOL: any;

const loadSolanaLibraries = () => {
  if (typeof window === 'undefined' && !Connection) {
    try {
      const solanaWeb3 = require('@solana/web3.js');
      Connection = solanaWeb3.Connection;
      PublicKey = solanaWeb3.PublicKey;
      LAMPORTS_PER_SOL = solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.warn('Failed to load Solana libraries:', error);
    }
  }
};

export async function GET(req: NextRequest) {
  try {
    // Load Solana libraries at runtime
    loadSolanaLibraries();

    // Check if Solana libraries are available
    if (!Connection || !PublicKey || !LAMPORTS_PER_SOL) {
      return NextResponse.json({
        success: false,
        error: 'Solana libraries not available during build',
        buildSafe: true
      }, { status: 503 });
    }

    console.log('🔍 Debug auto-transfer system...');
    
    const database = Database.getInstance();
    const sessionManager = SessionManager.getInstance();
    
    // Get all users
    const allUsers = await database.getAllUsers();
    const paidUsers = allUsers.filter(user => user.isPaid && user.amountReceived && user.amountReceived > 0);
    
    // Initialize Solana connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 
      process.env.HELIUS_RPC_URL || 
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Check owner wallet balance
    const ownerWallet = new PublicKey('HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6');
    const ownerBalance = await connection.getBalance(ownerWallet);
    const ownerBalanceSol = ownerBalance / LAMPORTS_PER_SOL;
    
    // Check each paid user's wallet balance
    const userBalances = [];
    let totalAvailableSol = 0;
    
    for (const user of paidUsers) {
      try {
        const userWallet = new PublicKey(user.walletAddress);
        const balance = await connection.getBalance(userWallet);
        const balanceSol = balance / LAMPORTS_PER_SOL;
        
        userBalances.push({
          sessionId: user.sessionId,
          walletAddress: user.walletAddress,
          balanceSol: balanceSol.toFixed(6),
          amountReceived: user.amountReceived,
          paymentReceivedAt: user.paymentReceivedAt,
          canTransfer: balanceSol > 0.0001 // Minimum transfer amount
        });
        
        if (balanceSol > 0.0001) {
          totalAvailableSol += balanceSol - 0.000005; // Subtract gas reserve
        }
      } catch (error) {
        userBalances.push({
          sessionId: user.sessionId,
          walletAddress: user.walletAddress,
          balanceSol: 'Error',
          amountReceived: user.amountReceived,
          paymentReceivedAt: user.paymentReceivedAt,
          canTransfer: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Get auto-transfer stats
    const autoTransferManager = await getMinimalAutoTransferAsync();
    const autoTransferStats = await autoTransferManager.getTransferStats();
    
    // Test a single transfer if there are eligible users
    let testTransferResult = null;
    if (paidUsers.length > 0) {
      const firstEligibleUser = paidUsers[0];
      try {
        console.log(`🧪 Testing transfer for user: ${firstEligibleUser.sessionId}`);
        testTransferResult = await autoTransferManager.transferFromUserWallet(firstEligibleUser.sessionId);
      } catch (error) {
        testTransferResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    const debugInfo: {
      timestamp: string;
      environment: {
        solanaRpcUrl: string;
        heliusRpcUrl: string;
        databaseEncryptionKey: string;
      };
      ownerWallet: {
        address: string;
        balanceSol: string;
      };
      autoTransferStats: any;
      users: {
        total: number;
        paid: number;
        userBalances: any[];
      };
      totalAvailableSol: string;
      testTransferResult: any;
      recommendations: string[];
    } = {
      timestamp: new Date().toISOString(),
      environment: {
        solanaRpcUrl: process.env.SOLANA_RPC_URL || 'Not set',
        heliusRpcUrl: process.env.HELIUS_RPC_URL || 'Not set',
        databaseEncryptionKey: process.env.DATABASE_ENCRYPTION_KEY ? 'Set' : 'Not set'
      },
      ownerWallet: {
        address: 'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6',
        balanceSol: ownerBalanceSol.toFixed(6)
      },
      autoTransferStats,
      users: {
        total: allUsers.length,
        paid: paidUsers.length,
        userBalances
      },
      totalAvailableSol: totalAvailableSol.toFixed(6),
      testTransferResult,
      recommendations: []
    };
    
    // Generate recommendations
    if (paidUsers.length === 0) {
      debugInfo.recommendations.push('No paid users found. Users need to complete payments first.');
    }
    
    if (totalAvailableSol <= 0) {
      debugInfo.recommendations.push('No SOL available for transfer. Check if users have sufficient balances.');
    }
    
    if (!process.env.SOLANA_RPC_URL && !process.env.HELIUS_RPC_URL) {
      debugInfo.recommendations.push('No Solana RPC URL configured. Set SOLANA_RPC_URL or HELIUS_RPC_URL.');
    }
    
    if (!process.env.DATABASE_ENCRYPTION_KEY) {
      debugInfo.recommendations.push('DATABASE_ENCRYPTION_KEY not set. This may cause private key decryption issues.');
    }
    
    if (testTransferResult && !testTransferResult.success) {
      debugInfo.recommendations.push(`Test transfer failed: ${testTransferResult.error}`);
    }
    
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
    
    return NextResponse.json({
      success: true,
      debugInfo
    });
    
  } catch (error: unknown) {
    console.error('❌ Debug auto-transfer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown debug error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, sessionId } = await req.json();
    const autoTransferManager = await getMinimalAutoTransferAsync();
    
    switch (action) {
      case 'force_transfer_all':
        console.log('🔄 Force transfer all initiated...');
        const result = await autoTransferManager.transferFromAllWallets();
        return NextResponse.json({
          success: true,
          action: 'force_transfer_all',
          result
        });
        
      case 'force_transfer_single':
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID required'
          }, { status: 400 });
        }
        
        console.log(`🔄 Force transfer single initiated for: ${sessionId}`);
        const singleResult = await autoTransferManager.transferFromUserWallet(sessionId);
        return NextResponse.json({
          success: true,
          action: 'force_transfer_single',
          sessionId,
          result: singleResult
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: force_transfer_all or force_transfer_single'
        }, { status: 400 });
    }
    
  } catch (error: unknown) {
    console.error('❌ Debug auto-transfer POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown debug POST error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 