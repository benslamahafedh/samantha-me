import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { InputValidator } from '@/lib/inputValidation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { text } = body;

    // SECURITY FIX: Input validation
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const textValidation = InputValidator.validateChatMessage(text);
    if (!textValidation.isValid) {
      return NextResponse.json({ error: textValidation.error }, { status: 400 });
    }

    // Use OpenAI TTS with slower, more natural settings
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Fastest TTS model
      voice: 'nova', // Most natural and expressive voice
      input: text,
      speed: 0.9, // Slower speed for more natural pacing
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
} 