'use client';

import { useState, useCallback, useEffect } from 'react';
import OptimizedVoiceManager from '@/components/OptimizedVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import CryptoPaymentModal from '@/components/CryptoPaymentModal';
import VoiceErrorDisplay from '@/components/VoiceErrorDisplay';
import SessionTimer from '@/components/SessionTimer';
import MuteIndicator from '@/components/MuteIndicator';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(180); // 3 minutes
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasWalletAccess, setHasWalletAccess] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // iOS detection and audio initialization
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    
    if (isIOSDevice) {
      console.log('🍎 iOS device detected - initializing audio session');
      console.log('📱 User Agent:', navigator.userAgent);
      
      // Initialize iOS audio session
      const initializeIOSAudio = async () => {
        try {
          console.log('🔧 Starting iOS audio initialization...');
          
          // Create audio context to activate audio session
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            console.log('✅ AudioContext available');
            const audioContext = new AudioContextClass();
            console.log('📊 Audio context state:', audioContext.state);
            
            // Configure audio session for iOS
            if ((audioContext as any).setAudioSessionConfiguration) {
              console.log('🔧 Configuring iOS audio session...');
              await (audioContext as any).setAudioSessionConfiguration({
                category: 'playAndRecord',
                mode: 'voiceChat',
                options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
              });
              console.log('✅ iOS audio session configured');
            } else {
              console.log('⚠️ setAudioSessionConfiguration not available');
            }
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
              console.log('🔄 Resuming suspended audio context...');
              await audioContext.resume();
              console.log('✅ iOS audio context resumed');
            }
            
            // Create a silent oscillator to activate audio session
            console.log('🔊 Creating silent oscillator to activate audio session...');
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.001);
            
            setAudioInitialized(true);
            console.log('✅ iOS audio session activated successfully');
          } else {
            console.error('❌ AudioContext not available');
            setVoiceError('Audio not supported on this device');
          }
        } catch (error) {
          console.error('❌ iOS audio initialization failed:', error);
          setVoiceError(`Audio initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      // Initialize audio on user interaction
      const handleUserInteraction = () => {
        console.log('👆 User interaction detected - initializing audio...');
        initializeIOSAudio();
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };
      
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('click', handleUserInteraction);
      
      // Also try to initialize on page load
      console.log('🚀 Attempting initial audio initialization...');
      initializeIOSAudio();
    } else {
      console.log('🖥️ Non-iOS device detected');
      setAudioInitialized(true);
    }
  }, []);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Initialize server components first
        try {
          await fetch('/api/server-init');
        } catch (initError) {
          console.log('Server init failed (might already be initialized):', initError);
        }
        
        // Try to get existing session from localStorage
        const existingSessionId = localStorage.getItem('samantha_session_id');
        
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: existingSessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSessionId(data.sessionId);
          localStorage.setItem('samantha_session_id', data.sessionId);
          
          // If user has access, update the state
          if (data.hasAccess) {
            setHasWalletAccess(true);
            setIsTrialActive(data.reason === 'Trial access active');
          }
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    
    // Only initialize session after audio is ready on iOS
    if (!isIOS || audioInitialized) {
      initializeSession();
    }

    // Listen for session initialization from payment modal
    const handleSessionInitialized = (event: CustomEvent) => {
      setSessionId(event.detail.sessionId);
      localStorage.setItem('samantha_session_id', event.detail.sessionId);
    };

    window.addEventListener('sessionInitialized', handleSessionInitialized as EventListener);

    return () => {
      window.removeEventListener('sessionInitialized', handleSessionInitialized as EventListener);
    };
  }, [isIOS, audioInitialized]);

  // Mobile-specific fixes to prevent interference with voice interaction
  useEffect(() => {
    // Prevent text selection and touch highlighting
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Prevent pull-to-refresh
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const startY = touch.clientY;
      
      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const currentY = touch.clientY;
        const diff = currentY - startY;
        
        if (diff > 0 && window.scrollY === 0) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      
      document.addEventListener('touchend', handleTouchEnd);
    };

    // Apply mobile fixes
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventSelection);
    document.addEventListener('contextmenu', preventSelection);
    document.addEventListener('touchend', preventZoom);
    document.addEventListener('touchstart', preventPullToRefresh);

    // Ensure proper microphone access on iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Request microphone permission early
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permission granted
        })
        .catch((err) => {
          // Permission denied
        });
    }

    return () => {
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventSelection);
      document.removeEventListener('contextmenu', preventSelection);
      document.removeEventListener('touchend', preventZoom);
      document.removeEventListener('touchstart', preventPullToRefresh);
    };
  }, []);

  const handleHasStartedChange = (started: boolean) => {
    setHasStarted(started);
  };

  const handleIsReadyChange = (ready: boolean) => {
    setIsReady(ready);
  };

  const handleSessionTimeChange = (timeLeft: number) => {
    // Only update timer for trial users, not paid users
    if (!hasWalletAccess) {
      setSessionTimeLeft(timeLeft);
    }
  };

  const handleSessionEndedChange = (sessionEnded: boolean) => {
    setSessionEnded(sessionEnded);
  };

  const handleRequirePayment = () => {
    if (sessionId && sessionId.trim() !== '') {
      setShowPaymentModal(true);
    } else {
      console.error('Cannot show payment modal: Session ID is not available');
      // Try to reinitialize session
      const initializeSession = async () => {
        try {
          const response = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: null })
          });
          
          const data = await response.json();
          
          if (data.success) {
            setSessionId(data.sessionId);
            localStorage.setItem('samantha_session_id', data.sessionId);
          }
        } catch (error) {
          console.error('Failed to initialize session for payment:', error);
        }
      };
      
      initializeSession();
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setSessionEnded(false);
    
    // Refresh session access status
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update access status immediately
        setHasWalletAccess(data.hasAccess);
        setIsTrialActive(data.reason === 'Trial access active');
        
        // Trigger access status change
        handleAccessStatusChange(data.hasAccess, data.reason === 'Trial access active');
        
        // Dispatch payment success event for SecureVoiceManager
        const paymentSuccessEvent = new Event('paymentSuccess');
        window.dispatchEvent(paymentSuccessEvent);
        
        console.log('🎉 Payment success handled - access status updated');
      }
    } catch (error) {
      console.error('Failed to refresh session after payment:', error);
    }
  };

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleStartConversation = useCallback(() => {
    const event = new Event('startConversation');
    window.dispatchEvent(event);
  }, []);

  const handleAccessStatusChange = useCallback((hasAccess: boolean, trialActive: boolean) => {
    setHasWalletAccess(hasAccess);
    setIsTrialActive(trialActive);
  }, []);

  // Show loading state for iOS while audio initializes
  if (isIOS && !audioInitialized) {
    return (
      <main className="relative min-h-screen overflow-hidden select-none touch-none">
        <div className="relative min-h-screen select-none touch-none flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-pulse text-2xl mb-4">🍎</div>
            <div className="text-lg mb-2">Initializing audio...</div>
            <div className="text-sm text-gray-400">Tap anywhere to continue</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden select-none touch-none">
        <div className="relative min-h-screen select-none touch-none">
          {/* Mute Indicator */}
          <MuteIndicator isMuted={isMuted} />
          
          {/* Session Timer */}
          <SessionTimer 
            timeLeft={hasWalletAccess ? 3600 : sessionTimeLeft} // Show 1 hour for paid users
            isTrialActive={isTrialActive}
            hasWalletAccess={hasWalletAccess}
          />

          <VoiceVisualization 
            isListening={isListening}
            isSpeaking={isSpeaking}
            transcript={''}
            error={null}
            hasStarted={hasStarted}
            isReady={isReady}
            isIntroComplete={isIntroComplete}
            onIntroComplete={handleIntroComplete}
            onStartConversation={handleStartConversation}
            sessionTimeLeft={sessionTimeLeft}
            isMuted={isMuted}
            sessionEnded={sessionEnded}
          />

          {/* Simple clickable overlay when ready */}
          {isReady && !hasStarted && isIntroComplete && !sessionEnded && (
            <div 
              className="fixed inset-0 z-40 cursor-pointer"
              onClick={handleStartConversation}
              style={{ pointerEvents: 'auto' }}
            />
          )}

          <OptimizedVoiceManager
            onSpeakingChange={setIsSpeaking}
            onListeningChange={setIsListening}
            onHasStartedChange={handleHasStartedChange}
            onIsReadyChange={handleIsReadyChange}
            onSessionTimeChange={handleSessionTimeChange}
            onSessionEndedChange={handleSessionEndedChange}
            onRequirePayment={handleRequirePayment}
            onAccessStatusChange={handleAccessStatusChange}
            sessionId={sessionId}
            onVoiceError={setVoiceError}
            onMuteChange={setIsMuted}
          />
        </div>

        {/* Crypto Payment Modal */}
        <CryptoPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          sessionId={sessionId}
        />

        {/* Voice Error Display */}
        <VoiceErrorDisplay
          error={voiceError}
          onRetry={() => {
            setVoiceError(null);
            // Trigger a conversation restart
            window.dispatchEvent(new Event('startConversation'));
          }}
          onDismiss={() => setVoiceError(null)}
          onRequestPermission={async () => {
            setVoiceError(null);
            // Try to request microphone permission directly
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true });
              // If successful, trigger conversation restart
              window.dispatchEvent(new Event('startConversation'));
            } catch (error) {
              console.error('Failed to request microphone permission:', error);
              setVoiceError('Microphone access denied. Please check your browser settings.');
            }
          }}
        />
      </main>
  );
} 