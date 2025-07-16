'use client';

import { useState, useEffect } from 'react';
import { getSessionManager } from '@/lib/sessionManager';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

export default function TestSimple() {
  type SessionInfo = {
    canStart: boolean;
    remaining: number;
    data: unknown;
  };
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const speechRecognition = useSpeechRecognition();
  const textToSpeech = useTextToSpeech();

  useEffect(() => {
    const sessionManager = getSessionManager();
    
    // Set up timer listener
    sessionManager.onTimeUpdate((time) => {
      console.log('⏰ Timer update:', time);
      setTimeLeft(time);
    });
    
    // Update session info every second
    const interval = setInterval(() => {
      setSessionInfo({
        canStart: sessionManager.canStartSession(),
        remaining: sessionManager.getRemainingFreeTime(),
        data: sessionManager.getSessionData()
      });
    }, 1000);
    
    return () => {
      clearInterval(interval);
      sessionManager.destroy();
    };
  }, []);

  const startSession = () => {
    console.log('🚀 Starting session manually');
    const sessionManager = getSessionManager();
    const result = sessionManager.startSession();
    console.log('📊 Session start result:', result);
  };

  const testVoice = () => {
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.startListening();
    }
  };

  const testTTS = () => {
    textToSpeech.speak("Hello, this is a test. Can you hear me clearly?");
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Simple Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Session Test */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Session Test</h2>
          
          <div className="space-y-4">
            <button 
              onClick={startSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Start Session
            </button>
            
            <div className="text-2xl font-bold text-center">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            
            {sessionInfo && (
              <div className="text-sm space-y-2">
                <div>Can Start: {sessionInfo.canStart ? '✅' : '❌'}</div>
                <div>Remaining: {sessionInfo.remaining}s</div>
                <div>Has Data: {sessionInfo.data ? '✅' : '❌'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Recognition Test */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Voice Recognition</h2>
          
          <div className="space-y-4">
            <button 
              onClick={testVoice}
              className={`w-full px-4 py-2 rounded ${
                speechRecognition.isListening 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {speechRecognition.isListening ? '🛑 Stop' : '🎤 Start'} Listening
            </button>
            
            <div className="text-sm space-y-2">
              <div>Supported: {speechRecognition.isSupported ? '✅' : '❌'}</div>
              <div>Listening: {speechRecognition.isListening ? '🎤' : '🔇'}</div>
              {speechRecognition.error && (
                <div className="text-red-400">Error: {speechRecognition.error}</div>
              )}
            </div>
            
            {speechRecognition.transcript && (
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-sm text-gray-300">Transcript:</div>
                <div>{speechRecognition.transcript}</div>
              </div>
            )}
          </div>
        </div>

        {/* Text-to-Speech Test */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Text-to-Speech</h2>
          
          <div className="space-y-4">
            <button 
              onClick={testTTS}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              🗣️ Test TTS
            </button>
            
            <div className="text-sm space-y-2">
              <div>Supported: {textToSpeech.isSupported ? '✅' : '❌'}</div>
              <div>Speaking: {textToSpeech.isSpeaking ? '🗣️' : '🔇'}</div>
              {textToSpeech.error && (
                <div className="text-red-400">Error: {textToSpeech.error}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <div className="text-sm space-y-2">
          <p>1. Open browser console (F12) to see detailed logs</p>
          <p>2. Click &quot;Start Session&quot; - timer should start counting down</p>
          <p>3. Click &quot;Start Listening&quot; - should show microphone permission prompt</p>
          <p>4. Click &quot;Test TTS&quot; - should hear Samantha&apos;s voice</p>
          <p>5. If everything works here, the main app should work too</p>
        </div>
      </div>
    </div>
  );
} 