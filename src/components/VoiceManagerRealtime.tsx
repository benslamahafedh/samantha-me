'use client';

import { useState, useEffect, useRef } from 'react';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtimeClean';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { getSessionManager } from '@/lib/sessionManager';

interface VoiceManagerRealtimeProps {
  onTranscriptChange?: (transcript: string) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
  onHasStartedChange?: (hasStarted: boolean) => void;
  onIsReadyChange?: (isReady: boolean) => void;
  onSessionTimeChange?: (timeLeft: number) => void;
  onSessionEndedChange?: (sessionEnded: boolean) => void;
  onRequirePayment?: () => void;
  onManualStartListening?: (startFn: () => void) => void;
}

export default function VoiceManagerRealtime({
  onTranscriptChange,
  onSpeakingChange,
  onListeningChange,
  onError,
  onHasStartedChange,
  onIsReadyChange,
  onSessionTimeChange,
  onSessionEndedChange,
  onRequirePayment,
  onManualStartListening
}: VoiceManagerRealtimeProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  const processingRef = useRef(false);
  const sessionManagerRef = useRef(getSessionManager());
  const hasShownPaymentRef = useRef(false);

  const realtimeVoice = useOpenAIRealtime();
  const textToSpeech = useTextToSpeech();

  // Track if component has mounted on client side
  useEffect(() => {
    setIsMounted(true);
    
    // Set up session manager listeners
    const sessionManager = sessionManagerRef.current;
    
    const handleSessionEnd = () => {
      console.log('🛑 SESSION ENDED - COMPLETELY BLOCKING ACCESS');
      setSessionEnded(true);
      onSessionEndedChange?.(true);
      
      // Force stop all activities immediately
      realtimeVoice.stopListening();
      realtimeVoice.resetTranscript();
      textToSpeech.stop();
      
      // Clear all processing states
      processingRef.current = false;
      
      // Don't speak any final message - just redirect
      console.log('🔄 Redirecting to session-ended page...');
      
      // Immediate redirect to session-ended page
      setTimeout(() => {
        window.location.href = '/session-ended';
      }, 500);
    };

    sessionManager.onSessionEnd(handleSessionEnd);
    
    const handleTimeUpdate = (timeLeft: number) => {
      console.log(`⏱️ Session time remaining: ${timeLeft}s`);
      onSessionTimeChange?.(timeLeft);
    };

    sessionManager.onTimeUpdate(handleTimeUpdate);
    
    return () => {
      console.log('🧹 VoiceManagerRealtime: Cleanup called but not destroying SessionManager');
    };
  }, [onSessionEndedChange, onSessionTimeChange, realtimeVoice, textToSpeech]);

  // Notify parent of hasStarted changes
  useEffect(() => {
    onHasStartedChange?.(hasStarted);
  }, [hasStarted, onHasStartedChange]);

  // Notify parent of isReady changes
  useEffect(() => {
    onIsReadyChange?.(isReady);
  }, [isReady, onIsReadyChange]);

  // Set ready state when realtime is supported and connected
  useEffect(() => {
    if (isMounted && realtimeVoice.isSupported) {
      setIsReady(true);
    }
  }, [isMounted, realtimeVoice.isSupported]);

  // Handle transcript changes
  useEffect(() => {
    // Pass the current transcript string, not the whole object
    onTranscriptChange?.(realtimeVoice.transcript || '');
  }, [realtimeVoice.transcript, onTranscriptChange]);

  // Handle speaking changes - combine realtime and TTS speaking states
  useEffect(() => {
    const isSpeaking = realtimeVoice.isSpeaking || textToSpeech.isSpeaking;
    onSpeakingChange?.(isSpeaking);
  }, [realtimeVoice.isSpeaking, textToSpeech.isSpeaking, onSpeakingChange]);

  // Handle listening changes
  useEffect(() => {
    onListeningChange?.(realtimeVoice.isListening);
  }, [realtimeVoice.isListening, onListeningChange]);

  // Handle errors from realtime API
  useEffect(() => {
    if (realtimeVoice.error) {
      console.error('❌ Realtime API Error:', realtimeVoice.error);
      onError?.(realtimeVoice.error);
    }
  }, [realtimeVoice.error, onError]);

  // Handle errors from TTS
  useEffect(() => {
    if (textToSpeech.error) {
      onError?.(textToSpeech.error);
    }
  }, [textToSpeech.error, onError]);

  // Provide manual start function to parent
  useEffect(() => {
    const manualStart = async () => {
      console.log('🎤 Manual start requested');
      if (!realtimeVoice.isListening && realtimeVoice.isConnected) {
        await realtimeVoice.startListening();
      }
    };
    
    onManualStartListening?.(manualStart);
  }, [realtimeVoice.isListening, realtimeVoice.isConnected, onManualStartListening, realtimeVoice]);

  // Handle conversation start event
  useEffect(() => {
    const handleStartConversation = async () => {
      console.log('🎤 VoiceManagerRealtime: Received startConversation event');
      
      if (hasStarted || sessionEnded) {
        console.log('⚠️ VoiceManagerRealtime: Already started or ended, ignoring');
        return;
      }

      console.log('🌟 VoiceManagerRealtime: Starting voice conversation');
      
      // Get session manager and start the session (this starts the timer)
      const sessionManager = sessionManagerRef.current;
      
      // Check if user can start session
      if (!sessionManager.canStartSession()) {
        console.log('❌ Cannot start session - payment required');
        hasShownPaymentRef.current = true;
        onRequirePayment?.();
        return;
      }
      
      // Start session timer
      const sessionStarted = sessionManager.startSession();
      console.log('📊 Session start result:', sessionStarted);
      
      if (!sessionStarted) {
        console.log('❌ Failed to start session');
        return;
      }
      
      console.log('🟢 Session started successfully with timer!');
      
      // Mark as started
      setHasStarted(true);
      
      const remainingTime = sessionManager.getRemainingFreeTime();
      console.log('⏰ Remaining time after session start:', remainingTime);
      
      // IMMEDIATELY start OpenAI Realtime API listening
      console.log('🎤 STARTING OPENAI REALTIME LISTENING');
      try {
        await realtimeVoice.startListening();
        console.log('🎯 OpenAI Realtime listening started successfully');
      } catch (error) {
        console.error('❌ Failed to start OpenAI Realtime listening:', error);
        onError?.('Failed to start voice recognition');
        return;
      }
      
      // Start greeting after realtime is established
      console.log('👋 Starting greeting');
      setTimeout(() => {
        // if (remainingTime === 180) {
        //   textToSpeech.speak("Hello, I'm Samantha. How can I help you today?");
        // } else if (remainingTime > 0) {
        //   textToSpeech.speak("Welcome back! Let's continue our conversation.");
        // } else {
        //   textToSpeech.speak("I'm sorry, your session time has expired.");
        //   return;
        // }
      }, 500);
    };

    window.addEventListener('startConversation', handleStartConversation);
    
    return () => {
      window.removeEventListener('startConversation', handleStartConversation);
    };
  }, [hasStarted, sessionEnded, onRequirePayment, realtimeVoice]);

  // Handle TTS completion - restart listening
  useEffect(() => {
    if (!textToSpeech.isSpeaking && hasStarted && !sessionEnded && realtimeVoice.isConnected && !realtimeVoice.isListening) {
      console.log('🔄 TTS finished - restarting OpenAI Realtime listening');
      setTimeout(() => {
        realtimeVoice.startListening();
      }, 500);
    }
  }, [textToSpeech.isSpeaking, hasStarted, sessionEnded, realtimeVoice.isConnected, realtimeVoice.isListening, onError, onRequirePayment, realtimeVoice]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 VoiceManagerRealtime state:', {
      hasStarted,
      sessionEnded,
      isConnected: realtimeVoice.isConnected,
      isListening: realtimeVoice.isListening,
      isSpeaking: realtimeVoice.isSpeaking || textToSpeech.isSpeaking,
      isProcessing: realtimeVoice.isProcessing,
      error: realtimeVoice.error
    });
  }, [hasStarted, sessionEnded, realtimeVoice.isConnected, realtimeVoice.isListening, realtimeVoice.isSpeaking, realtimeVoice.isProcessing, realtimeVoice.error, textToSpeech.isSpeaking]);

  // Don't render anything - this is a headless component
  return null;
} 