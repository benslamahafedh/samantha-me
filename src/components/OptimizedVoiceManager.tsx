'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimizedVoiceProcessing } from '@/hooks/useOptimizedVoiceProcessing';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';

interface OptimizedVoiceManagerProps {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onHasStartedChange?: (hasStarted: boolean) => void;
  onIsReadyChange?: (isReady: boolean) => void;
  onSessionTimeChange?: (timeLeft: number) => void;
  onSessionEndedChange?: (sessionEnded: boolean) => void;
  onRequirePayment?: () => void;
  onManualStartListening?: (startFn: () => void) => void;
  onAccessStatusChange?: (hasAccess: boolean, isTrialActive: boolean) => void;
  sessionId?: string;
  onVoiceError?: (error: string | null) => void;
  onMuteChange?: (isMuted: boolean) => void;
}

export default function OptimizedVoiceManager({
  onSpeakingChange,
  onListeningChange,
  onHasStartedChange,
  onIsReadyChange,
  onSessionTimeChange,
  onSessionEndedChange,
  onRequirePayment,
  onManualStartListening,
  onAccessStatusChange,
  sessionId: propSessionId,
  onVoiceError,
  onMuteChange
}: OptimizedVoiceManagerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  const optimizedVoice = useOptimizedVoiceProcessing(sessionId);
  const microphonePermission = useMicrophonePermission();

  // Refs for callback stability
  const onAccessStatusChangeRef = useRef(onAccessStatusChange);
  const onVoiceErrorRef = useRef(onVoiceError);
  const onHasStartedChangeRef = useRef(onHasStartedChange);
  const onIsReadyChangeRef = useRef(onIsReadyChange);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const onListeningChangeRef = useRef(onListeningChange);
  const onSessionTimeChangeRef = useRef(onSessionTimeChange);
  const onSessionEndedChangeRef = useRef(onSessionEndedChange);
  const onRequirePaymentRef = useRef(onRequirePayment);
  const onManualStartListeningRef = useRef(onManualStartListening);
  const onMuteChangeRef = useRef(onMuteChange);

  // Update refs when props change
  useEffect(() => {
    onAccessStatusChangeRef.current = onAccessStatusChange;
    onVoiceErrorRef.current = onVoiceError;
    onHasStartedChangeRef.current = onHasStartedChange;
    onIsReadyChangeRef.current = onIsReadyChange;
    onSpeakingChangeRef.current = onSpeakingChange;
    onListeningChangeRef.current = onListeningChange;
    onSessionTimeChangeRef.current = onSessionTimeChange;
    onSessionEndedChangeRef.current = onSessionEndedChange;
    onRequirePaymentRef.current = onRequirePayment;
    onManualStartListeningRef.current = onManualStartListening;
    onMuteChangeRef.current = onMuteChange;
  }, [
    onAccessStatusChange,
    onVoiceError,
    onHasStartedChange,
    onIsReadyChange,
    onSpeakingChange,
    onListeningChange,
    onSessionTimeChange,
    onSessionEndedChange,
    onRequirePayment,
    onManualStartListening,
    onMuteChange
  ]);

  // Monitor voice errors
  useEffect(() => {
    if (optimizedVoice.error) {
      onVoiceErrorRef.current?.(optimizedVoice.error);
    }
  }, [optimizedVoice.error]);

  // Monitor microphone permission errors
  useEffect(() => {
    if (microphonePermission.error) {
      onVoiceErrorRef.current?.(microphonePermission.error);
    }
  }, [microphonePermission.error]);

  // Update sessionId when prop changes
  useEffect(() => {
    if (propSessionId && propSessionId !== sessionId) {
      setSessionId(propSessionId);
    }
  }, [propSessionId, sessionId]);

  // Monitor mute state
  useEffect(() => {
    onMuteChangeRef.current?.(optimizedVoice.isMuted);
  }, [optimizedVoice.isMuted]);

  // Monitor voice processing states
  useEffect(() => {
    onSpeakingChangeRef.current?.(optimizedVoice.isSpeaking);
  }, [optimizedVoice.isSpeaking]);

  useEffect(() => {
    onListeningChangeRef.current?.(optimizedVoice.isListening);
  }, [optimizedVoice.isListening]);

  // Handle conversation start
  const handleStartConversation = useCallback(async () => {
    if (hasStarted || sessionEnded) return;

    try {
      console.log('🎯 Starting conversation...');
      setHasStarted(true);
      onHasStartedChangeRef.current?.(true);
      
      // Start listening
      await optimizedVoice.startListening();
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setHasStarted(false);
      onHasStartedChangeRef.current?.(false);
    }
  }, [hasStarted, sessionEnded, optimizedVoice]);

  // Listen for start conversation events
  useEffect(() => {
    const handleStartEvent = () => {
      handleStartConversation();
    };

    window.addEventListener('startConversation', handleStartEvent);
    
    return () => {
      window.removeEventListener('startConversation', handleStartEvent);
    };
  }, [handleStartConversation]);

  // Set ready state when everything is initialized
  useEffect(() => {
    if (sessionId && !isReady) {
      setIsReady(true);
      onIsReadyChangeRef.current?.(true);
    }
  }, [sessionId, isReady]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-start conversation when ready
  useEffect(() => {
    if (isReady && !hasStarted && !sessionEnded && isMounted) {
      console.log('🎯 Auto-starting conversation...');
      setTimeout(() => {
        handleStartConversation();
      }, 1000);
    }
  }, [isReady, hasStarted, sessionEnded, isMounted, handleStartConversation]);

  // Monitor session ended state
  useEffect(() => {
    onSessionEndedChangeRef.current?.(sessionEnded);
  }, [sessionEnded]);

  // Monitor has started state
  useEffect(() => {
    onHasStartedChangeRef.current?.(hasStarted);
  }, [hasStarted]);

  // Provide manual start function
  useEffect(() => {
    onManualStartListeningRef.current?.(() => {
      optimizedVoice.startListening();
    });
  }, [optimizedVoice]);

  return null; // This component doesn't render anything
} 