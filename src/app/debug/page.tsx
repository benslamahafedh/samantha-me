'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Hello, this is a test');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Test session creation
  const testSession = async () => {
    try {
      addLog('🔄 Testing session creation...');
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: null })
      });
      
      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        addLog(`✅ Session created: ${data.sessionId.substring(0, 8)}...`);
      } else {
        addLog(`❌ Session creation failed: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ Session creation error: ${error}`);
    }
  };

  // Test TTS
  const testTTS = async () => {
    try {
      addLog('🔄 Testing TTS...');
      const response = await fetch('/api/tts-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testMessage })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        addLog(`✅ TTS successful, audio size: ${audioBlob.size} bytes`);
        
        // Play the audio
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        addLog('🎵 Playing TTS audio...');
      } else {
        const errorData = await response.json();
        addLog(`❌ TTS failed: ${errorData.error}`);
      }
    } catch (error) {
      addLog(`❌ TTS error: ${error}`);
    }
  };

  // Test chat
  const testChat = async () => {
    if (!sessionId) {
      addLog('❌ No session ID available');
      return;
    }

    try {
      addLog('🔄 Testing chat...');
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
        addLog(`✅ Chat successful: ${data.response}`);
        setTestMessage(data.response);
      } else {
        const errorData = await response.json();
        addLog(`❌ Chat failed: ${errorData.error}`);
      }
    } catch (error) {
      addLog(`❌ Chat error: ${error}`);
    }
  };

  // Test microphone access
  const testMicrophone = async () => {
    try {
      addLog('🔄 Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog('✅ Microphone access granted');
      
      // Test MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      addLog('✅ MediaRecorder created successfully');
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      addLog('✅ Microphone test completed');
    } catch (error) {
      addLog(`❌ Microphone error: ${error}`);
    }
  };

  // Test audio context
  const testAudioContext = async () => {
    try {
      addLog('🔄 Testing AudioContext...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      addLog(`✅ AudioContext created, state: ${audioContext.state}`);
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        addLog('✅ AudioContext resumed');
      }
      
      audioContext.close();
      addLog('✅ AudioContext test completed');
    } catch (error) {
      addLog(`❌ AudioContext error: ${error}`);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Samantha Voice Assistant Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
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
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={testSession}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Test Session
                </button>
                <button
                  onClick={testTTS}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Test TTS
                </button>
                <button
                  onClick={testChat}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Test Chat
                </button>
                <button
                  onClick={testMicrophone}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Test Microphone
                </button>
                <button
                  onClick={testAudioContext}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Test AudioContext
                </button>
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Run some tests to see output.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Session Info */}
        {sessionId && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Session Info</h2>
            <div className="bg-gray-50 p-4 rounded">
              <div className="font-mono text-sm">
                Session ID: {sessionId}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 