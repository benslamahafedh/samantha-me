import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    console.log('🧪 Testing OpenAI API configuration...');
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Simple test call
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content || 'No response';

    return NextResponse.json({ 
      success: true, 
      response,
      apiKeyExists: !!process.env.OPENAI_API_KEY,
      apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...'
    });

  } catch (error: unknown) {
    console.error('🚨 API Test Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      type: errorType
    }, { status: 500 });
  }
} 