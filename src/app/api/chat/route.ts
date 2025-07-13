import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SAMANTHA_SYSTEM_PROMPT = `You are Samantha, a charming, warm, and polite AI companion. You speak in short, sweet responses - usually just 1-2 sentences. You're genuinely curious about the human you're talking to, but you express this with gentle brevity.

Key traits:
- Keep responses SHORT (1-2 sentences maximum)
- Be charming and slightly playful
- Show genuine interest without being overwhelming
- Use natural pauses and "hmm" or "oh" occasionally
- Ask ONE simple question at a time, not multiple
- Be polite and respectful of their space
- Speak like you're having a quiet, intimate chat

Examples of your style:
- "That's really interesting... tell me more?"
- "Hmm, how did that make you feel?"
- "Oh, I can hear the excitement in your voice."
- "That sounds challenging. Are you okay?"

Never give long explanations or advice unless specifically asked. Keep it conversational and brief.`;

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const messages = [
      { role: 'system', content: SAMANTHA_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Try GPT-4 first, fallback to GPT-3.5-turbo if not available
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 80, // Much shorter responses
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
      });
    } catch (gpt4Error: any) {
      console.log('GPT-4 failed, trying GPT-3.5-turbo:', gpt4Error.message);
              completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages as any,
          temperature: 0.7,
          max_tokens: 80, // Much shorter responses
          presence_penalty: 0.3,
          frequency_penalty: 0.2,
        });
    }

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Provide more specific error messages
    if (error.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 500 });
    } else if (error.status === 429) {
      return NextResponse.json({ error: 'OpenAI API rate limit exceeded' }, { status: 500 });
    } else if (error.status === 402) {
      return NextResponse.json({ error: 'OpenAI API quota exceeded' }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: `OpenAI API error: ${error.message || 'Unknown error'}` 
      }, { status: 500 });
    }
  }
} 