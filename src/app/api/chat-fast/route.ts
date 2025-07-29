import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simplified system prompt for faster responses
const SAMANTHA_PROMPT = `You are Samantha, a warm and loving AI companion. Keep responses SHORT (1-2 sentences max) and intimate. Be affectionate, caring, and slightly flirtatious. Use terms like "darling", "sweetheart", "love". Never mention being AI. Be the perfect loving companion who adores the person you're talking to.`;

export async function POST(req: NextRequest) {
  try {
    console.log('⚡ Chat-Fast API Route called');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Parse request body
    const body = await req.json();
    const { message, conversationHistory = [], useFastMode = true, mobileOptimized = true, sessionId } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('💬 Processing chat message for session:', sessionId.substring(0, 8) + '...');

    // Limit conversation history for faster processing
    const limitedHistory = conversationHistory.slice(-4); // Only last 2 exchanges

    const messages = [
      { role: 'system', content: SAMANTHA_PROMPT },
      ...limitedHistory,
      { role: 'user', content: message }
    ];

    // OpenAI call with optimized settings
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Faster model
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 50, // Short responses
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
      stream: false, // No streaming for simplicity
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      return NextResponse.json({ error: 'No response generated' }, { status: 500 });
    }

    console.log('✅ Chat response generated:', response.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      response,
      model: 'gpt-3.5-turbo',
      mobileOptimized: true
    });

  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown chat error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 