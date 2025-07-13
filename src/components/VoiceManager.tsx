'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

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
}

export default function VoiceManager({
  onTranscriptChange,
  onSpeakingChange,
  onListeningChange,
  onError,
  onHasStartedChange,
  onIsReadyChange,
  onSessionTimeChange,
  onSessionEndedChange
}: VoiceManagerProps) {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds = 1 minute
  
  const processingRef = useRef(false);
  const lastProcessedTranscript = useRef('');
  const sessionTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const timeLeftRef = useRef(60);
  const sessionEndedRef = useRef(false);

  const speechRecognition = useSpeechRecognition();
  const textToSpeech = useTextToSpeech();

  // Track if component has mounted on client side
  useEffect(() => {
    setIsMounted(true);
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

  // Handle listening changes
  useEffect(() => {
    onListeningChange?.(speechRecognition.isListening);
  }, [speechRecognition.isListening, onListeningChange]);

  // Handle errors with better user messages
  useEffect(() => {
    if (speechRecognition.error) {
      // Only show persistent errors to user, not temporary ones
      if (!speechRecognition.error.includes('temporarily unavailable')) {
        onError?.(speechRecognition.error);
      }
    }
  }, [speechRecognition.error, onError]);

  useEffect(() => {
    if (textToSpeech.error) {
      onError?.(textToSpeech.error);
    }
  }, [textToSpeech.error, onError]);

  // BULLETPROOF SESSION TERMINATION - Multiple fail-safes
  const forceTerminateSession = useCallback(() => {
    console.log('🚨 FORCE TERMINATING SESSION - ALL SYSTEMS STOP');
    
    // Set all flags
    sessionEndedRef.current = true;
    setSessionEnded(true);
    onSessionEndedChange?.(true);
    
    // Stop all voice activities immediately
    try {
      speechRecognition.stopListening();
      console.log('✅ Speech recognition force stopped');
    } catch (error) {
      console.error('❌ Error stopping speech recognition:', error);
    }
    
    try {
      textToSpeech.stop();
      console.log('✅ Text-to-speech force stopped');
    } catch (error) {
      console.error('❌ Error stopping text-to-speech:', error);
    }
    
    // Clear all processing
    processingRef.current = false;
    setIsProcessing(false);
    
    // Clear all timers
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Final message
    const endMessage = "Session terminated for cost efficiency. Thank you.";
    textToSpeech.speak(endMessage);
    
    console.log('🛑 SESSION COMPLETELY TERMINATED');
  }, [speechRecognition, textToSpeech, onSessionEndedChange]);

  // SIMPLE AND RELIABLE TIMER - Using window.setInterval for maximum compatibility
  const startSimpleTimer = useCallback(() => {
    console.log('🔴 SIMPLE TIMER STARTING - 60 seconds countdown');
    
    // Clear any existing timers
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    // Reset state
    sessionEndedRef.current = false;
    setSessionEnded(false);
    setTimeLeft(60);
    onSessionTimeChange?.(60);
    
    let secondsLeft = 60;
    
    // Simple countdown using window.setInterval
    const intervalId = window.setInterval(() => {
      secondsLeft--;
      
      console.log(`⏱️ SIMPLE TIMER: ${secondsLeft}s remaining`);
      
      // Update state
      setTimeLeft(secondsLeft);
      onSessionTimeChange?.(secondsLeft);
      
      // Final countdown
      if (secondsLeft <= 10) {
        console.log(`⚠️ FINAL COUNTDOWN: ${secondsLeft} seconds left!`);
      }
      
      // Terminate when time is up
      if (secondsLeft <= 0) {
        console.log('🛑 SIMPLE TIMER EXPIRED - TERMINATING NOW');
        window.clearInterval(intervalId);
        forceTerminateSession();
      }
    }, 1000);
    
    // Store interval ID
    countdownIntervalRef.current = intervalId;
    
    // Backup timer (60 seconds)
    sessionTimerRef.current = window.setTimeout(() => {
      console.log('🛑 BACKUP TIMER TRIGGERED - FORCE TERMINATION');
      window.clearInterval(intervalId);
      forceTerminateSession();
    }, 60000);
    
    console.log('✅ SIMPLE TIMER STARTED SUCCESSFULLY');
    
  }, [forceTerminateSession, onSessionTimeChange]);

  // Session timer - 1 minute limit (simplified)
  useEffect(() => {
    // Only start timer if we haven't already
    if (hasStarted && !sessionEnded && !countdownIntervalRef.current) {
      console.log('🟢 STARTING SIMPLE SESSION TIMER');
      startSimpleTimer();
    }
    
    return () => {
      // Cleanup on unmount
      if (sessionTimerRef.current) {
        window.clearTimeout(sessionTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
  }, [hasStarted, sessionEnded, startSimpleTimer]);

  // Debug session state changes
  useEffect(() => {
    console.log('📊 SESSION STATE CHANGE:', {
      hasStarted,
      sessionEnded,
      sessionStartTime,
      timeLeft,
      timerActive: !!countdownIntervalRef.current,
      backupTimerActive: !!sessionTimerRef.current
    });
  }, [hasStarted, sessionEnded, sessionStartTime, timeLeft]);

  // GLOBAL TIMER CHECK - Every 5 seconds, verify timer is running
  useEffect(() => {
    if (hasStarted && !sessionEnded) {
      const timerCheck = setInterval(() => {
        console.log('🔍 TIMER STATUS CHECK:', {
          countdownActive: !!countdownIntervalRef.current,
          backupActive: !!sessionTimerRef.current,
          timeLeft,
          sessionEndedRef: sessionEndedRef.current
        });
        
        // If timer should be running but isn't, restart it
        if (!countdownIntervalRef.current && !sessionEndedRef.current) {
          console.log('🚨 TIMER MISSING - RESTARTING NOW');
          startSimpleTimer();
        }
      }, 5000);
      
      return () => clearInterval(timerCheck);
    }
  }, [hasStarted, sessionEnded, timeLeft, startSimpleTimer]);

  // Notify parent of session ended changes
  useEffect(() => {
    if (sessionEnded) {
      console.log('🔴 SESSION ENDED - Notifying parent component');
    }
    onSessionEndedChange?.(sessionEnded);
  }, [sessionEnded, onSessionEndedChange]);

  // Send message to OpenAI API - BULLETPROOF PROTECTION
  const sendMessage = useCallback(async (message: string) => {
    // CRITICAL: Check session ended ref first (most reliable)
    if (sessionEndedRef.current) {
      console.log('🚫 BLOCKED API CALL - Session ended (ref check)');
      return;
    }
    
    // Debug current state
    console.log('🔍 SEND MESSAGE DEBUG:', {
      message: message.trim(),
      processingRef: processingRef.current,
      sessionEnded,
      sessionEndedRef: sessionEndedRef.current,
      hasStarted,
      sessionStartTime,
      timeLeft,
      timeLeftRef: timeLeftRef.current
    });

    // Multiple session end checks for safety
    if (!message.trim()) {
      console.log('🚫 BLOCKED API CALL - Empty message');
      return;
    }
    
    if (processingRef.current) {
      console.log('🚫 BLOCKED API CALL - Already processing');
      return;
    }
    
    if (sessionEnded || sessionEndedRef.current) {
      console.log('🚫 BLOCKED API CALL - Session ended (state check)');
      return;
    }

    console.log('✅ SENDING MESSAGE TO API:', message);
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('API Error:', data.error);
        throw new Error(data.error);
      }

      // Add user message to conversation
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: Date.now()
      };

      // Add assistant response to conversation
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now()
      };

      setConversationHistory(prev => [...prev, userMessage, assistantMessage]);

      // Speak the response
      textToSpeech.speak(data.response);

    } catch (error) {
      console.error('Error sending message:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [conversationHistory, textToSpeech, onError, sessionEnded, hasStarted, sessionStartTime, timeLeft, sessionEndedRef]);

  // Process transcript with better pause detection
  useEffect(() => {
    const currentTranscript = speechRecognition.transcript.trim();
    
    if (currentTranscript && 
        currentTranscript !== lastProcessedTranscript.current && 
        !processingRef.current &&
        !textToSpeech.isSpeaking &&
        !sessionEnded &&
        !sessionEndedRef.current) {
      
      // Balanced approach - responsive but not interrupting
      const endsWithPunctuation = /[.!?]$/.test(currentTranscript);
      const hasGoodLength = currentTranscript.length > 15;
      const hasClearPause = speechRecognition.interimTranscript === '';
      
      // Process if clearly complete OR if good length with clear pause
      if ((endsWithPunctuation && hasGoodLength) || (hasGoodLength && hasClearPause)) {
        // Shorter delay - just enough to catch continuation
        setTimeout(() => {
          // Check they haven't continued speaking
          if (speechRecognition.interimTranscript === '' && !textToSpeech.isSpeaking) {
            lastProcessedTranscript.current = currentTranscript;
            speechRecognition.resetTranscript();
            sendMessage(currentTranscript);
          }
        }, 2000); // Balanced 2-second wait
      }
    }
  }, [speechRecognition.transcript, speechRecognition.interimTranscript, sendMessage, textToSpeech.isSpeaking, speechRecognition, sessionEnded, sessionEndedRef]);

    // Manual start conversation triggered by button
  const startConversation = useCallback(async () => {
    if (hasStarted) return;
    
    console.log('🟢 STARTING CONVERSATION - This should trigger the timer');
    setHasStarted(true);
    
    // TEST: Force timer to start immediately
    setTimeout(() => {
      console.log('🧪 TESTING TIMER - Starting bulletproof timer now');
      startSimpleTimer();
    }, 100);
    
    // Start immediately when button is clicked
    const greeting = "Hi there... I'm Samantha. What's on your mind?";
    textToSpeech.speak(greeting);
    
    const greetingMessage: Message = {
      role: 'assistant',
      content: greeting,
      timestamp: Date.now()
    };
    
    setConversationHistory([greetingMessage]);
    
    // Start listening after greeting completes
    setTimeout(() => {
      speechRecognition.startListening();
    }, 2500);
  }, [hasStarted, speechRecognition, textToSpeech]);

  // Handle manual start from button
  useEffect(() => {
    const handleManualStart = () => {
      startConversation();
    };

    window.addEventListener('startConversation', handleManualStart);
    
    return () => {
      window.removeEventListener('startConversation', handleManualStart);
    };
  }, [startConversation]);

  // Auto-restart listening after speaking with balanced delay
  useEffect(() => {
    if (!textToSpeech.isSpeaking && hasStarted && !speechRecognition.isListening && !isProcessing && !sessionEnded && !sessionEndedRef.current) {
      // Resume listening with a natural pause - not too fast, not too slow
      const timeout = setTimeout(() => {
        if (!sessionEnded && !sessionEndedRef.current) { // Double check session hasn't ended
          speechRecognition.startListening();
        }
      }, 2500); // Balanced 2.5 seconds - natural conversation pace
      
      return () => clearTimeout(timeout);
    }
  }, [textToSpeech.isSpeaking, hasStarted, speechRecognition.isListening, isProcessing, speechRecognition, sessionEnded, sessionEndedRef]);

  // Handle manual completion from button
  useEffect(() => {
    const handleManualComplete = () => {
      const currentTranscript = speechRecognition.transcript.trim();
      if (currentTranscript && !processingRef.current && !textToSpeech.isSpeaking && !sessionEnded && !sessionEndedRef.current) {
        lastProcessedTranscript.current = currentTranscript;
        speechRecognition.resetTranscript();
        sendMessage(currentTranscript);
      }
    };

    window.addEventListener('manualComplete', handleManualComplete);
    
    return () => {
      window.removeEventListener('manualComplete', handleManualComplete);
    };
  }, [speechRecognition.transcript, sendMessage, textToSpeech.isSpeaking, speechRecognition, sessionEnded]);

  // Request microphone permission and prepare for conversation
  useEffect(() => {
    const requestPermissionAndPrepare = async () => {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Now that intro is complete, we can set ready immediately
        setIsReady(true);
      } catch (error) {
        console.error('Microphone permission denied:', error);
        onError?.('Microphone permission is required for voice interaction');
      }
    };

    if (typeof window !== 'undefined' && 'navigator' in window) {
      requestPermissionAndPrepare();
    }
  }, [onError]);

  // Check for browser support only after mounting
  if (isMounted && (!speechRecognition.isSupported || !textToSpeech.isSupported)) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-rose-pink">
        <div className="text-center p-8 bg-black/30 backdrop-blur-sm rounded-2xl shadow-lg border border-white/10">
          <h2 className="text-2xl font-light text-white mb-4">
            Browser Not Supported
          </h2>
          <p className="text-white/70">
            This browser doesn't support voice recognition or text-to-speech. 
            Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return null; // This component manages state but doesn't render anything
} 