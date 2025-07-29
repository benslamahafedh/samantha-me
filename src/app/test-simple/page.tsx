'use client';

import { useState, useEffect } from 'react';
import { useOptimizedVoiceProcessing } from '@/hooks/useOptimizedVoiceProcessing';
import SimpleVoiceTest from '@/components/SimpleVoiceTest';

export default function TestSimple() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello, this is a test message');

  const voiceProcessing = useOptimizedVoiceProcessing(sessionId);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: null })
        });
        
        const data = await response.json();
        if (data.success) {
          setSessionId(data.sessionId);
          setIsInitialized(true);
          console.log('✅ Session initialized:', data.sessionId.substring(0, 8) + '...');
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };

    initSession();
  }, []);

  const handleStartListening = async () => {
    try {
      await voiceProcessing.startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const handleStopListening = () => {
    voiceProcessing.stopListening();
  };

  const handleSendMessage = () => {
    voiceProcessing.sendMessage(testMessage, sessionId);
  };

  const handleTestTTS = async () => {
    try {
      const response = await fetch('/api/tts-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testMessage })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error('TTS test failed:', error);
    }
  };

  const handleTestChat = async () => {
    try {
      const response = await fetch('/api/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: testMessage,
          sessionId: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Chat response:', data.response);
        setTestMessage(data.response);
      }
    } catch (error) {
      console.error('Chat test failed:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Samantha Voice Assistant Test</h1>
        
        {/* Voice Test Component */}
        <div className="mb-8">
          <SimpleVoiceTest sessionId={sessionId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Session ID: <span className="font-mono">{sessionId.substring(0, 8)}...</span></div>
              <div>Supported: <span className={voiceProcessing.isSupported ? 'text-green-600' : 'text-red-600'}>{voiceProcessing.isSupported ? 'Yes' : 'No'}</span></div>
              <div>Listening: <span className={voiceProcessing.isListening ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isListening ? 'Yes' : 'No'}</span></div>
              <div>Speaking: <span className={voiceProcessing.isSpeaking ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isSpeaking ? 'Yes' : 'No'}</span></div>
              <div>Processing: <span className={voiceProcessing.isProcessing ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isProcessing ? 'Yes' : 'No'}</span></div>
              <div>Muted: <span className={voiceProcessing.isMuted ? 'text-red-600' : 'text-green-600'}>{voiceProcessing.isMuted ? 'Yes' : 'No'}</span></div>
            </div>
            {voiceProcessing.error && (
              <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
                Error: {voiceProcessing.error}
              </div>
            )}
          </div>

          {/* Test Message */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Message</h2>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Send Message
              </button>
              <button
                onClick={handleTestTTS}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Test TTS
              </button>
              <button
                onClick={handleTestChat}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Test Chat
              </button>
            </div>
          </div>
        </div>

        {/* Transcript */}
        {voiceProcessing.transcript && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Transcript</h2>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-700">{voiceProcessing.transcript}</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Open browser console (F12) to see detailed logs</p>
            <p>2. Click "Start Listening" to test voice recording</p>
            <p>3. Click "Test TTS" to test text-to-speech</p>
            <p>4. Click "Send Message" to test chat processing</p>
            <p>5. Check the status indicators to see what's working</p>
            <p>6. If everything works here, the main app should work too</p>
          </div>
        </div>
      </div>
    </div>
  );
} 