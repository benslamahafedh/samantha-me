import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMicrophoneMuteDetection } from './useMicrophoneMuteDetection';

interface OptimizedVoiceProcessingReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  isConnected: boolean;
  isMuted: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (message: string, sessionId?: string) => void;
}

// Performance optimizations
const AUDIO_CHUNK_DURATION = 2000; // 2 seconds - optimal for mobile
const MIN_SPEECH_DURATION = 500; // 500ms minimum
const MAX_SPEECH_DURATION = 5000; // 5 seconds maximum
const PROCESSING_TIMEOUT = 8000; // 8 seconds max processing time
const SPEAKING_DELAY = 800; // 800ms delay after speaking before listening

export function useOptimizedVoiceProcessing(sessionId?: string): OptimizedVoiceProcessingReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Mute detection
  const muteDetection = useMicrophoneMuteDetection();

  // Refs for performance optimization
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastProcessedTextRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check support
  const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Initialize audio context for iOS
  const initializeAudioContext = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Create audio context with iOS optimizations
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });

      // iOS-specific audio session configuration
      if ((audioContextRef.current as any).setAudioSessionConfiguration) {
        await (audioContextRef.current as any).setAudioSessionConfiguration({
          category: 'playAndRecord',
          mode: 'voiceChat',
          options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
        });
      }

      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.log('Audio context initialization failed:', error);
    }
  }, []);

  // Optimized speech detection
  const isMeaningfulSpeech = useCallback((text: string): boolean => {
    if (!text || text.trim().length < 2) return false;
    
    const trimmed = text.trim().toLowerCase();
    
    // Avoid processing duplicate text
    if (trimmed === lastProcessedTextRef.current.toLowerCase()) return false;
    
    // Must contain actual words
    if (!/[a-z]{2,}/.test(trimmed)) return false;
    
    // Filter out obvious noise
    const noiseWords = ['silence', 'background', 'static', 'noise', 'breathing'];
    if (noiseWords.some(word => trimmed.includes(word))) return false;
    
    return true;
  }, []);

  // Ultra-fast TTS with mobile optimizations
  const speakOptimized = useCallback(async (text: string) => {
    if (isSpeakingRef.current || !text.trim()) return;

    // Don't speak if microphone is muted
    if (muteDetection.isMuted) {
      console.log('🔇 Microphone is muted - skipping speech');
      return;
    }

    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      
      // Stop listening immediately
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Clear any existing timeouts
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      // iOS audio session activation
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const response = await fetch('/api/tts-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('TTS request failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();

      // Mobile-optimized audio settings
      audio.preload = 'auto';
      audio.volume = 0.9;
      
      // iOS-specific audio configuration
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
      }

      audio.oncanplay = () => {
        audio.play().catch(console.error);
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        
        // Restart listening after a short delay
        speakingTimeoutRef.current = setTimeout(() => {
          if (!isProcessingRef.current) {
            startListening();
          }
        }, SPEAKING_DELAY);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        
        // Restart listening on error
        speakingTimeoutRef.current = setTimeout(() => {
          if (!isProcessingRef.current) {
            startListening();
          }
        }, 1000);
      };

      audio.src = audioUrl;

    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Restart listening on error
      speakingTimeoutRef.current = setTimeout(() => {
        if (!isProcessingRef.current) {
          startListening();
        }
      }, 1000);
    }
  }, []);

  // Ultra-fast chat processing
  const processChatOptimized = useCallback(async (text: string, sessionIdParam?: string) => {
    if (isProcessingRef.current || !text.trim()) return;

    // Use provided sessionId or fallback to hook sessionId
    const currentSessionId = sessionIdParam || sessionId;
    if (!currentSessionId) {
      setError('Session ID required for chat processing');
      return;
    }

    try {
      setIsProcessing(true);
      isProcessingRef.current = true;
      lastProcessedTextRef.current = text;

      // Set processing timeout
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        isProcessingRef.current = false;
        setError('Processing timeout - please try again');
      }, PROCESSING_TIMEOUT);

      const response = await fetch('/api/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          useFastMode: true,
          mobileOptimized: true,
          sessionId: currentSessionId
        })
      });

      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chat request failed');
      }

      const data = await response.json();
      
      if (data.response) {
        await speakOptimized(data.response);
      }

    } catch (error) {
      console.error('Chat processing error:', error);
      setError('Failed to process message');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [speakOptimized, sessionId]);

  // Optimized listening with mobile-specific settings
  const startListening = useCallback(async () => {
    if (isListening || isProcessingRef.current || isSpeakingRef.current) return;

    try {
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }

      // Request microphone with mobile-optimized constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
          // Mobile-specific optimizations
          ...(navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? {
            // iOS-specific settings
            mandatory: {
              googEchoCancellation: true,
              googAutoGainControl: true,
              googNoiseSuppression: true,
              googHighpassFilter: true,
              googTypingNoiseDetection: true,
              googAudioMirroring: false
            }
          } : {})
        }
      });

      audioStreamRef.current = stream;
      setIsListening(true);
      setError(null);

      // Create MediaRecorder with optimal settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      let recordingStartTime = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) {
          cleanupRecording();
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const duration = Date.now() - recordingStartTime;

        // Only process if duration is reasonable
        if (duration >= MIN_SPEECH_DURATION && duration <= MAX_SPEECH_DURATION) {
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            if (sessionId) {
              formData.append('sessionId', sessionId);
            }
            
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const data = await response.json();
              const transcribedText = data.text?.trim();
              
              if (transcribedText && isMeaningfulSpeech(transcribedText)) {
                setTranscript(transcribedText);
                await processChatOptimized(transcribedText, sessionId);
              }
            }
          } catch (error) {
            console.error('Transcription error:', error);
          }
        }

        cleanupRecording();
      };

      // Start recording
      mediaRecorder.start();
      
      // Stop after optimal duration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, AUDIO_CHUNK_DURATION);

    } catch (error) {
      console.error('Listening start error:', error);
      setError('Failed to start listening');
      setIsListening(false);
    }
  }, [isListening, initializeAudioContext, isMeaningfulSpeech, processChatOptimized]);

  // Cleanup recording resources
  const cleanupRecording = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsListening(false);
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();
  }, [cleanupRecording]);

  // Send message directly
  const sendMessage = useCallback((message: string, sessionIdParam?: string) => {
    processChatOptimized(message, sessionIdParam);
  }, [processChatOptimized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      cleanupRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [cleanupRecording]);

  return useMemo(() => ({
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    error,
    isSupported,
    isConnected: isSupported,
    isMuted: muteDetection.isMuted,
    startListening,
    stopListening,
    sendMessage
  }), [
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    error,
    isSupported,
    muteDetection.isMuted,
    startListening,
    stopListening,
    sendMessage
  ]);
} 