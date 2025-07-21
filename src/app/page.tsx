'use client';

import { useState, useCallback, useEffect } from 'react';
import SecureVoiceManager from '@/components/SecureVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import CryptoPaymentModal from '@/components/CryptoPaymentModal';
import WalletProvider from '@/components/WalletProvider';
import VoiceErrorDisplay from '@/components/VoiceErrorDisplay';
import SessionTimer from '@/components/SessionTimer';

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

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
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
    
    initializeSession();

    // Listen for session initialization from payment modal
    const handleSessionInitialized = (event: CustomEvent) => {
      setSessionId(event.detail.sessionId);
      localStorage.setItem('samantha_session_id', event.detail.sessionId);
    };

    window.addEventListener('sessionInitialized', handleSessionInitialized as EventListener);

    return () => {
      window.removeEventListener('sessionInitialized', handleSessionInitialized as EventListener);
    };
  }, []);

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

  return (
    <WalletProvider>
      <main className="relative min-h-screen overflow-hidden select-none touch-none">
        <div className="relative min-h-screen select-none touch-none">
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

          <SecureVoiceManager
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
    </WalletProvider>
  );
} 