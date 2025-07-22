'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [hasWalletAccess, setHasWalletAccess] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialTimeLeft, setTrialTimeLeft] = useState(180); // 3 minutes
  const [sessionId, setSessionId] = useState<string>('');
  
  const trialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownPaymentRef = useRef(false);
  const conversationStartTimeRef = useRef<number>(0);

  const optimizedVoice = useOptimizedVoiceProcessing(sessionId);
  const microphonePermission = useMicrophonePermission();

  // Monitor mute state
  useEffect(() => {
    onMuteChangeRef.current?.(optimizedVoice.isMuted);
    
    if (optimizedVoice.isMuted && optimizedVoice.isSpeaking) {
      console.log('🔇 Microphone muted - stopping speech');
      // The speech will be stopped automatically by the optimized voice processing
    }
  }, [optimizedVoice.isMuted, optimizedVoice.isSpeaking]);

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

  // Initialize session and check access
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const existingSessionId = propSessionId || localStorage.getItem('samantha_session_id');
        
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: existingSessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSessionId(data.sessionId);
          localStorage.setItem('samantha_session_id', data.sessionId);
          
          setHasWalletAccess(data.hasAccess);
          setIsTrialActive(data.reason === 'Trial access active');
          onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
          
          if (data.reason === 'Trial access active' && data.trialExpiresAt) {
            const timeLeft = Math.max(0, Math.floor((new Date(data.trialExpiresAt).getTime() - Date.now()) / 1000));
            setTrialTimeLeft(timeLeft);
            startTrialTimer();
          }
          
          // Auto-start conversation if user has access
          if (data.hasAccess) {
            console.log('🎯 Auto-starting conversation for user with access');
            // Trigger conversation start after a short delay
            setTimeout(() => {
              window.dispatchEvent(new Event('startConversation'));
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    
    initializeSession();
  }, [propSessionId]);

  // Update sessionId when prop changes
  useEffect(() => {
    if (propSessionId && propSessionId !== sessionId) {
      setSessionId(propSessionId);
    }
  }, [propSessionId, sessionId]);

  // Auto-start conversation when user has access and is ready
  useEffect(() => {
    if (hasWalletAccess && !hasStarted && !sessionEnded && isMounted) {
      console.log('🎯 Auto-starting conversation for user with access');
      // Trigger conversation start after a short delay
      setTimeout(() => {
        window.dispatchEvent(new Event('startConversation'));
      }, 1000);
    }
  }, [hasWalletAccess, hasStarted, sessionEnded, isMounted]);

  // Listen for payment success events
  useEffect(() => {
    const refreshSession = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setHasWalletAccess(data.hasAccess);
          setIsTrialActive(data.reason === 'Trial access active');
          onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
          
          hasShownPaymentRef.current = false;
          setSessionEnded(false);
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    };

    const handlePaymentSuccess = async () => {
      await refreshSession();
    };

    window.addEventListener('paymentSuccess', handlePaymentSuccess);
    
    return () => {
      window.removeEventListener('paymentSuccess', handlePaymentSuccess);
    };
  }, [sessionId]);

  // Track if component has mounted
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set ready state
  useEffect(() => {
    if (isMounted && optimizedVoice.isSupported) {
      setIsReady(true);
    }
  }, [isMounted, optimizedVoice.isSupported]);

  // Also set ready state after a short delay
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 300); // Reduced to 300ms for faster response
      
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  // Notify parent of state changes
  useEffect(() => {
    onHasStartedChangeRef.current?.(hasStarted);
  }, [hasStarted]);

  useEffect(() => {
    onIsReadyChangeRef.current?.(isReady);
  }, [isReady]);

  useEffect(() => {
    onSpeakingChangeRef.current?.(optimizedVoice.isSpeaking);
  }, [optimizedVoice.isSpeaking]);

  useEffect(() => {
    onListeningChangeRef.current?.(optimizedVoice.isListening);
  }, [optimizedVoice.isListening]);

  // Continuous listening with optimized restart
  useEffect(() => {
    if (hasStarted && !sessionEnded && optimizedVoice.isConnected && 
        !optimizedVoice.isListening && !optimizedVoice.isSpeaking && !optimizedVoice.isProcessing) {
      
      if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
        // Check conversation duration
        const conversationDuration = Date.now() - conversationStartTimeRef.current;
        if (conversationDuration > 30 * 60 * 1000) { // 30 minutes max
          setSessionEnded(true);
          onSessionEndedChangeRef.current?.(true);
          return;
        }
        
        // Optimized restart with minimal delay
        const restartDelay = 200; // Much shorter delay for responsive conversation
        setTimeout(() => {
          if (hasStarted && !sessionEnded && !optimizedVoice.isSpeaking && 
              !optimizedVoice.isListening && !optimizedVoice.isProcessing) {
            optimizedVoice.startListening();
          }
        }, restartDelay);
      }
    }
  }, [hasStarted, sessionEnded, optimizedVoice.isConnected, optimizedVoice.isListening, 
      optimizedVoice.isSpeaking, optimizedVoice.isProcessing, hasWalletAccess, isTrialActive, trialTimeLeft]);

  // Provide manual start function
  useEffect(() => {
    const manualStart = async () => {
      if (!optimizedVoice.isListening && optimizedVoice.isConnected) {
        if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
          await optimizedVoice.startListening();
        }
      }
    };
    
    onManualStartListeningRef.current?.(manualStart);
  }, [hasWalletAccess, isTrialActive, trialTimeLeft]);

  // Trial timer logic
  useEffect(() => {
    if (isTrialActive && !hasWalletAccess) {
      onSessionTimeChangeRef.current?.(trialTimeLeft);
      
      if (trialTimeLeft <= 0) {
        setSessionEnded(true);
        setIsTrialActive(false);
        onSessionEndedChangeRef.current?.(true);
        // Stop listening using the hook
        if (optimizedVoice.stopListening) {
          optimizedVoice.stopListening();
        }
        
        if (!hasShownPaymentRef.current) {
          hasShownPaymentRef.current = true;
          onRequirePaymentRef.current?.();
        }
      }
    } else if (hasWalletAccess && !isTrialActive) {
      onSessionTimeChangeRef.current?.(999999);
    } else if (!isTrialActive && !hasWalletAccess) {
      onSessionTimeChangeRef.current?.(0);
    }
  }, [isTrialActive, hasWalletAccess, trialTimeLeft]);

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
      if (hasStarted || sessionEnded) return;

      if (sessionId) {
        try {
          const response = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          const data = await response.json();
          
          if (data.success) {
            setHasWalletAccess(data.hasAccess);
            setIsTrialActive(data.reason === 'Trial access active');
            onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
            
            if (data.reason === 'Trial access active' && data.trialExpiresAt) {
              const timeLeft = Math.max(0, Math.floor((new Date(data.trialExpiresAt).getTime() - Date.now()) / 1000));
              setTrialTimeLeft(timeLeft);
              startTrialTimer();
            }
            
            if (data.hasAccess) {
              // User has access (paid or trial)
              setHasStarted(true);
              conversationStartTimeRef.current = Date.now();
              
              if (!microphonePermission.hasPermission && !microphonePermission.isChecking) {
                const permissionGranted = await microphonePermission.requestPermission();
                if (!permissionGranted) {
                  onVoiceErrorRef.current?.('Microphone permission required. Please allow microphone access and try again.');
                  return;
                }
              }
              
              try {
                await optimizedVoice.startListening();
                
                // Different message based on access type
                const message = data.reason === 'Trial access active' 
                  ? "Hello, I'm Samantha. You have 3 minutes to try me out!"
                  : "Hello, I'm Samantha. How can I help you today?";
                
                setTimeout(() => {
                  optimizedVoice.sendMessage(message, sessionId);
                }, 300);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
                onVoiceErrorRef.current?.(errorMessage);
                setTimeout(() => {
                  optimizedVoice.sendMessage("Hello, I'm Samantha. Voice recognition is having issues, but I'm here to help!", sessionId);
                }, 300);
              }
              
              return;
            }
            
            // User needs to pay
            hasShownPaymentRef.current = true;
            onRequirePaymentRef.current?.();
          }
        } catch (error) {
          console.error('Failed to check session access:', error);
        }
      } else {
        hasShownPaymentRef.current = true;
        onRequirePaymentRef.current?.();
      }
    };

    window.addEventListener('startConversation', handleStartConversation);
    
    return () => {
      window.removeEventListener('startConversation', handleStartConversation);
    };
  }, [hasStarted, sessionEnded, sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTrialTimer();
    };
  }, []);

  // Don't render anything - this is a headless component
  return null;
} 