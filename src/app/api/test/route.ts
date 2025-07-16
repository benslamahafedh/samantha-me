import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Connection } from '@solana/web3.js';

export async function GET() {
  try {
    console.log('🧪 Testing API configuration...');
    
    const results = {
      openai: { success: false, error: null as string | null },
      solana: { success: false, error: null as string | null }
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

    // Test Solana connection
    try {
      const endpoints = [
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana'
      ];

      let connected = false;
      for (const endpoint of endpoints) {
        try {
          console.log(`🔗 Testing Solana endpoint: ${endpoint}`);
          const connection = new Connection(endpoint, 'confirmed');
          await connection.getSlot();
          results.solana.success = true;
          console.log(`✅ Solana connection successful via ${endpoint}`);
          connected = true;
          break;
        } catch (error) {
          console.log(`❌ Failed to connect to ${endpoint}:`, error);
          continue;
        }
      }

      if (!connected) {
        results.solana.error = 'No working Solana RPC endpoint found';
      }
    } catch (error) {
      results.solana.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({ 
      success: results.openai.success && results.solana.success,
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