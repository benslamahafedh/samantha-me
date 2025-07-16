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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const conversationHistoryRef = useRef<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const isProcessingRef = useRef<boolean>(false);
  const lastProcessedTranscriptRef = useRef<string>('');
  const consecutiveSilentChunksRef = useRef<number>(0);
  const lastProcessingTimeRef = useRef<number>(0);
  const lastResponseRef = useRef<string>('');
  const MAX_SILENT_CHUNKS = 3;
  const PROCESSING_COOLDOWN = 2000; // 2 seconds between processing

  // Helper function to check if text is meaningful
  const isMeaningfulSpeech = useCallback((text: string): boolean => {
    if (!text || text.trim().length < 3) return false;
    
    const cleanText = text.trim().toLowerCase();
    
    // Filter out common noise/background words
    const noiseWords = [
      'um', 'uh', 'hmm', 'ah', 'er', 'silence', 'noise', 'you', 'yeah', 'okay', 'so', 'like',
      'background', 'static', 'feedback', 'echo', 'breathing', 'sigh', 'cough', 'clear throat'
    ];
    
    // If it's just noise words, reject it
    if (noiseWords.some(word => cleanText.includes(word)) && cleanText.length < 10) {
      return false;
    }
    
    // Reject if it's the same as last processed transcript
    if (cleanText === lastProcessedTranscriptRef.current.toLowerCase()) {
      return false;
    }
    
    // Must have at least 2 different words
    const words = cleanText.split(/\s+/).filter(word => word.length > 1);
    if (words.length < 2) {
      return false;
    }
    
    return true;
  }, []);

  const isSupported = typeof window !== 'undefined' && 
    'WebSocket' in window && 
    'MediaRecorder' in window;

  // Initialize connection
  const initializeWebSocket = useCallback(async () => {
    if (!isSupported) {
      setError('Voice features not supported in this browser');
      return;
    }

    try {
      const apiKeyResponse = await fetch('/api/get-api-key');
      const { apiKey } = await apiKeyResponse.json();
      
      if (!apiKey) {
        throw new Error('API key not available');
      }

      setIsConnected(true);
      setError(null);
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
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    speechSynthesis.speak(utterance);
  }, []);

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
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Use MediaRecorder for better browser compatibility
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
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
        if (audioChunks.length === 0) {
          consecutiveSilentChunksRef.current += 1;
          return;
        }
        
        try {
          // Combine all audio chunks
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Only process if we have substantial audio (> 1.5 seconds)
          const recordingDuration = Date.now() - recordingStartTime;
          if (recordingDuration < 1500) {
            consecutiveSilentChunksRef.current += 1;
            return;
          }
          
          // Check if we've had too many silent chunks
          if (consecutiveSilentChunksRef.current >= MAX_SILENT_CHUNKS) {
            console.log('🔇 Too many silent chunks, skipping processing');
            return;
          }
          
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
          
          console.log('🎤 Transcribed:', transcribedText);
          
          // Check if this is meaningful speech
          if (transcribedText && isMeaningfulSpeech(transcribedText)) {
            console.log('✅ Meaningful speech detected, processing...');
            
            // Check cooldown
            const timeSinceLastProcessing = Date.now() - lastProcessingTimeRef.current;
            if (timeSinceLastProcessing < PROCESSING_COOLDOWN) {
              console.log('⏸️ Processing cooldown active, skipping...');
              return;
            }
            
            consecutiveSilentChunksRef.current = 0;
            lastProcessedTranscriptRef.current = transcribedText;
            lastProcessingTimeRef.current = Date.now();
            setTranscript(transcribedText);
            
            // Add to conversation history
            conversationHistoryRef.current.push({
              role: 'user',
              content: transcribedText
            });
            
            // Process with GPT-4 (only if not already processing)
            if (!isProcessingRef.current) {
              setIsProcessing(true);
              isProcessingRef.current = true;
              
              try {
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
                
                // Check if this is a duplicate response
                if (data.response === lastResponseRef.current) {
                  console.log('🔄 Duplicate response detected, skipping...');
                  return;
                }
                
                lastResponseRef.current = data.response;
                
                conversationHistoryRef.current.push({
                  role: 'assistant',
                  content: data.response
                });
                
                speakResponse(data.response);
                
              } catch {
                setError('Failed to process your message');
                speakResponse("I'm having trouble understanding. Could you try again?");
              } finally {
                setIsProcessing(false);
                isProcessingRef.current = false;
              }
            }
          } else {
            console.log('🔇 Not meaningful speech, skipping processing');
            consecutiveSilentChunksRef.current += 1;
          }
          
        } catch {
          console.error('Audio processing error');
          setError('Failed to process voice input');
          consecutiveSilentChunksRef.current += 1;
        }
        
        // Clear chunks for next recording
        audioChunks.length = 0;
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording in chunks (3 seconds each)
      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      
      // Auto-stop after 3 seconds to get chunks
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 3000);
      
    } catch {
      console.error('Failed to start listening');
      setError('Failed to start voice recognition');
    }
  }, [isListening, isConnected, initializeWebSocket, isMeaningfulSpeech, MAX_SILENT_CHUNKS, PROCESSING_COOLDOWN, lastProcessingTimeRef, lastResponseRef, setIsProcessing, setTranscript, setError, setIsListening, setIsSpeaking, speakResponse, conversationHistoryRef, isProcessingRef]);

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
    lastProcessedTranscriptRef.current = '';
    consecutiveSilentChunksRef.current = 0;
    lastProcessingTimeRef.current = 0;
    lastResponseRef.current = '';
  }, [setTranscript]);

  // Send a text message (for manual input)
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    setTranscript(message);
    
    // Inline the processing to avoid function dependency
    if (isProcessingRef.current) return;
    
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    try {
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
      
      conversationHistoryRef.current.push({
        role: 'assistant',
        content: data.response
      });
      
      speakResponse(data.response);
      
    } catch {
      setError('Failed to process your message');
      speakResponse("I'm having trouble understanding. Could you try again?");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [setTranscript, isProcessingRef, setIsProcessing, conversationHistoryRef, speakResponse, setError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [mediaRecorderRef]);

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