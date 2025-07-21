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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const PROCESSING_COOLDOWN = 100; // 0.1 seconds between processing for ultra-responsive conversation
  const MIN_AUDIO_LEVEL = 0.01; // Minimum audio level threshold

  // Helper function to check if text is meaningful - much more permissive for natural conversation
  const isMeaningfulSpeech = useCallback((text: string): boolean => {
    if (!text || text.trim().length < 2) return false;
    
    const cleanText = text.trim().toLowerCase();
    
    // Filter out silence, noise, and common false positives
    const noiseWords = [
      'silence', 'noise', 'background', 'static', 'feedback', 'echo', 'breathing', 'sigh', 'cough', 'clear throat',
      'please transcribe clearly and accurately', 'transcribe clearly', 'please transcribe', 'transcribe accurately'
    ];
    
    // Reject if it contains noise words
    if (noiseWords.some(word => cleanText.includes(word))) {
      console.log('🔇 Rejected noise/silence:', cleanText);
      return false;
    }
    
    // Reject if it's the same as last processed transcript (prevent duplicates)
    if (cleanText === lastProcessedTranscriptRef.current.toLowerCase()) {
      console.log('🔄 Rejected duplicate:', cleanText);
      return false;
    }
    
    // Reject if it's just punctuation or very short
    if (cleanText.length < 3 || /^[.,!?;:]+$/.test(cleanText)) {
      console.log('🔇 Rejected too short/punctuation:', cleanText);
      return false;
    }
    
    // Reject if it's just repeated words or sounds
    const words = cleanText.split(' ');
    if (words.length === 1 && words[0].length < 4) {
      console.log('🔇 Rejected single short word:', cleanText);
      return false;
    }
    
    // Accept speech that passes all filters
    console.log('✅ Accepted meaningful speech:', cleanText);
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

  // Speak response using OpenAI TTS
  const speakResponse = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    try {
      setIsSpeaking(true);
      
      console.log('🎤 Sending response to OpenAI TTS:', text);

      // Call our TTS API endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      // Get the audio blob and play it
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      
    } catch (err) {
      console.error('OpenAI TTS error:', err);
      setIsSpeaking(false);
    }
  }, []);

  // Initialize audio recording using browser-compatible approach
  const startListening = useCallback(async () => {
    console.log('🎤 Starting OpenAI Whisper-based listening (v2)');
    if (!isSupported || isListening) return;

    try {
      // Try to get microphone access directly - this is more reliable than permissions API
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      // Set up audio analysis for level detection
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000 // Lower bitrate for faster processing
      });
      
      const audioChunks: Blob[] = [];
      const recordingStartTime = Date.now();
      let hasAudioActivity = false;
      
      // Monitor audio levels during recording
      const audioLevelCheck = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          const normalizedLevel = average / 255;
          
          if (normalizedLevel > MIN_AUDIO_LEVEL) {
            hasAudioActivity = true;
          }
        }
      }, 100);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        clearInterval(audioLevelCheck);
        console.log('🎤 Audio recording stopped, processing...');
        
        if (audioChunks.length === 0) {
          console.log('⚠️ No audio data recorded');
          return;
        }
        
        // Check if there was actual audio activity
        if (!hasAudioActivity) {
          console.log('🔇 No audio activity detected, skipping processing');
          consecutiveSilentChunksRef.current += 1;
          audioChunks.length = 0;
          return;
        }
        
        try {
          // Combine all audio chunks
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Only process if we have substantial audio (> 1 second for faster response)
          const recordingDuration = Date.now() - recordingStartTime;
          if (recordingDuration < 1000) {
            console.log('⚠️ Recording too short, ignoring');
            return;
          }
          
          console.log('🔄 Sending audio to OpenAI Whisper for transcription (v2)...');
          
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
            
            // Process with GPT-3.5-turbo (only if not already processing)
            if (!isProcessingRef.current) {
              const startTime = Date.now();
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
                    conversationHistory: conversationHistoryRef.current.slice(-6) // Only last 3 exchanges
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
                
                const responseTime = Date.now() - startTime;
                console.log(`⚡ Response generated in ${responseTime}ms`);
                
                // Start TTS immediately while continuing to listen
                speakResponse(data.response);
                
                // Immediately restart listening for faster conversation flow
                setTimeout(() => {
                  if (!isListening) {
                    startListening();
                  }
                }, 25); // Very short delay for ultra-responsive conversation
                
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
        
        // Auto-restart listening for continuous conversation - ultra-fast
        setTimeout(() => {
          console.log('🔄 Auto-restarting listening for continuous conversation');
          startListening();
        }, 50); // Ultra-short delay for faster response
      };
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording in longer chunks (8 seconds each) for better transcription accuracy
      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      
      // Auto-stop after 8 seconds to get better chunks
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 8000);
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice recognition';
      setError(errorMessage);
      
      // Try to provide helpful guidance
      if (errorMessage.includes('denied') || errorMessage.includes('permission')) {
        setError('Microphone access denied. Please click the microphone icon in your browser address bar and allow access, then try again.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('no microphone')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (errorMessage.includes('NotAllowedError')) {
        setError('Microphone access blocked. Please allow microphone access in your browser settings.');
      } else {
        setError('Voice recognition failed. Please check your microphone and try again.');
      }
    }
  }, [isListening, isConnected, initializeWebSocket, isMeaningfulSpeech, speakResponse, isSupported]);

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

  // Continuous listening effect - ensure we're always listening when connected
  useEffect(() => {
    if (isConnected && !isListening && !isSpeaking) {
      console.log('🔄 Ensuring continuous listening is active (v2)');
      startListening();
    }
  }, [isConnected, isListening, isSpeaking, startListening]);

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