'use client';

import { useState, useEffect, useCallback } from 'react';
import { useVoiceProcessing } from '@/hooks/useVoiceProcessing';

interface VoiceManagerProps {
  sessionId: string;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onTranscriptChange?: (transcript: string) => void;
  onError?: (error: string | null) => void;
}

export default function VoiceManager({ 
  sessionId, 
  onSpeakingChange, 
  onListeningChange, 
  onProcessingChange,
  onTranscriptChange,
  onError 
}: VoiceManagerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const voiceProcessing = useVoiceProcessing(sessionId);

  // Notify parent of state changes
  useEffect(() => {
    onSpeakingChange?.(voiceProcessing.isSpeaking);
  }, [voiceProcessing.isSpeaking, onSpeakingChange]);

  useEffect(() => {
    onListeningChange?.(voiceProcessing.isListening);
  }, [voiceProcessing.isListening, onListeningChange]);

  useEffect(() => {
    onProcessingChange?.(voiceProcessing.isProcessing);
  }, [voiceProcessing.isProcessing, onProcessingChange]);

  useEffect(() => {
    onTranscriptChange?.(voiceProcessing.transcript);
  }, [voiceProcessing.transcript, onTranscriptChange]);

  useEffect(() => {
    onError?.(voiceProcessing.error);
  }, [voiceProcessing.error, onError]);

  // Set ready state when session is available
  useEffect(() => {
    if (sessionId && !isReady) {
      setIsReady(true);
    }
  }, [sessionId, isReady]);

  // Listen for start listening events
  useEffect(() => {
    const handleStartListening = async () => {
      if (!hasStarted) {
        setHasStarted(true);
      }
      
      try {
        await voiceProcessing.startListening();
      } catch (error) {
        console.error('Failed to start listening:', error);
      }
    };

    const handleStopListening = () => {
      voiceProcessing.stopListening();
    };

    const handleManualComplete = () => {
      // When user clicks "Stop Listening", stop listening and automatically process the transcript
      voiceProcessing.stopListening();
      
      // The transcript will be automatically processed by the voice processing hook
      // when the recording stops, so no additional action needed here
    };

    window.addEventListener('startListening', handleStartListening);
    window.addEventListener('stopListening', handleStopListening);
    window.addEventListener('manualComplete', handleManualComplete);

    return () => {
      window.removeEventListener('startListening', handleStartListening);
      window.removeEventListener('stopListening', handleStopListening);
      window.removeEventListener('manualComplete', handleManualComplete);
    };
  }, [hasStarted, voiceProcessing]);

  return null; // This component doesn't render anything
} 