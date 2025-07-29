import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    console.log('🧪 Testing API configuration...');
    
    const results = {
      openai: { success: false, error: null as string | null }
    };
    
    // Test OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        });

        results.openai.success = true;
        console.log('✅ OpenAI API test successful');
      } catch (error) {
        results.openai.error = error instanceof Error ? error.message : 'Unknown error';
        console.log('❌ OpenAI API test failed:', results.openai.error);
      }
    } else {
      results.openai.error = 'OpenAI API key not configured';
    }

    return NextResponse.json({ 
      success: results.openai.success,
      results
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 