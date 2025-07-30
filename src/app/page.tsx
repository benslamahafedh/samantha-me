'use client';

import { useState, useEffect, useCallback } from 'react';
import VoiceVisualization from '@/components/VoiceVisualization';
import VoiceManager from '@/components/VoiceManager';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('Initializing session...');
        
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
          console.log('Session initialized:', data.sessionId.substring(0, 8) + '...');
        } else {
          throw new Error(data.error || 'Session creation failed');
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Failed to initialize session. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSession();
  }, []);

  const handleStartConversation = useCallback(() => {
    if (error) {
      setError(null);
    }
    setTranscript(''); // Clear previous transcript
    setHasStarted(true);
    window.dispatchEvent(new Event('startListening'));
  }, [error]);

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleError = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  const handleProcessingChange = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript);
  }, []);

  // Set ready state when session is available
  useEffect(() => {
    if (sessionId && !isReady) {
      setIsReady(true);
    }
  }, [sessionId, isReady]);

  // Show loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold mb-2">Initializing Samantha</h1>
          <p className="text-gray-300">Setting up your voice assistant...</p>
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
          transcript={transcript}
          error={error}
          hasStarted={hasStarted}
          isReady={isReady}
          isIntroComplete={isIntroComplete}
          onIntroComplete={handleIntroComplete}
          onStartConversation={handleStartConversation}
        />

        {/* Voice Manager */}
        {sessionId && (
          <VoiceManager
            sessionId={sessionId}
            onSpeakingChange={setIsSpeaking}
            onListeningChange={setIsListening}
            onProcessingChange={handleProcessingChange}
            onTranscriptChange={handleTranscriptChange}
            onError={handleError}
          />
        )}
      </div>
    </main>
  );
} 