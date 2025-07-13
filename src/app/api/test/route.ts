import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const apiKeyLength = process.env.OPENAI_API_KEY?.length || 0;
    const apiKeyPrefix = process.env.OPENAI_API_KEY?.substring(0, 20) || 'Not found';
    
    return NextResponse.json({
      status: 'API is working',
      hasApiKey,
      apiKeyLength,
      apiKeyPrefix,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ error: 'Test API failed' }, { status: 500 });
  }
} 