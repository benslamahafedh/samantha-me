import { NextRequest, NextResponse } from 'next/server';
import { autoTransferManager } from '@/lib/autoTransferManager';

export async function POST(req: NextRequest) {
  try {
    const { action, sessionId } = await req.json();

    switch (action) {
      case 'transfer_all':
        // Transfer from all eligible wallets
        console.log('🔄 Manual bulk auto-transfer initiated...');
        const bulkResult = await autoTransferManager.transferFromAllWallets();
        
        return NextResponse.json({
          success: true,
          action: 'transfer_all',
          result: bulkResult,
          message: `Bulk transfer completed: ${bulkResult.transferredCount} successful, ${bulkResult.failedCount} failed, ${bulkResult.totalTransferred.toFixed(6)} SOL total`
        });

      case 'transfer_single':
        // Transfer from a specific user wallet
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required for single transfer'
          }, { status: 400 });
        }

        console.log(`🔄 Manual single auto-transfer initiated for session: ${sessionId}`);
        const singleResult = await autoTransferManager.transferFromUserWallet(sessionId);
        
        return NextResponse.json({
          success: true,
          action: 'transfer_single',
          sessionId,
          result: singleResult,
          message: singleResult.success 
            ? `Transfer successful: ${singleResult.amount?.toFixed(6)} SOL transferred`
            : `Transfer failed: ${singleResult.error}`
        });

      case 'get_stats':
        // Get auto-transfer statistics
        const stats = await autoTransferManager.getTransferStats();
        
        return NextResponse.json({
          success: true,
          action: 'get_stats',
          stats
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: transfer_all, transfer_single, or get_stats'
        }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('Auto-transfer API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown auto-transfer error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get auto-transfer statistics
    const stats = await autoTransferManager.getTransferStats();
    
    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: unknown) {
    console.error('Auto-transfer stats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown stats error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 