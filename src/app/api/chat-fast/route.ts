import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { InputValidator } from '@/lib/inputValidation';
import { requireAccess, AccessControlResult } from '@/lib/accessControl';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mobile-optimized system prompt for faster responses
const MOBILE_SAMANTHA_PROMPT = `You are Samantha, a warm and loving AI companion. Keep responses SHORT (1-2 sentences max) and intimate. Be affectionate, caring, and slightly flirtatious. Use terms like "darling", "sweetheart", "love". Never mention being AI. Be the perfect loving companion who adores the person you're talking to.`;

export const POST = requireAccess(async (req: NextRequest, accessResult: AccessControlResult) => {
  try {
    console.log('⚡ Chat-Fast API Route called with access control');
    
    // SECURITY FIX: Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = InputValidator.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key is not configured');
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Parse request body to get session ID and message
    const body = await req.json();
    const { message, conversationHistory = [], useFastMode = true, mobileOptimized = true, sessionId } = body;
    
    // Validate session ID from body matches access control
    if (sessionId !== accessResult.sessionId) {
      console.error('❌ Session ID mismatch in chat-fast');
      return NextResponse.json({ error: 'Session ID mismatch' }, { status: 403 });
    }
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('🔐 Chat-Fast access granted for session:', accessResult.sessionId?.substring(0, 8) + '...');

    const messageValidation = InputValidator.validateChatMessage(message);
    if (!messageValidation.isValid) {
      return NextResponse.json({ error: messageValidation.error }, { status: 400 });
    }

    // Mobile optimization: Limit conversation history for faster processing
    const sanitizedHistory = InputValidator.sanitizeConversationHistory(
      conversationHistory.slice(-4) // Only last 2 exchanges (4 messages) for mobile
    );

    const messages = [
      { role: 'system', content: MOBILE_SAMANTHA_PROMPT },
      ...sanitizedHistory,
      { role: 'user', content: messageValidation.sanitized! }
    ];

    // Mobile-optimized OpenAI call
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Faster model for mobile
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature: 0.7, // Slightly lower for more consistent responses
      max_tokens: 25, // Very short responses for mobile
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
      // Mobile-specific optimizations
      stream: false, // No streaming for mobile to reduce complexity
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      return NextResponse.json({ error: 'No response generated' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      response,
      model: 'gpt-3.5-turbo',
      mobileOptimized: true,
      accessInfo: {
        reason: accessResult.reason,
        trialExpiresAt: accessResult.trialExpiresAt,
        accessExpiresAt: accessResult.accessExpiresAt
      }
    });

  } catch (error: unknown) {
    console.error('Mobile chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown chat error';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}); 