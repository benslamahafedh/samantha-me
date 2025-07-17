'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useOpenAIRealtime } from '@/hooks/useOpenAIRealtime';
import { useOpenAITTS } from '@/hooks/useOpenAITTS';
import { getWalletAccessManager } from '@/lib/walletAccessManager';

interface SecureVoiceManagerProps {
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onHasStartedChange?: (hasStarted: boolean) => void;
  onIsReadyChange?: (isReady: boolean) => void;
  onSessionTimeChange?: (timeLeft: number) => void;
  onSessionEndedChange?: (sessionEnded: boolean) => void;
  onRequirePayment?: () => void;
  onManualStartListening?: (startFn: () => void) => void;
  onAccessStatusChange?: (hasAccess: boolean, isTrialActive: boolean) => void;
}

export default function SecureVoiceManager({
  onSpeakingChange,
  onListeningChange,
  onHasStartedChange,
  onIsReadyChange,
  onSessionTimeChange,
  onSessionEndedChange,
  onRequirePayment,
  onManualStartListening,
  onAccessStatusChange
}: SecureVoiceManagerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [hasWalletAccess, setHasWalletAccess] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState(180); // 3 minutes
  
  const { publicKey, connected } = useWallet();
  const walletAccessManager = useRef(getWalletAccessManager());
  const trialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownPaymentRef = useRef(false);

  const realtimeVoice = useOpenAIRealtime();
  const textToSpeech = useOpenAITTS();

  // Refs for access status
  const onAccessStatusChangeRef = useRef(onAccessStatusChange);

  useEffect(() => {
    onAccessStatusChangeRef.current = onAccessStatusChange;
  });

  // Check wallet access when wallet connects
  useEffect(() => {
    const checkAccess = async () => {
      if (connected && publicKey) {
        const hasAccess = await walletAccessManager.current.checkWalletAccess(publicKey.toBase58());
        setHasWalletAccess(hasAccess);
        onAccessStatusChangeRef.current?.(hasAccess, isTrialActive);
      } else {
        setHasWalletAccess(false);
        onAccessStatusChangeRef.current?.(false, isTrialActive);
      }
    };

    checkAccess();
  }, [connected, publicKey, isTrialActive]);

  // Track if component has mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set ready state when realtime is supported and connected
  useEffect(() => {
    if (isMounted && realtimeVoice.isSupported) {
      setIsReady(true);
    }
  }, [isMounted, realtimeVoice.isSupported]);

  // Notify parent of state changes - use refs to avoid dependency loops
  const onHasStartedChangeRef = useRef(onHasStartedChange);
  const onIsReadyChangeRef = useRef(onIsReadyChange);
  const onSpeakingChangeRef = useRef(onSpeakingChange);
  const onListeningChangeRef = useRef(onListeningChange);

  useEffect(() => {
    onHasStartedChangeRef.current = onHasStartedChange;
  });

  useEffect(() => {
    onIsReadyChangeRef.current = onIsReadyChange;
  });

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  });

  useEffect(() => {
    onListeningChangeRef.current = onListeningChange;
  });

  useEffect(() => {
    onHasStartedChangeRef.current?.(hasStarted);
  }, [hasStarted]);

  useEffect(() => {
    onIsReadyChangeRef.current?.(isReady);
  }, [isReady]);

  useEffect(() => {
    onSpeakingChangeRef.current?.(realtimeVoice.isSpeaking || textToSpeech.isSpeaking);
  }, [realtimeVoice.isSpeaking, textToSpeech.isSpeaking]);

  // Silence detection and restart control
  const lastUserInteractionRef = useRef<number>(Date.now());
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartAttemptsRef = useRef<number>(0);
  const silentAttemptsRef = useRef<number>(0);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInCooldownRef = useRef<boolean>(false);
  const MAX_RESTART_ATTEMPTS = 3;
  const MAX_SILENT_ATTEMPTS = 3;
  const COOLDOWN_TIME = 30000; // 30 seconds cooldown after too many silent attempts
  const MAX_CONVERSATION_TIME = 30 * 60 * 1000; // 30 minutes max conversation
  const conversationStartTimeRef = useRef<number>(0);

  // Helper to check if transcript is meaningful - much more permissive for natural conversation
  function isMeaningfulTranscript(transcript: string): boolean {
    if (!transcript || transcript.trim().length < 2) return false;
    const text = transcript.trim().toLowerCase();
    
    // Only filter out obvious noise/technical terms, not natural speech patterns
    const noiseWords = ['silence', 'noise', 'background', 'static', 'feedback', 'echo', 'breathing', 'sigh', 'cough', 'clear throat'];
    
    // Only reject if it's purely noise words and very short
    if (noiseWords.some(word => text.includes(word)) && text.length < 5) {
      return false;
    }
    
    // Accept any speech that's not just noise - much more permissive
    return true;
  }

  // Track successful voice input to reset silence detection
  useEffect(() => {
    if (realtimeVoice.transcript) {
      if (isMeaningfulTranscript(realtimeVoice.transcript)) {
        console.log('🎯 Meaningful speech detected:', realtimeVoice.transcript);
        lastUserInteractionRef.current = Date.now();
        restartAttemptsRef.current = 0;
        silentAttemptsRef.current = 0;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (cooldownTimeoutRef.current) {
          clearTimeout(cooldownTimeoutRef.current);
          cooldownTimeoutRef.current = null;
        }
        isInCooldownRef.current = false;
      } else {
        console.log('🔇 Filler or silent speech detected, incrementing silentAttempts');
        silentAttemptsRef.current += 1;
        if (silentAttemptsRef.current >= MAX_SILENT_ATTEMPTS && !isInCooldownRef.current) {
          isInCooldownRef.current = true;
          console.log('⏸️ Too many silent attempts, entering cooldown for 30s');
          cooldownTimeoutRef.current = setTimeout(() => {
            isInCooldownRef.current = false;
            silentAttemptsRef.current = 0;
            console.log('▶️ Cooldown ended, can restart listening');
          }, COOLDOWN_TIME);
        }
      }
    }
  }, [realtimeVoice.transcript]);

  // Handle continuous listening - restart when not listening and not speaking
  useEffect(() => {
    if (hasStarted && !sessionEnded && realtimeVoice.isConnected && !realtimeVoice.isListening && !textToSpeech.isSpeaking) {
      // Only restart if we have access (paid) or trial is still active
      if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
        // Check if conversation has been running too long
        const conversationDuration = Date.now() - conversationStartTimeRef.current;
        if (conversationDuration > MAX_CONVERSATION_TIME) {
          console.log('⏰ Maximum conversation time reached, stopping');
          setSessionEnded(true);
          onSessionEndedChangeRef.current?.(true);
          return;
        }
        
        // Simple restart with short delay
        const restartDelay = 500; // Much shorter delay for more responsive conversation
        setTimeout(() => {
          // Double-check conditions before restarting
          if (hasStarted && !sessionEnded && !textToSpeech.isSpeaking && !realtimeVoice.isListening) {
            console.log('🔄 Restarting listening for continuous conversation');
            realtimeVoice.startListening();
          }
        }, restartDelay);
      }
    }
  }, [hasStarted, sessionEnded, realtimeVoice.isConnected, realtimeVoice.isListening, textToSpeech.isSpeaking, hasWalletAccess, isTrialActive, trialTimeLeft, realtimeVoice.startListening, MAX_CONVERSATION_TIME]);

  // Refs for manual start
  const onManualStartListeningRef = useRef(onManualStartListening);

  useEffect(() => {
    onManualStartListeningRef.current = onManualStartListening;
  });

  // Provide manual start function to parent
  useEffect(() => {
    const manualStart = async () => {
      if (!realtimeVoice.isListening && realtimeVoice.isConnected) {
        // Only allow if user has access or trial time left
        if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
          await realtimeVoice.startListening();
        }
      }
    };
    
    onManualStartListeningRef.current?.(manualStart);
  }, [realtimeVoice.isListening, realtimeVoice.isConnected, hasWalletAccess, isTrialActive, trialTimeLeft, realtimeVoice.startListening]);

  // Track user interactions (clicks/touches) to prevent timeout
  useEffect(() => {
    const handleUserInteraction = () => {
      lastUserInteractionRef.current = Date.now();
      
      // If user is actively clicking, allow more restart attempts
      if (restartAttemptsRef.current >= MAX_RESTART_ATTEMPTS) {
        restartAttemptsRef.current = 0;
      }
    };

    // Listen for various user interaction events
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTrialTimer();
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  // Trial timer logic
  useEffect(() => {
    if (isTrialActive && !hasWalletAccess) {
      onSessionTimeChangeRef.current?.(trialTimeLeft);
      
      if (trialTimeLeft <= 0) {
        setSessionEnded(true);
        setIsTrialActive(false);
        onSessionEndedChangeRef.current?.(true);
        realtimeVoice.stopListening();
        textToSpeech.stop();
        
        if (!hasShownPaymentRef.current) {
          hasShownPaymentRef.current = true;
          onRequirePaymentRef.current?.();
        }
      }
    } else if (hasWalletAccess) {
      // For paid users, show infinite time (not Infinity to avoid NaN issues)
      onSessionTimeChangeRef.current?.(999999);
    }
  }, [isTrialActive, hasWalletAccess, trialTimeLeft, realtimeVoice, textToSpeech]);

  // Start trial timer
  const startTrialTimer = () => {
    if (trialTimerRef.current) {
      clearInterval(trialTimerRef.current);
    }

    trialTimerRef.current = setInterval(() => {
      setTrialTimeLeft(prev => {
        const newTime = prev - 1;
        return Math.max(0, newTime);
      });
    }, 1000);
  };

  // Stop trial timer
  const stopTrialTimer = () => {
    if (trialTimerRef.current) {
      clearInterval(trialTimerRef.current);
      trialTimerRef.current = null;
    }
  };

  // Handle conversation start
  useEffect(() => {
    const handleStartConversation = async () => {
      if (hasStarted || sessionEnded) {
        return;
      }

      // Check if user has wallet access (paid)
      if (hasWalletAccess) {
        // Paid user - unlimited access
        setHasStarted(true);
        conversationStartTimeRef.current = Date.now();
        realtimeVoice.resetTranscript(); // Reset transcript and cooldowns
        await realtimeVoice.startListening();
        
        setTimeout(() => {
          textToSpeech.speak("Hello, I'm Samantha. How can I help you today?");
        }, 500);
        
        return;
      }

      // Check if user can start free trial
      if (walletAccessManager.current.canStartFreeTrial()) {
        // Start free trial
        setIsTrialActive(true);
        setHasStarted(true);
        conversationStartTimeRef.current = Date.now();
        realtimeVoice.resetTranscript(); // Reset transcript and cooldowns
        walletAccessManager.current.markTrialUsed();
        startTrialTimer();
        
        await realtimeVoice.startListening();
        
        setTimeout(() => {
          //textToSpeech.speak("Hello, I'm Samantha. You have 3 minutes to try me out!");
        }, 500);
      } else {
        // Trial already used, require payment
        hasShownPaymentRef.current = true;
        onRequirePaymentRef.current?.();
      }
    };

    window.addEventListener('startConversation', handleStartConversation);
    
    return () => {
      window.removeEventListener('startConversation', handleStartConversation);
    };
  }, [hasStarted, sessionEnded, hasWalletAccess, realtimeVoice, textToSpeech]);

  // Refs for callback stability
  const onSessionTimeChangeRef = useRef(onSessionTimeChange);
  const onSessionEndedChangeRef = useRef(onSessionEndedChange);
  const onRequirePaymentRef = useRef(onRequirePayment);

  useEffect(() => {
    onSessionTimeChangeRef.current = onSessionTimeChange;
  });

  useEffect(() => {
    onSessionEndedChangeRef.current = onSessionEndedChange;
  });

  useEffect(() => {
    onRequirePaymentRef.current = onRequirePayment;
  });

  // Set up session timer
  useEffect(() => {
    if (!hasStarted || sessionEnded) return;

    const timer = setInterval(() => {
      const newTime = trialTimeLeft - 1;
      if (newTime <= 0) {
        clearInterval(timer);
        setSessionEnded(true);
        onSessionEndedChange?.(true);
        return;
      }
      setTrialTimeLeft(newTime);
      onSessionTimeChange?.(newTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, sessionEnded, onSessionEndedChange, onSessionTimeChange, MAX_CONVERSATION_TIME, realtimeVoice, trialTimeLeft]);

  // Don't render anything - this is a headless component
  return null;
} 