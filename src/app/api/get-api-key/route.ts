import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    // Return the API key (this is safe for WebSocket connections)
    return NextResponse.json({ 
      success: true,
      apiKey: process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 