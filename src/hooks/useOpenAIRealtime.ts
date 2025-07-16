import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOpenAIRealtimeReturn {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  isProcessing: boolean;
  error: string | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  sendMessage: (message: string) => Promise<void>;
}

export const useOpenAIRealtime = (): UseOpenAIRealtimeReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isProcessingRef = useRef(false);

  // Check if WebSocket and MediaRecorder are supported
  useEffect(() => {
    setIsSupported(!!window.WebSocket && !!window.MediaRecorder);
  }, []);

  // Speak response using browser TTS
  const speakResponse = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;
    
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setError('Failed to speak response');
    };
    
    window.speechSynthesis.speak(utterance);
  }, [setIsSpeaking, setError]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported || isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Handle audio data
          console.log('🎤 Audio data received');
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      
    } catch {
      console.error('Failed to start listening');
      setError('Failed to start voice recognition');
    }
  }, [isSupported, isListening, setIsListening, setError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, [setIsListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, [setTranscript]);

  // Send a text message (for manual input)
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    console.log('💬 Sending message:', message);
    setTranscript(message);
    
    // Inline the processing to avoid function dependency
    if (isProcessingRef.current) return;
    
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    try {
      console.log('🧠 Processing with GPT-4:', message);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: conversationHistoryRef.current.slice(-10)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from API');
      }

      const data = await response.json();
      console.log('✅ GPT Response:', data.response);
      
      conversationHistoryRef.current.push({
        role: 'assistant',
        content: data.response
      });
      
      speakResponse(data.response);
      
    } catch (err) {
      console.error('❌ Error processing with GPT:', err);
      setError('Failed to process your message');
      speakResponse("I'm having trouble understanding. Could you try again?");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, []); // No dependencies to prevent recreation

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup logic without depending on stopListening function
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array for cleanup

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    isProcessing,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    sendMessage
  };
}; 