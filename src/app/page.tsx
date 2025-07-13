'use client';

import { useState } from 'react';
import VoiceManager from '@/components/VoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';

export default function Home() {
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60);
  const [sessionEnded, setSessionEnded] = useState(false);

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
    setIsIntroComplete(true);
  };

  const handleSessionTimeChange = (timeLeft: number) => {
    console.log('📱 PAGE: Received timer update:', timeLeft);
    setSessionTimeLeft(timeLeft);
  };

  const handleSessionEndedChange = (ended: boolean) => {
    setSessionEnded(ended);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Only initialize VoiceManager AFTER intro is complete */}
      {isIntroComplete && (
        <VoiceManager
          onTranscriptChange={handleTranscriptChange}
          onSpeakingChange={handleSpeakingChange}
          onListeningChange={handleListeningChange}
          onError={handleError}
          onHasStartedChange={handleHasStartedChange}
          onIsReadyChange={handleIsReadyChange}
          onSessionTimeChange={handleSessionTimeChange}
          onSessionEndedChange={handleSessionEndedChange}
        />
      )}
      
      {/* Voice Visualization - handles the UI */}
      <VoiceVisualization
        isListening={isListening}
        isSpeaking={isSpeaking}
        transcript={transcript}
        error={error}
        hasStarted={hasStarted}
        isReady={isReady}
        isIntroComplete={isIntroComplete}
        onIntroComplete={handleIntroComplete}
        sessionTimeLeft={sessionTimeLeft}
        sessionEnded={sessionEnded}
      />
    </main>
  );
}
