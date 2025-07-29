'use client';

import { useState, useEffect } from 'react';
import { getSessionManager } from '@/lib/sessionManager';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

export default function Debug() {
  type SessionInfo = {
    data: unknown;
    remaining: number;
    canStart: boolean;
    timestamp: string;
  };
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const speechRecognition = useSpeechRecognition();

  useEffect(() => {
    console.log('🐛 Debug page mounted');
    
    const sessionManager = getSessionManager();
    
    // Get initial session info
    const updateSessionInfo = () => {
      const sessionInfo = sessionManager.getSessionInfo();
      const remaining = sessionManager.getRemainingFreeTime();
      const canStart = sessionManager.canStartSession();
      
      setSessionInfo({
        data: sessionInfo,
        remaining,
        canStart,
        timestamp: new Date().toLocaleTimeString()
      });
      
      console.log('📊 Session info updated:', { sessionInfo, remaining, canStart });
    };
    
    updateSessionInfo();
    
    // Update session info every 2 seconds
    const interval = setInterval(updateSessionInfo, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const startSession = () => {
    console.log('🎯 Starting session manually...');
    const sessionManager = getSessionManager();
    const result = sessionManager.startSession();
    console.log('📊 Start session result:', result);
  };

  const testSpeechRecognition = () => {
    console.log('🎤 Testing speech recognition...');
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.startListening();
    }
  };

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Info */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Session Manager</h2>
          <button 
            onClick={startSession}
            className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
          >
            Start Session
          </button>
          
          {sessionInfo && (
            <div className="space-y-2 text-sm">
              <div>
                <strong>Can Start:</strong> {sessionInfo.canStart ? '✅' : '❌'}
              </div>
              <div>
                <strong>Remaining Time:</strong> {sessionInfo.remaining}s
              </div>
              <div>
                <strong>Last Updated:</strong> {sessionInfo.timestamp}
              </div>
              <div>
                <strong>Session Data:</strong>
                <pre className="bg-gray-700 p-2 rounded mt-1 text-xs overflow-auto">
                  {JSON.stringify(sessionInfo.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Session Timer */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Session Timer</h2>
          {sessionInfo ? (
            <div className="space-y-2 text-sm">
              <div>
                <strong>Time Left:</strong> {sessionInfo.remaining}s
              </div>
              <div>
                <strong>Last Update:</strong> {sessionInfo.timestamp}
              </div>
              <div className={`text-2xl font-bold ${sessionInfo.remaining <= 30 ? 'text-red-400' : 'text-green-400'}`}>
                {Math.floor(sessionInfo.remaining / 60)}:{(sessionInfo.remaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">No session data yet</div>
          )}
        </div>

        {/* Speech Recognition */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Speech Recognition</h2>
          <button 
            onClick={testSpeechRecognition}
            className={`px-4 py-2 rounded mb-4 ${
              speechRecognition.isListening 
                ? 'bg-red-600 text-white' 
                : 'bg-green-600 text-white'
            }`}
          >
            {speechRecognition.isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          
          <div className="space-y-2 text-sm">
            <div>
              <strong>Supported:</strong> {speechRecognition.isSupported ? '✅' : '❌'}
            </div>
            <div>
              {/* <strong>Listening:</strong> {speechRecognition.isListening ? '🎤' : '🔇'} */}
            </div>
            {speechRecognition.error && (
              <div className="text-red-400">
                <strong>Error:</strong> {speechRecognition.error}
              </div>
            )}
            {speechRecognition.transcript && (
              <div>
                <strong>Transcript:</strong>
                <div className="bg-gray-700 p-2 rounded mt-1">
                  {speechRecognition.transcript}
                </div>
              </div>
            )}
            {speechRecognition.interimTranscript && (
              <div>
                <strong>Interim:</strong>
                <div className="bg-gray-700 p-2 rounded mt-1 text-gray-300">
                  {speechRecognition.interimTranscript}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <div className="text-sm space-y-2">
            <p>1. Open browser console (F12) to see detailed logs</p>
            <p>2. Click &quot;Start Session&quot; to test session manager</p>
            <p>3. Click &quot;Start Listening&quot; to test speech recognition</p>
            <p>4. Check if timer starts counting down after starting session</p>
            <p>5. Check if microphone permission is granted</p>
          </div>
        </div>
      </div>
    </div>
  );
} 