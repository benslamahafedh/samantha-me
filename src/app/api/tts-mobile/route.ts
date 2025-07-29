import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      console.error('❌ Invalid text input:', text);
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('🎤 TTS request for text:', text.substring(0, 50) + '...');

    // Mobile optimization: Limit text length for faster processing
    const limitedText = text.length > 100 ? text.substring(0, 100) + '...' : text;

    // iOS-optimized TTS settings
    const response = await openai.audio.speech.create({
      model: 'tts-1', // Fastest model
      voice: 'alloy', // Good balance of speed and quality
      input: limitedText,
      speed: 1.0, // Normal speed for clarity
      response_format: 'mp3', // iOS-compatible format
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log('✅ TTS audio generated, size:', audioBuffer.length, 'bytes');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: unknown) {
    console.error('❌ Mobile TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown TTS error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 