import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function GET(req: NextRequest) {
  try {
    const sessionManager = SessionManager.getInstance();
    
    // Get admin statistics
    const stats = await sessionManager.getAdminStats();
    
    // Get all users
    const allUsers = await sessionManager.getAllUsers();
    
    // Calculate totals
    const totalRevenue = allUsers
      .filter((u: any) => u.isPaid && u.amountReceived)
      .reduce((sum: number, u: any) => sum + (u.amountReceived || 0), 0);

    const paidUsers = allUsers.filter((u: any) => u.isPaid).length;
    const trialUsers = allUsers.filter((u: any) => !u.isPaid).length;

    // Get recent transactions (simplified for now)
    const recentTransactions = allUsers
      .filter((u: any) => u.isPaid && u.paymentReceivedAt)
      .map((u: any) => ({
        signature: u.txId || 'manual',
        blockTime: u.paymentReceivedAt?.getTime() || 0,
        amount: u.amountReceived || 0,
        walletAddress: u.walletAddress || 'unknown'
      }))
      .sort((a, b) => b.blockTime - a.blockTime)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: stats.totalUsers,
        trialUsers: stats.trialUsers,
        paidUsers: stats.paidUsers,
        totalRevenue: stats.totalRevenue,
        totalRevenueLamports: stats.totalRevenue * 1e9
      },
      recentTransactions,
      allSessions: allUsers.map((u: any) => ({
        sessionId: u.sessionId,
        walletAddress: u.walletAddress,
        referenceId: u.referenceId,
        status: u.isPaid ? 'completed' : (new Date() < u.trialExpiresAt ? 'pending' : 'expired'),
        amount: u.amountReceived || 0.0009,
        createdAt: u.createdAt,
        expiresAt: u.isPaid ? u.accessExpiresAt : u.trialExpiresAt,
        accessType: u.isPaid ? '1hour' : 'trial'
      }))
    });

  } catch (error: unknown) {
    console.error('Admin payments error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 