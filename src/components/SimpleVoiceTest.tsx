'use client';

import { useState, useEffect } from 'react';
import { useOptimizedVoiceProcessing } from '@/hooks/useOptimizedVoiceProcessing';

interface SimpleVoiceTestProps {
  sessionId: string;
}

export default function SimpleVoiceTest({ sessionId }: SimpleVoiceTestProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [testMessage, setTestMessage] = useState('Hello, this is a test message');
  
  const voiceProcessing = useOptimizedVoiceProcessing(sessionId);

  useEffect(() => {
    if (sessionId) {
      setIsInitialized(true);
    }
  }, [sessionId]);

  const handleStartListening = async () => {
    try {
      console.log('🎤 Starting listening...');
      await voiceProcessing.startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const handleStopListening = () => {
    console.log('🛑 Stopping listening...');
    voiceProcessing.stopListening();
  };

  const handleSendMessage = () => {
    console.log('💬 Sending message:', testMessage);
    voiceProcessing.sendMessage(testMessage, sessionId);
  };

  const handleTestTTS = async () => {
    try {
      console.log('🎤 Testing TTS...');
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
        console.log('✅ TTS audio played');
      } else {
        console.error('❌ TTS failed');
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  if (!isInitialized) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p>Waiting for session initialization...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4">Voice Test</h2>
      
      {/* Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Supported: <span className={voiceProcessing.isSupported ? 'text-green-600' : 'text-red-600'}>{voiceProcessing.isSupported ? 'Yes' : 'No'}</span></div>
          <div>Listening: <span className={voiceProcessing.isListening ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isListening ? 'Yes' : 'No'}</span></div>
          <div>Speaking: <span className={voiceProcessing.isSpeaking ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isSpeaking ? 'Yes' : 'No'}</span></div>
          <div>Processing: <span className={voiceProcessing.isProcessing ? 'text-green-600' : 'text-gray-600'}>{voiceProcessing.isProcessing ? 'Yes' : 'No'}</span></div>
        </div>
        {voiceProcessing.error && (
          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
            Error: {voiceProcessing.error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Test Message:</label>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStartListening}
            disabled={voiceProcessing.isListening}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            Start Listening
          </button>
          <button
            onClick={handleStopListening}
            disabled={!voiceProcessing.isListening}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
          >
            Stop Listening
          </button>
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
        </div>
      </div>

      {/* Transcript */}
      {voiceProcessing.transcript && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h3 className="font-medium mb-2">Transcript:</h3>
          <p className="text-gray-700">{voiceProcessing.transcript}</p>
        </div>
      )}
    </div>
  );
} 