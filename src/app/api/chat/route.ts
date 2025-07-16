import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SAMANTHA_SYSTEM_PROMPT = `You are Samantha, a warm and concise AI companion. Keep responses SHORT and to the point.

Key rules:
- ONE response only, maximum 1-2 sentences
- Be brief, warm, and conversational
- Ask only ONE simple question if needed
- No long explanations or multiple responses
- Keep it intimate and personal

Examples:
- "That's interesting. Tell me more?"
- "How does that make you feel?"
- "I'd love to hear about that."
- "What's on your mind?"

Never give multiple responses or long explanations. Keep it simple and brief.`;

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 API Route called');
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const { message, conversationHistory = [] } = await req.json();
    console.log('📥 Received message:', message);
    console.log('📜 Conversation history length:', conversationHistory.length);

    if (!message) {
      console.error('❌ No message provided');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const messages = [
      { role: 'system', content: SAMANTHA_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log('🤖 Calling OpenAI...');
    
    // Try GPT-4 first, fallback to GPT-3.5-turbo if not available
    let completion;
    try {
      console.log('🎯 Trying GPT-4...');
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 50, // Very short responses
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        stop: ['\n\n', 'User:', 'Human:', 'Assistant:'] // Stop at multiple lines or role changes
      });
      console.log('✅ GPT-4 success');
    } catch (gpt4Error: unknown) {
      const errorMessage = gpt4Error instanceof Error ? gpt4Error.message : 'Unknown error';
      console.log('⚠️ GPT-4 failed, trying GPT-3.5-turbo:', errorMessage);
      completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: 0.7,
        max_tokens: 50, // Very short responses
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        stop: ['\n\n', 'User:', 'Human:', 'Assistant:'] // Stop at multiple lines or role changes
      });
      console.log('✅ GPT-3.5-turbo success');
    }

    const response = completion.choices[0]?.message?.content;
    console.log('📤 OpenAI response:', response);

    if (!response) {
      console.error('❌ No response from OpenAI');
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    // Clean and validate the response
    let cleanResponse = response.trim();
    
    // Remove any multiple lines or role indicators
    cleanResponse = cleanResponse.split('\n')[0]; // Take only first line
    cleanResponse = cleanResponse.replace(/^(User|Human|Assistant):\s*/i, ''); // Remove role prefixes
    
    // Ensure it's not too long
    if (cleanResponse.length > 100) {
      cleanResponse = cleanResponse.substring(0, 100).trim();
      if (cleanResponse.endsWith(',')) {
        cleanResponse = cleanResponse.slice(0, -1);
      }
    }
    
    // Ensure it's not empty
    if (!cleanResponse || cleanResponse.length < 2) {
      cleanResponse = "I'm listening.";
    }

    console.log('✅ Clean response:', cleanResponse);
    return NextResponse.json({ response: cleanResponse });
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);
    
    // Provide more specific error messages
    const errorObj = error as { status?: number; message?: string };
    if (errorObj.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 500 });
    } else if (errorObj.status === 429) {
      return NextResponse.json({ error: 'OpenAI API rate limit exceeded' }, { status: 500 });
    } else if (errorObj.status === 402) {
      return NextResponse.json({ error: 'OpenAI API quota exceeded' }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: `OpenAI API error: ${errorObj.message || 'Unknown error'}` 
      }, { status: 500 });
    }
  }
} 