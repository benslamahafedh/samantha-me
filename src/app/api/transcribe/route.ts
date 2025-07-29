import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    console.log('🎤 Transcribe API Route called');
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('🎤 Transcribing audio for session:', sessionId.substring(0, 8) + '...');

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a File-like object that OpenAI expects
    const file = new File([buffer], audioFile.name || 'audio.wav', {
      type: audioFile.type || 'audio/wav'
    });
    
    // Use OpenAI Whisper to transcribe the audio
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
      temperature: 0.1, // Low temperature for accuracy
      prompt: "This is a conversation with an AI assistant named Samantha. The user is speaking naturally and conversationally. Please transcribe their words accurately."
    });
    
    console.log('✅ Transcription completed:', transcription.substring(0, 50) + '...');
    
    return NextResponse.json({ 
      success: true,
      text: transcription
    });

  } catch (error: unknown) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
} 