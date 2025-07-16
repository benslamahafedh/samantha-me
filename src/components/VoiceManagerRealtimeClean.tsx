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
      setSessionEnded(true);
      onSessionEndedChange?.(true);
      
      // Force stop all activities immediately
      realtimeVoice.stopListening();
      realtimeVoice.resetTranscript();
      textToSpeech.stop();
      
      // Immediate redirect to session-ended page
      setTimeout(() => {
        window.location.href = '/session-ended';
      }, 500);
    };

    sessionManager.onSessionEnd(handleSessionEnd);
    
    const handleTimeUpdate = (timeLeft: number) => {
      onSessionTimeChange?.(timeLeft);
    };

    sessionManager.onTimeUpdate(handleTimeUpdate);
    
    return () => {
      // Don't destroy the SessionManager - it's a singleton
    };
  }, []);

  // Notify parent of hasStarted changes
  useEffect(() => {
    onHasStartedChange?.(hasStarted);
  }, [hasStarted]);

  // Notify parent of isReady changes
  useEffect(() => {
    onIsReadyChange?.(isReady);
  }, [isReady]);

  // Set ready state when realtime is supported and connected
  useEffect(() => {
    if (isMounted && realtimeVoice.isSupported) {
      setIsReady(true);
    }
  }, [isMounted, realtimeVoice.isSupported]);

  // Handle speaking changes - combine realtime and TTS speaking states
  useEffect(() => {
    const isSpeaking = realtimeVoice.isSpeaking || textToSpeech.isSpeaking;
    onSpeakingChange?.(isSpeaking);
  }, [realtimeVoice.isSpeaking, textToSpeech.isSpeaking]);

  // Handle listening changes
  useEffect(() => {
    onListeningChange?.(realtimeVoice.isListening);
  }, [realtimeVoice.isListening]);

  // Handle transcript changes
  useEffect(() => {
    onTranscriptChange?.(realtimeVoice.transcript);
  }, [realtimeVoice.transcript]);

  // Handle error changes
  useEffect(() => {
    if (realtimeVoice.error) {
      onError?.(realtimeVoice.error);
    }
  }, [realtimeVoice.error]);

  // Provide manual start function to parent
  useEffect(() => {
    const manualStart = async () => {
      if (!realtimeVoice.isListening && realtimeVoice.isConnected) {
        await realtimeVoice.startListening();
      }
    };
    
    onManualStartListening?.(manualStart);
  }, [realtimeVoice.isListening, realtimeVoice.isConnected]);

  // Handle conversation start event
  useEffect(() => {
    const handleStartConversation = async () => {
      if (hasStarted || sessionEnded) {
        return;
      }

      // Get session manager and start the session (this starts the timer)
      const sessionManager = sessionManagerRef.current;
      
      // Check if user can start session
      if (!sessionManager.canStartSession()) {
        hasShownPaymentRef.current = true;
        onRequirePayment?.();
        return;
      }
      
      // Start session timer
      const sessionStarted = sessionManager.startSession();
      
      if (!sessionStarted) {
        return;
      }
      
      // Mark as started
      setHasStarted(true);
      
      const remainingTime = sessionManager.getRemainingFreeTime();
      
      // Start OpenAI Realtime API listening
      try {
        await realtimeVoice.startListening();
      } catch (error) {
        return;
      }
      
      // Start greeting after realtime is established
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
  }, [hasStarted, sessionEnded]);

  // Handle TTS completion - restart listening
  useEffect(() => {
    if (!textToSpeech.isSpeaking && hasStarted && !sessionEnded && realtimeVoice.isConnected && !realtimeVoice.isListening) {
      setTimeout(() => {
        realtimeVoice.startListening();
      }, 500);
    }
  }, [textToSpeech.isSpeaking, hasStarted, sessionEnded, realtimeVoice.isConnected, realtimeVoice.isListening]);

  // Don't render anything - this is a headless component
  return null;
} 