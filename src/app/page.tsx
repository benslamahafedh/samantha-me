'use client';

import { useState, useCallback, useEffect } from 'react';
import OptimizedVoiceManager from '@/components/OptimizedVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import VoiceErrorDisplay from '@/components/VoiceErrorDisplay';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('🚀 Initializing session...');
        
        // Try to get existing session from localStorage
        const existingSessionId = localStorage.getItem('samantha_session_id');
        
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: existingSessionId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create session');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setSessionId(data.sessionId);
          localStorage.setItem('samantha_session_id', data.sessionId);
          console.log('✅ Session initialized:', data.sessionId.substring(0, 8) + '...');
        } else {
          throw new Error(data.error || 'Session creation failed');
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setVoiceError('Failed to initialize session. Please refresh the page.');
      } finally {
        setIsLoading(false);
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

  const handleHasStartedChange = (started: boolean) => {
    setHasStarted(started);
  };

  const handleIsReadyChange = (ready: boolean) => {
    setIsReady(ready);
  };

  const handleSessionEndedChange = (sessionEnded: boolean) => {
    setSessionEnded(sessionEnded);
  };

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleStartConversation = useCallback(() => {
    const event = new Event('startConversation');
    window.dispatchEvent(event);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden select-none touch-none gradient-rose-pink">
        <div className="relative min-h-screen select-none touch-none flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="animate-pulse text-4xl mb-6">💬</div>
            <div className="text-xl mb-4 font-medium">Initializing Samantha...</div>
            <div className="text-sm text-gray-300 mb-6">
              Setting up voice assistant
            </div>
            <div className="mt-8">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
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
            onSessionEndedChange={handleSessionEndedChange}
            onRequirePayment={() => {
              // No payment required - just end session
              setSessionEnded(true);
            }}
            onAccessStatusChange={() => {
              // No access status changes needed
            }}
            sessionId={sessionId}
            onVoiceError={setVoiceError}
          />
        </div>

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