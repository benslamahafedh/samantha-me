import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAccess, AccessControlResult } from '@/lib/accessControl';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = requireAccess(async (req: NextRequest, accessResult: AccessControlResult) => {
  try {
    console.log('🔊 TTS API Route called with access control');
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Parse request body to get session ID and text
    const body = await req.json();
    const { text, sessionId } = body;
    
    // Validate session ID from body matches access control
    if (sessionId !== accessResult.sessionId) {
      console.error('❌ Session ID mismatch in TTS');
      return NextResponse.json({ error: 'Session ID mismatch' }, { status: 403 });
    }
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('🔐 TTS access granted for session:', accessResult.sessionId?.substring(0, 8) + '...');

    // Use OpenAI TTS with faster model for speed while maintaining quality
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Faster TTS model (still high quality)
      voice: 'nova', // Most natural and expressive voice - perfect for waifu personality
      input: text,
      speed: 1.1, // Slightly faster for quicker responses
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Return the audio as a response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'X-Session-ID': accessResult.sessionId || '',
        'X-Access-Reason': accessResult.reason
      },
    });

  } catch (error: unknown) {
    console.error('TTS API error:', error);
    
    const errorObj = error as { status?: number; message?: string };
    if (errorObj.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 500 });
    } else if (errorObj.status === 429) {
      return NextResponse.json({ error: 'OpenAI API rate limit exceeded' }, { status: 500 });
    } else if (errorObj.status === 402) {
      return NextResponse.json({ error: 'OpenAI API quota exceeded' }, { status: 500 });
    } else {
      return NextResponse.json({ 
        error: `OpenAI TTS API error: ${errorObj.message || 'Unknown error'}` 
      }, { status: 500 });
    }
  }
}); 