'use client';

import { useState, useEffect, useCallback } from 'react';
import VoiceManagerRealtime from '@/components/VoiceManagerRealtimeClean';
import VoiceVisualization from '@/components/VoiceVisualization';
import PaymentModal from '@/components/PaymentModal';

import { getSessionManager } from '@/lib/sessionManager';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(180); // 3 minutes
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [manualStartListening, setManualStartListening] = useState<(() => void) | null>(null);

  // Check initial session state and set up timer updates
  useEffect(() => {
    console.log('📱 PAGE: Setting up session manager...');
    const sessionManager = getSessionManager();
    const sessionData = sessionManager.getSessionData();
    
    console.log('📱 PAGE: Initial session data:', sessionData);
    
    if (sessionData) {
      // Check if user has already used their free time
      if (!sessionData.isPaid && sessionData.totalTimeUsed >= 180) {
        // Block access and redirect to session-ended page immediately
        setIsBlocked(true);
        console.log('🚫 User has exceeded free time - redirecting to session-ended page');
        window.location.href = '/session-ended';
        return;
      } else {
        const remaining = sessionManager.getRemainingFreeTime();
        console.log('📱 PAGE: Setting initial time left:', remaining);
        setSessionTimeLeft(remaining);
        
        // Double-check remaining time isn't negative or zero
        if (remaining <= 0 && !sessionData.isPaid) {
          setIsBlocked(true);
          window.location.href = '/session-ended';
          return;
        }
      }
    } else {
      console.log('📱 PAGE: No existing session data, starting fresh');
      setSessionTimeLeft(180); // Reset to 3 minutes
    }

    // Set up timer listener
    const handleTimeUpdate = (timeLeft: number) => {
      console.log('📱 PAGE: Direct timer update from session manager:', timeLeft);
      setSessionTimeLeft(timeLeft);
    };

    const handleSessionEnd = () => {
      console.log('📱 PAGE: Direct session end from session manager - redirecting');
      // Immediately redirect to session-ended page instead of showing modal
      window.location.href = '/session-ended';
    };

    sessionManager.onTimeUpdate(handleTimeUpdate);
    sessionManager.onSessionEnd(handleSessionEnd);

    return () => {
      // Note: SessionManager doesn't have removeListener methods, 
      // but it's destroyed when component unmounts
      console.log('📱 PAGE: Cleaning up session manager listeners');
    };
  }, []);

  const handleTranscriptChange = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const handleListeningChange = (listening: boolean) => {
    setIsListening(listening);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleHasStartedChange = (started: boolean) => {
    setHasStarted(started);
  };

  const handleIsReadyChange = (ready: boolean) => {
    setIsReady(ready);
  };

  const handleIntroComplete = () => {
    console.log('🎬 Intro completed, showing orbit for manual start');
    setIsIntroComplete(true);
    // NO AUTO-START - Wait for user to click the orbit
  };

  const handleSessionTimeChange = (timeLeft: number) => {
    console.log('📱 PAGE: Received timer update:', timeLeft);
    setSessionTimeLeft(timeLeft);
  };

  const handleSessionEndedChange = (ended: boolean) => {
    console.log('📱 PAGE: Session ended:', ended);
    setSessionEnded(ended);
  };

  const handleRequirePayment = () => {
    setShowPaymentModal(true);
  };

  const handleManualStartListening = useCallback((startFn: () => void) => {
    setManualStartListening(() => startFn);
  }, []);

  // SIMPLIFIED MANUAL START - Called when user clicks orbit
  const handleStartConversation = () => {
    console.log('🌟 USER CLICKED ORBIT - Starting conversation');
    
    const sessionManager = getSessionManager();
    
    if (!sessionManager.canStartSession()) {
      console.log('❌ Cannot start session - showing payment modal');
      setShowPaymentModal(true);
      return;
    }

    console.log('💫 Triggering voice conversation start');
    
    // Don't start session here - let VoiceManager handle it
    // Just trigger the voice conversation event
    console.log('🎤 Dispatching startConversation event');
    const event = new Event('startConversation');
    window.dispatchEvent(event);
  };

  const handlePaymentSuccess = () => {
    // Reset session state for unlimited access
    setSessionEnded(false);
    setSessionTimeLeft(Infinity);
    setShowPaymentModal(false);
    
    // Reload to restart the assistant
    window.location.reload();
  };

  return (
    <main className="min-h-screen gradient-rose-pink relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {!isBlocked ? (
          <>
            <VoiceVisualization
              isListening={isListening}
              isSpeaking={isSpeaking}
              transcript={transcript}
              error={error}
              hasStarted={hasStarted}
              isReady={isReady}
              isIntroComplete={isIntroComplete}
              onIntroComplete={handleIntroComplete}
              onStartConversation={handleStartConversation}
              sessionTimeLeft={sessionTimeLeft}
              sessionEnded={sessionEnded}
            />
            
                    <VoiceManagerRealtime
          onTranscriptChange={handleTranscriptChange}
          onSpeakingChange={handleSpeakingChange}
          onListeningChange={handleListeningChange}
          onError={handleError}
          onHasStartedChange={handleHasStartedChange}
          onIsReadyChange={handleIsReadyChange}
          onSessionTimeChange={handleSessionTimeChange}
          onSessionEndedChange={handleSessionEndedChange}
          onRequirePayment={handleRequirePayment}
          onManualStartListening={handleManualStartListening}
        />
          </>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
              <p>Redirecting to session page...</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Session timer display */}
      {hasStarted && !sessionEnded && sessionTimeLeft !== Infinity && (
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




    </main>
  );
}
