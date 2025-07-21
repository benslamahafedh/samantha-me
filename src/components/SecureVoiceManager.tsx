'use client';

import { useState, useEffect, useRef } from 'react';
import { useFastVoiceProcessing } from '@/hooks/useFastVoiceProcessing';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';

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
  sessionId?: string;
  onVoiceError?: (error: string | null) => void;
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
  onAccessStatusChange,
  sessionId: propSessionId,
  onVoiceError
}: SecureVoiceManagerProps) {
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

  const fastVoice = useFastVoiceProcessing();
  const microphonePermission = useMicrophonePermission();

  // Create refs for fastVoice functions to avoid dependency issues
  const fastVoiceRef = useRef(fastVoice);
  useEffect(() => {
    fastVoiceRef.current = fastVoice;
  });

  // Monitor voice errors
  useEffect(() => {
    if (fastVoice.error) {
      onVoiceErrorRef.current?.(fastVoice.error);
    }
  }, [fastVoice.error]);

  // Monitor microphone permission errors
  useEffect(() => {
    if (microphonePermission.error) {
      onVoiceErrorRef.current?.(microphonePermission.error);
    }
  }, [microphonePermission.error]);

  // Monitor microphone permission changes
  useEffect(() => {
    // Permission state monitoring (no logging)
  }, [microphonePermission.hasPermission, microphonePermission.isChecking, microphonePermission.error]);

  // Refs for access status and error handling
  const onAccessStatusChangeRef = useRef(onAccessStatusChange);
  const onVoiceErrorRef = useRef(onVoiceError);
  const microphonePermissionRef = useRef(microphonePermission);

  useEffect(() => {
    onAccessStatusChangeRef.current = onAccessStatusChange;
  });

  useEffect(() => {
    onVoiceErrorRef.current = onVoiceError;
  });

  useEffect(() => {
    microphonePermissionRef.current = microphonePermission;
  });

  // Initialize session and check access
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Use prop sessionId if available, otherwise get from localStorage
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
          
          // Update access status
          setHasWalletAccess(data.hasAccess);
          setIsTrialActive(data.reason === 'Trial access active');
          onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
          
          // Start trial timer if trial is active
          if (data.reason === 'Trial access active' && data.trialExpiresAt) {
            const timeLeft = Math.max(0, Math.floor((new Date(data.trialExpiresAt).getTime() - Date.now()) / 1000));
            setTrialTimeLeft(timeLeft);
            startTrialTimer();
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

  // Listen for payment success events and access status changes
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
          // Update access status
          setHasWalletAccess(data.hasAccess);
          setIsTrialActive(data.reason === 'Trial access active');
          onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
          
          console.log('🔐 Access status updated after payment:', { 
            hasAccess: data.hasAccess, 
            reason: data.reason, 
            isTrialActive: data.reason === 'Trial access active' 
          });
          
          // Reset payment modal flag
          hasShownPaymentRef.current = false;
          
          // Reset session ended state
          setSessionEnded(false);
          
          // If user now has access, they should be able to start conversation
          if (data.hasAccess) {
            console.log('🎉 Payment successful - user now has access');
          }
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    };

    // Listen for payment success events
    const handlePaymentSuccess = async () => {
      console.log('💰 Payment success event received');
      await refreshSession();
    };

    window.addEventListener('paymentSuccess', handlePaymentSuccess);
    
    return () => {
      window.removeEventListener('paymentSuccess', handlePaymentSuccess);
    };
  }, [sessionId]);

  // Track if component has mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set ready state when fast voice is supported and connected
  useEffect(() => {
    if (isMounted && fastVoice.isSupported) {
      setIsReady(true);
    }
  }, [isMounted, fastVoice.isSupported]);

  // Also set ready state after a short delay to ensure everything is initialized
  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 500); // Reduced to 500ms for faster response
      
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

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
    onSpeakingChangeRef.current?.(fastVoice.isSpeaking);
  }, [fastVoice.isSpeaking]);

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
    if (fastVoice.transcript) {
      if (isMeaningfulTranscript(fastVoice.transcript)) {

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

        silentAttemptsRef.current += 1;
        if (silentAttemptsRef.current >= MAX_SILENT_ATTEMPTS && !isInCooldownRef.current) {
          isInCooldownRef.current = true;
          
          cooldownTimeoutRef.current = setTimeout(() => {
            isInCooldownRef.current = false;
            silentAttemptsRef.current = 0;
            
          }, COOLDOWN_TIME);
        }
      }
    }
  }, [fastVoice.transcript]);

  // Handle continuous listening - restart when not listening and not speaking
  useEffect(() => {
    if (hasStarted && !sessionEnded && fastVoice.isConnected && !fastVoice.isListening && !fastVoice.isSpeaking) {
      // Only restart if we have access (paid) or trial is still active
      if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
        // Check if conversation has been running too long
        const conversationDuration = Date.now() - conversationStartTimeRef.current;
        if (conversationDuration > MAX_CONVERSATION_TIME) {
  
          setSessionEnded(true);
          onSessionEndedChangeRef.current?.(true);
          return;
        }
        
        // Simple restart with short delay
        const restartDelay = 500; // Much shorter delay for more responsive conversation
        setTimeout(() => {
          // Double-check conditions before restarting
          if (hasStarted && !sessionEnded && !fastVoice.isSpeaking && !fastVoice.isListening) {
    
            fastVoice.startListening();
          }
        }, restartDelay);
      }
    }
  }, [hasStarted, sessionEnded, fastVoice.isConnected, fastVoice.isListening, fastVoice.isSpeaking, hasWalletAccess, isTrialActive, trialTimeLeft, fastVoice.startListening, MAX_CONVERSATION_TIME]);

  // Refs for manual start
  const onManualStartListeningRef = useRef(onManualStartListening);

  useEffect(() => {
    onManualStartListeningRef.current = onManualStartListening;
  });

  // Provide manual start function to parent
  useEffect(() => {
    const manualStart = async () => {
      if (!fastVoice.isListening && fastVoice.isConnected) {
        // Only allow if user has access or trial time left
        if (hasWalletAccess || (isTrialActive && trialTimeLeft > 0)) {
          await fastVoice.startListening();
        }
      }
    };
    
    onManualStartListeningRef.current?.(manualStart);
  }, [fastVoice.isListening, fastVoice.isConnected, hasWalletAccess, isTrialActive, trialTimeLeft, fastVoice.startListening]);

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
        fastVoice.stopListening();
        
        if (!hasShownPaymentRef.current) {
          hasShownPaymentRef.current = true;
          onRequirePaymentRef.current?.();
        }
      }
    } else if (hasWalletAccess && !isTrialActive) {
      // For paid users (not in trial), show infinite time
      onSessionTimeChangeRef.current?.(999999);
    } else if (!isTrialActive && !hasWalletAccess) {
      // No trial, no access - show 0 time
      onSessionTimeChangeRef.current?.(0);
    }
  }, [isTrialActive, hasWalletAccess, trialTimeLeft, fastVoice]);

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

      console.log('🎤 Starting conversation - checking access status...');

      // First, refresh session access status before making decisions
      if (sessionId) {
        try {
          const response = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Update access status
            setHasWalletAccess(data.hasAccess);
            setIsTrialActive(data.reason === 'Trial access active');
            onAccessStatusChangeRef.current?.(data.hasAccess, data.reason === 'Trial access active');
            
            console.log('🔐 Access status updated:', { 
              hasAccess: data.hasAccess, 
              reason: data.reason, 
              isTrialActive: data.reason === 'Trial access active' 
            });
            
            // Start trial timer if trial is active
            if (data.reason === 'Trial access active' && data.trialExpiresAt) {
              const timeLeft = Math.max(0, Math.floor((new Date(data.trialExpiresAt).getTime() - Date.now()) / 1000));
              setTrialTimeLeft(timeLeft);
              startTrialTimer();
            }
            
            // Check if user has wallet access (paid) - use fresh data
            if (data.hasAccess) {
              console.log('💰 Paid user detected - starting unlimited conversation');
              // Paid user - unlimited access
              setHasStarted(true);
              conversationStartTimeRef.current = Date.now();
              // Check microphone permission first
              const currentPermission = microphonePermissionRef.current;
              
              if (!currentPermission.hasPermission && !currentPermission.isChecking) {
                const permissionGranted = await currentPermission.requestPermission();
                if (!permissionGranted) {
                  onVoiceErrorRef.current?.('Microphone permission required. Please allow microphone access and try again.');
                  return;
                }
              }
              
              try {
                await fastVoiceRef.current.startListening();
                
                setTimeout(() => {
                  fastVoiceRef.current.sendMessage("Hello, I'm Samantha. How can I help you today?");
                }, 500);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
                onVoiceErrorRef.current?.(errorMessage);
                // Fallback: still start conversation but show error
                setTimeout(() => {
                  fastVoiceRef.current.sendMessage("Hello, I'm Samantha. Voice recognition is having issues, but I'm here to help!");
                }, 500);
              }
              
              return;
            }
            
            // Check if user can start free trial (trial is active and time left)
            if (data.reason === 'Trial access active' && data.trialExpiresAt) {
              const timeLeft = Math.max(0, Math.floor((new Date(data.trialExpiresAt).getTime() - Date.now()) / 1000));
              if (timeLeft > 0) {
                console.log('⏰ Trial user detected - starting trial conversation');
                // Start free trial
                setHasStarted(true);
                conversationStartTimeRef.current = Date.now();
                // Check microphone permission first
                const currentPermission = microphonePermissionRef.current;
                
                if (!currentPermission.hasPermission && !currentPermission.isChecking) {
                  const permissionGranted = await currentPermission.requestPermission();
                  if (!permissionGranted) {
                    onVoiceErrorRef.current?.('Microphone permission required. Please allow microphone access and try again.');
                    return;
                  }
                }
                
                try {
                  await fastVoiceRef.current.startListening();
                  
                  setTimeout(() => {
                    fastVoiceRef.current.sendMessage("Hello, I'm Samantha. You have 3 minutes to try me out!");
                  }, 500);
                } catch (error) {
                  console.error('❌ Voice recognition failed for trial:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Voice recognition failed';
                  onVoiceErrorRef.current?.(errorMessage);
                  // Fallback: still start conversation but show error
                  setTimeout(() => {
                    fastVoiceRef.current.sendMessage("Hello, I'm Samantha. Voice recognition is having issues, but I'm here to help!");
                  }, 500);
                }
                
                return;
              }
            }
            
            // If we get here, user needs to pay
            console.log('💳 User needs payment - showing payment modal');
            hasShownPaymentRef.current = true;
            onRequirePaymentRef.current?.();
          }
        } catch (error) {
          console.error('❌ Failed to check session access:', error);
          // Session refresh failed silently
        }
      } else {
        console.log('❌ No session ID available');
        hasShownPaymentRef.current = true;
        onRequirePaymentRef.current?.();
      }
    };

    window.addEventListener('startConversation', handleStartConversation);
    
    return () => {
      window.removeEventListener('startConversation', handleStartConversation);
    };
  }, [hasStarted, sessionEnded, sessionId]);

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

  // Set up session timer - ONLY for trial users, not paid users
  useEffect(() => {
    if (!hasStarted || sessionEnded || hasWalletAccess) {
      console.log('⏰ Timer not running:', { hasStarted, sessionEnded, hasWalletAccess });
      return; // Don't run timer for paid users
    }

    console.log('⏰ Starting trial timer for user');
    const timer = setInterval(() => {
      const newTime = trialTimeLeft - 1;
      if (newTime <= 0) {
        clearInterval(timer);
        console.log('⏰ Trial time expired, showing payment modal');
        setSessionEnded(true);
        onSessionEndedChange?.(true);
        // Show payment modal instead of redirecting
        onRequirePaymentRef.current?.();
        return;
      }
      setTrialTimeLeft(newTime);
      onSessionTimeChange?.(newTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, sessionEnded, hasWalletAccess, onSessionEndedChange, onSessionTimeChange, trialTimeLeft]);

  // Don't render anything - this is a headless component
  return null;
} 