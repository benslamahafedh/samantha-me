import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚀 Server initialization check');
    
    // Simple health check
    return NextResponse.json({
      success: true,
      message: 'Server is ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Server init error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server initialization failed'
    }, { status: 500 });
  }
} 