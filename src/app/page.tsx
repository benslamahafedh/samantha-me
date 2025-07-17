'use client';

import { useState, useCallback, useEffect } from 'react';
import SecureVoiceManager from '@/components/SecureVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import PaymentModal from '@/components/PaymentModal';
import WalletProvider from '@/components/WalletProvider';

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
          console.log('Microphone access granted on iOS');
        })
        .catch((err) => {
          console.log('Microphone access not granted:', err);
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
    setSessionTimeLeft(timeLeft);
  };

  const handleSessionEndedChange = (sessionEnded: boolean) => {
    setSessionEnded(sessionEnded);
  };

  const handleRequirePayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSessionEnded(false);
    // The SecureVoiceManager will automatically detect the payment and update access
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
          
          <SecureVoiceManager
            onSpeakingChange={setIsSpeaking}
            onListeningChange={setIsListening}
            onHasStartedChange={handleHasStartedChange}
            onIsReadyChange={handleIsReadyChange}
            onSessionTimeChange={handleSessionTimeChange}
            onSessionEndedChange={handleSessionEndedChange}
            onRequirePayment={handleRequirePayment}
            onAccessStatusChange={handleAccessStatusChange}
          />
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Session timer display - only for trial users */}
        {hasStarted && !sessionEnded && isTrialActive && sessionTimeLeft < 999999 && sessionTimeLeft > 0 && (
          <div className="fixed top-4 right-4 z-20">
            <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${sessionTimeLeft <= 30 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-white/80 text-sm font-light">
                  {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unlimited access indicator for paid users */}
        {hasStarted && !sessionEnded && hasWalletAccess && (
          <div className="fixed top-4 right-4 z-20">
            <div className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-rose-500/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                <span className="text-rose-200 text-sm font-light">
                  Unlimited
                </span>
              </div>
            </div>
          </div>
        )}


      </main>
    </WalletProvider>
  );
} 