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

  // Initialize WebSocket connection to OpenAI Realtime API
  const initializeWebSocket = useCallback(async () => {
    if (!isSupported) return;

    try {
      const response = await fetch('/api/get-api-key');
      if (!response.ok) {
        throw new Error('Failed to get API key');
      }
      const { apiKey } = await response.json();

      const ws = new WebSocket('wss://api.openai.com/v1/audio/speech');
      
      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message:', data);
        } catch {
          console.log('📨 WebSocket binary data received');
        }
      };

      ws.onerror = () => {
        console.error('❌ WebSocket error');
        setError('Connection failed');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch {
      console.error('Failed to initialize WebSocket');
      setError('Failed to connect to voice service');
    }
  }, [isSupported]);

  // Speak response using browser TTS (keeping existing TTS for now)
  const speakResponse = useCallback((text: string) => {
    if (!text.trim()) return;
    
    setIsSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    // Try to find a good female voice
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.toLowerCase().includes('female') || 
       voice.name.toLowerCase().includes('samantha') ||
       voice.name.toLowerCase().includes('karen'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Resume listening after speaking - use refs to avoid dependency issues
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
  }, []); // Remove dependencies to prevent recreation

  // Initialize audio recording using browser-compatible approach
  const startListening = useCallback(async () => {
    if (isListening) {
      return;
    }

    // Initialize connection if needed
    if (!isConnected) {
      await initializeWebSocket();
    }

    try {
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100, // Use standard sample rate for browser compatibility
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Use MediaRecorder for better browser compatibility
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus', // Widely supported format
        audioBitsPerSecond: 128000
      });
      
      const audioChunks: Blob[] = [];
      const recordingStartTime = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 Audio recording stopped, processing...');
        
        if (audioChunks.length === 0) {
          console.log('⚠️ No audio data recorded');
          return;
        }
        
        try {
          // Combine all audio chunks
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Only process if we have substantial audio (> 1 second)
          const recordingDuration = Date.now() - recordingStartTime;
          if (recordingDuration < 1000) {
            console.log('⚠️ Recording too short, ignoring');
            return;
          }
          
          console.log('🔄 Sending audio to Whisper for transcription...');
          
          // Send to Whisper API for transcription
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Transcription failed');
          }
          
          const transcriptionData = await response.json();
          const transcribedText = transcriptionData.text?.trim();
          
          if (transcribedText && transcribedText.length > 2) {
            console.log('✅ Transcription received:', transcribedText);
            setTranscript(transcribedText);
            
            // Add to conversation history
            conversationHistoryRef.current.push({
              role: 'user',
              content: transcribedText
            });
            
            // Process with GPT-4
            if (!isProcessingRef.current) {
              setIsProcessing(true);
              isProcessingRef.current = true;
              
              try {
                console.log('🧠 Processing with GPT-4:', transcribedText);
                
                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: transcribedText,
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
            }
          } else {
            console.log('⚠️ No usable transcription received');
          }
          
        } catch (err) {
          console.error('❌ Failed to process audio:', err);
          setError('Failed to process voice input');
        }
        
        // Clear chunks for next recording
        audioChunks.length = 0;
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording in chunks (3 seconds each)
      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      
      console.log('✅ Voice recording started (browser-compatible mode)');
      
      // Auto-stop after 3 seconds to get chunks
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 3000);
      
    } catch (err) {
      console.error('❌ Failed to start voice recording:', err);
      setError('Failed to access microphone');
    }
  }, [isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping audio recording');
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Signal end of audio input
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.end'
      }));
    }
    
    setIsListening(false);
  }, []);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    currentTranscriptRef.current = '';
  }, []);

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