import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

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
} 