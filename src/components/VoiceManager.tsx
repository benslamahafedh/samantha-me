'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { getSessionManager } from '@/lib/sessionManager';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VoiceManagerProps {
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

export default function VoiceManager({
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
}: VoiceManagerProps) {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  
  const processingRef = useRef(false);
  const lastProcessedTranscript = useRef('');
  const sessionManagerRef = useRef(getSessionManager());
  const hasShownPaymentRef = useRef(false);
  const waitingForTTSRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRestartTimeRef = useRef(0);

  const speechRecognition = useSpeechRecognition();
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
      speechRecognition.stopListening();
      speechRecognition.resetTranscript();
      textToSpeech.stop();
      
      // Clear all processing states
      processingRef.current = false;
      lastProcessedTranscript.current = '';
      shouldBeListeningRef.current = false;
      
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
      // Don't destroy the SessionManager - it's a singleton that should persist
      // across component re-renders. Destroying it clears the timer.
      console.log('🧹 VoiceManager: Cleanup called but not destroying SessionManager');
    };
  }, []);

  // Notify parent of hasStarted changes
  useEffect(() => {
    onHasStartedChange?.(hasStarted);
  }, [hasStarted, onHasStartedChange]);

  // Notify parent of isReady changes
  useEffect(() => {
    onIsReadyChange?.(isReady);
  }, [isReady, onIsReadyChange]);

  // Handle transcript changes
  useEffect(() => {
    onTranscriptChange?.(speechRecognition.transcript);
  }, [speechRecognition.transcript, onTranscriptChange]);

  // Handle speaking changes
  useEffect(() => {
    onSpeakingChange?.(textToSpeech.isSpeaking);
  }, [textToSpeech.isSpeaking, onSpeakingChange]);

  // Handle listening changes - SIMPLIFIED
  useEffect(() => {
    onListeningChange?.(speechRecognition.isListening);
  }, [speechRecognition.isListening, onListeningChange]);

  // DISABLED: Automatic restart doesn't work due to browser security constraints
  // Speech recognition requires direct user gesture to start
  useEffect(() => {
    if (!speechRecognition.isListening && hasStarted && !sessionEnded && !textToSpeech.isSpeaking && !processingRef.current) {
      console.log('🚫 Speech recognition stopped - automatic restart disabled (requires user gesture)');
      console.log('💡 User needs to click something to restart speech recognition');
    }
  }, [speechRecognition.isListening, hasStarted, sessionEnded, textToSpeech.isSpeaking]);

  // Handle errors
  useEffect(() => {
    if (speechRecognition.error && !speechRecognition.error.includes('temporarily unavailable')) {
      onError?.(speechRecognition.error);
    }
  }, [speechRecognition.error, onError]);

  useEffect(() => {
    if (textToSpeech.error) {
      onError?.(textToSpeech.error);
    }
  }, [textToSpeech.error, onError]);

  // Process user speech
  const processUserSpeech = useCallback(async (transcript: string) => {
    if (processingRef.current || !transcript.trim() || sessionEnded) {
      console.log('🚫 Skipping speech processing:', { 
        processing: processingRef.current, 
        empty: !transcript.trim(), 
        ended: sessionEnded 
      });
      return;
    }
    
    console.log('🎙️ Processing user speech:', transcript);
    processingRef.current = true;

    try {
      // Add user message to history
      const userMessage: Message = {
        role: 'user',
        content: transcript,
        timestamp: Date.now()
      };
      
      const updatedHistory = [...conversationHistory, userMessage];
      setConversationHistory(updatedHistory);

      console.log('📡 Calling OpenAI API...');
      
      // Call OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          conversationHistory: updatedHistory.slice(-10) // Keep last 10 messages for context
        }),
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      console.log('✅ OpenAI Response:', data.response);
      
      // Add assistant message to history
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now()
      };
      
      setConversationHistory([...updatedHistory, assistantMessage]);
      
      // Don't speak if session has ended
      if (!sessionEnded) {
        console.log('🗣️ Speaking response:', data.response);
        waitingForTTSRef.current = true;
        textToSpeech.speak(data.response);
      }
    } catch (error) {
      console.error('❌ Error processing speech:', error);
      if (!sessionEnded) {
        const errorMessage = "I'm having trouble connecting. Could you try again?";
        console.log('🗣️ Speaking error message:', errorMessage);
        waitingForTTSRef.current = true;
        textToSpeech.speak(errorMessage);
      }
    } finally {
      processingRef.current = false;
      // If we're not speaking (error case), restart listening directly
      if (!textToSpeech.isSpeaking && !sessionEnded) {
        console.log('🔄 Processing finished, restarting listening');
        speechRecognition.startListening();
      }
    }
  }, [conversationHistory, textToSpeech, sessionEnded]);

  // Handle final transcript with proper listening controls
  useEffect(() => {
    // Immediately stop processing if session has ended
    if (sessionEnded) {
      console.log('🚫 Session ended - blocking all transcript processing');
      speechRecognition.stopListening();
      speechRecognition.resetTranscript();
      return;
    }

    const finalTranscript = speechRecognition.transcript.trim();
    
    console.log('👂 Transcript update:', {
      current: finalTranscript,
      last: lastProcessedTranscript.current,
      sessionEnded,
      hasStarted,
      isListening: speechRecognition.isListening,
      interimTranscript: speechRecognition.interimTranscript?.trim(),
      isProcessing: processingRef.current
    });
    
    // Skip if we're already processing
    if (processingRef.current) {
      console.log('⏭️ Skipping - already processing');
      return;
    }
    
    // Skip if transcript is empty or too short
    if (!finalTranscript || finalTranscript.length < 3) {
      return;
    }
    
    // Skip if this is the same transcript we just processed
    if (finalTranscript === lastProcessedTranscript.current) {
      return;
    }
    
    // Skip or clean Samantha's own greetings
    if (finalTranscript.toLowerCase().includes("welcome back") || 
        finalTranscript.toLowerCase().includes("hello, i'm samantha")) {
      console.log('🚫 Clearing Samantha\'s own voice from transcript');
      speechRecognition.resetTranscript();
      lastProcessedTranscript.current = '';
      return;
    }
    
    // Process user speech (automatic logic)
    if (finalTranscript && 
        finalTranscript.length > 3 && 
        !sessionEnded && 
        hasStarted) {
      
      console.log('🎯 Auto-processing user speech:', finalTranscript);
      
      // Stop listening during processing
      speechRecognition.stopListening();
      
      lastProcessedTranscript.current = finalTranscript;
      processUserSpeech(finalTranscript);
      speechRecognition.resetTranscript();
    }
  }, [
    speechRecognition.transcript, 
    processUserSpeech, 
    sessionEnded, 
    hasStarted
  ]);

  // SIMPLIFIED Manual start from orbit click
  useEffect(() => {
    const handleStartConversation = () => {
      console.log('🎤 VoiceManager: Received startConversation event');
      
      if (hasStarted || sessionEnded) {
        console.log('⚠️ VoiceManager: Already started or ended, ignoring');
        return;
      }

      console.log('🌟 VoiceManager: Starting voice conversation');
      
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
      
      // IMMEDIATELY start speech recognition with user gesture
      console.log('🎤 STARTING SPEECH RECOGNITION WITH USER GESTURE');
      setTimeout(() => {
        if (speechRecognition.isSupported && !speechRecognition.isListening) {
          speechRecognition.startListening();
        }
      }, 100);
      
      // Start greeting after speech recognition is established
      console.log('👋 Starting greeting');
      setTimeout(() => {
        waitingForTTSRef.current = true;
        
        // if (remainingTime === 180) {
        //   textToSpeech.speak("Hello, I'm Samantha. How can I help you today?");
        // } else if (remainingTime > 0) {
        //   textToSpeech.speak("Welcome back! Let's continue our conversation.");
        // } else {
        //   textToSpeech.speak("I'm sorry, your session time has expired.");
        //   return;
        // }
      }, 500);
      
      console.log('🎯 Speech recognition started with user gesture');
    };

    window.addEventListener('startConversation', handleStartConversation);
    
    return () => {
      window.removeEventListener('startConversation', handleStartConversation);
    };
  }, [hasStarted, sessionEnded, textToSpeech, speechRecognition, onRequirePayment]);

  // Set isReady when component mounts (after intro)
  useEffect(() => {
    if (isMounted && !isReady) {
      // Wait for intro to complete before enabling interaction
      const readyTimer = setTimeout(() => {
        console.log('✅ VoiceManager: Setting isReady to true');
        setIsReady(true);
      }, 8000); // Match intro duration
      
      return () => clearTimeout(readyTimer);
    }
  }, [isMounted, isReady]);

  // Provide manual start listening function to parent (only once)
  useEffect(() => {
    if (onManualStartListening) {
      const manualStart = () => {
        console.log('🎤 Manual speech recognition start requested');
        if (speechRecognition.isSupported && !speechRecognition.isListening) {
          speechRecognition.startListening();
        } else {
          console.log('🚫 Cannot start manually - conditions not met');
        }
      };
      onManualStartListening(manualStart);
    }
  }, [onManualStartListening]);

  // MANUAL START: Only start when user clicks orbit (handled by startConversation event)
  // No auto-start functionality here anymore

  // Removed fallback mechanism to prevent restart loops

  // DISABLED: Automatic restart after TTS (browser security constraint)
  useEffect(() => {
    if (waitingForTTSRef.current && !textToSpeech.isSpeaking && hasStarted && !sessionEnded) {
      console.log('🔄 TTS finished - marking TTS wait as complete');
      waitingForTTSRef.current = false;
      
      console.log('💡 User will need to click to restart speech recognition after TTS');
    }
  }, [textToSpeech.isSpeaking, hasStarted, sessionEnded]);

  // Debug effect to monitor listening state
  useEffect(() => {
    if (hasStarted) {
      console.log('🔍 Listening state debug:', {
        shouldBeListening: shouldBeListeningRef.current,
        isListening: speechRecognition.isListening,
        isSpeaking: textToSpeech.isSpeaking,
        isProcessing: processingRef.current,
        waitingForTTS: waitingForTTSRef.current,
        sessionEnded,
        hasStarted,
        timeSinceLastRestart: Date.now() - lastRestartTimeRef.current
      });
    }
  }, [speechRecognition.isListening, textToSpeech.isSpeaking, sessionEnded, hasStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechRecognition.stopListening();
      textToSpeech.stop();
      // Clear any pending listening timeouts
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = null;
      }
      // Clear speech start timeout
      // Clear speech keep-alive timeout
    };
  }, [speechRecognition, textToSpeech]);

  return null;
} 