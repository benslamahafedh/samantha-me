import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const sessionManager = SessionManager.getInstance();

    // Get payment address for this session
    const paymentInfo = await sessionManager.getPaymentAddress(sessionId);

    if (!paymentInfo) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log(`💰 Creating payment for session ${sessionId}:`);
    console.log(`   Wallet Address: ${paymentInfo.walletAddress}`);
    console.log(`   Reference ID: ${paymentInfo.referenceId}`);
    console.log(`   Amount: ${paymentInfo.amount} SOL`);
    console.log(`   Expires: ${paymentInfo.expiresAt}`);

    return NextResponse.json({
      success: true,
      paymentAddress: paymentInfo.walletAddress,
      referenceId: paymentInfo.referenceId,
      amount: paymentInfo.amount,
      currency: 'SOL',
      expiresAt: paymentInfo.expiresAt.getTime(),
      sessionId,
      message: `Send exactly ${paymentInfo.amount} SOL to the address above. Include reference ID: ${paymentInfo.referenceId} in memo/note if possible.`
    });

  } catch (error: unknown) {
    console.error('Payment creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 