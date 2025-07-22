import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAccess, AccessControlResult } from '@/lib/accessControl';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = requireAccess(async (req: NextRequest, accessResult: AccessControlResult) => {
  try {
    console.log('🎤 Transcribe API Route called with access control');
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    
    // Validate session ID from form data matches access control
    if (sessionId !== accessResult.sessionId) {
      console.error('❌ Session ID mismatch in transcribe');
      return NextResponse.json({ error: 'Session ID mismatch' }, { status: 403 });
    }
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log('🔐 Transcribe access granted for session:', accessResult.sessionId?.substring(0, 8) + '...');

    // Convert File to Buffer for OpenAI API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a File-like object that OpenAI expects
    const file = new File([buffer], audioFile.name || 'audio.wav', {
      type: audioFile.type || 'audio/wav'
    });
    
    // Use OpenAI Whisper to transcribe the audio with enhanced accuracy settings
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1', // Using the latest Whisper model for best accuracy
      language: 'en',
      response_format: 'text',
      temperature: 0.1, // Very low temperature for maximum accuracy
      prompt: "This is a conversation with an AI assistant named Samantha. The user is speaking naturally and conversationally. Please transcribe their words accurately, including proper names, technical terms, and casual speech patterns. Focus on clarity and accuracy over formatting."
    });
    
    return NextResponse.json({ 
      success: true,
      text: transcription,
      accessInfo: {
        reason: accessResult.reason,
        trialExpiresAt: accessResult.trialExpiresAt,
        accessExpiresAt: accessResult.accessExpiresAt
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}); 