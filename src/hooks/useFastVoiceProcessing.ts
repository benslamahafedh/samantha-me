// Disable browser TTS globally
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.speak = function() {};
  window.speechSynthesis.cancel = function() {};
}

import { useState, useCallback, useRef, useEffect } from 'react';

interface FastVoiceProcessingReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  isConnected: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (message: string) => void;
  processChatFast: (text: string) => Promise<void>;
}

// Constants
const PROCESSING_COOLDOWN = 2000; // 2 seconds between processing
const CONSECUTIVE_SILENT_LIMIT = 5; // Stop after 5 silent chunks

export function useFastVoiceProcessing(): FastVoiceProcessingReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for state management
  const isStartingListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const lastProcessingTimeRef = useRef(0);
  const lastProcessedTranscriptRef = useRef('');
  const consecutiveSilentChunksRef = useRef(0);
  const processChatFastRef = useRef<((text: string) => Promise<void>) | null>(null);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Check if speech is meaningful (not just background noise)
  const isMeaningfulSpeech = useCallback((text: string): boolean => {
    const trimmed = text.trim().toLowerCase();
    
    // Must be at least 2 characters
    if (trimmed.length < 2) return false;
    
    // Must contain at least one word (letters)
    if (!/[a-z]/.test(trimmed)) return false;
    
    // Must not be the same as last processed transcript
    if (trimmed === lastProcessedTranscriptRef.current.toLowerCase()) return false;
    
    // Must not be just common filler words
    const fillerWords = ['um', 'uh', 'ah', 'er', 'hmm', 'mm', 'mhm', 'yeah', 'yes', 'no', 'okay', 'ok'];
    const words = trimmed.split(/\s+/);
    const meaningfulWords = words.filter(word => !fillerWords.includes(word));
    
    return meaningfulWords.length >= 1;
  }, []);

  // Fast OpenAI TTS only (no local TTS fallback)
  const speakFast = useCallback(async (text: string) => {
    try {
      // Set speaking state immediately to prevent any processing
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      
      // Stop any current listening to prevent interruption
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Fallback timer to ensure listening restarts
      const fallbackTimer = setTimeout(() => {
        if (isSpeakingRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          setIsListening(false);
          startListening();
        }
      }, 10000); // 10 second fallback
      
      const response = await fetch('/api/tts-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.oncanplay = () => {
          audio.play();
        };
        
        audio.onended = () => {
          clearTimeout(fallbackTimer);
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          
          // Wait a moment after Samantha finishes speaking before starting to listen again
          setTimeout(() => {
            // Ensure we're not processing and can start listening
            if (!isProcessingRef.current && !isSpeakingRef.current) {
              // Reset listening state to ensure clean restart
              setIsListening(false);
              startListening();
            }
          }, 1500); // Increased delay to ensure she's completely finished
        };
        
        audio.onerror = () => {
          clearTimeout(fallbackTimer);
          URL.revokeObjectURL(audioUrl);
          setError('Failed to play TTS audio.');
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          
          // Restart listening even on error
          setTimeout(() => {
            if (!isProcessingRef.current && !isSpeakingRef.current) {
              setIsListening(false);
              startListening();
            }
          }, 1000);
        };
      } else {
        clearTimeout(fallbackTimer);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        
        // Restart listening even on error
        setTimeout(() => {
          if (!isProcessingRef.current && !isSpeakingRef.current) {
            setIsListening(false);
            startListening();
          }
        }, 1000);
      }
    } catch {
      setError('OpenAI TTS failed.');
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Restart listening even on error
      setTimeout(() => {
        if (!isProcessingRef.current && !isSpeakingRef.current) {
          setIsListening(false);
          startListening();
        }
      }, 1000);
    }
  }, []);

  // Ultra-fast chat processing with response variety
  const processChatFast = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          useFastMode: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          await speakFast(data.response);
        }
      } else {
        setError('Failed to get response from chat API.');
      }
    } catch {
      setError('Failed to process chat request.');
    }
  }, [speakFast]);

  // Store the processChatFast function in a ref for use in startListening
  useEffect(() => {
    processChatFastRef.current = processChatFast;
  }, [processChatFast]);

  // Start listening with optimized settings
  const startListening = useCallback(async () => {
    if (isListening || isProcessing) return;

    try {
      // iOS Audio Session Configuration - Bypass Silent Mode
      if (typeof window !== 'undefined' && 'webkitAudioContext' in window) {
        const audioContext = new (window as any).webkitAudioContext();
        
        // Configure audio session for iOS
        if (audioContext.setAudioSessionConfiguration) {
          try {
            await audioContext.setAudioSessionConfiguration({
              category: 'playAndRecord',
              mode: 'voiceChat',
              options: ['allowBluetooth', 'allowBluetoothA2DP', 'defaultToSpeaker']
            });
          } catch (e) {
            console.log('iOS audio session config not available:', e);
          }
        }
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }

      // Request microphone access with specific constraints for iOS
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
          // iOS-specific options
          ...(navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? {
            // Force audio input even in silent mode
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

      setIsListening(true);
      setError(null);

      // Create MediaRecorder with iOS-optimized settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      // iOS-specific: Force audio output to speaker
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioTrack = audioTracks[0];
          // Try to set audio output to speaker
          if (audioTrack.getSettings) {
            const settings = audioTrack.getSettings();
            console.log('iOS Audio track settings:', settings);
          }
        }
      }

      const audioChunks: Blob[] = [];
      let recordingStartTime = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) return;

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const duration = Date.now() - recordingStartTime;

        // Process audio if it's long enough
        if (duration >= 800) {
          try {
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
            
            // Check if this is meaningful speech
            if (transcribedText && isMeaningfulSpeech(transcribedText)) {
              setTranscript(transcribedText);
              
              // Process with fast chat
              if (!isProcessingRef.current && processChatFastRef.current) {
                setIsProcessing(true);
                isProcessingRef.current = true;
                
                try {
                  await processChatFastRef.current(transcribedText);
                } finally {
                  setIsProcessing(false);
                  isProcessingRef.current = false;
                }
              }
            }
          } catch (error) {
            console.error('Failed to process audio:', error);
            setError('Failed to process voice input');
          }
        }

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      };

      // Start recording with fixed duration for iOS compatibility
      mediaRecorder.start();
      
      // Stop recording after 3 seconds (iOS-friendly duration)
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (error) {
      console.error('Failed to start listening:', error);
      setError(error instanceof Error ? error.message : 'Failed to start listening');
      setIsListening(false);
    }
  }, [isListening, isProcessing, isMeaningfulSpeech]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Send message directly (for testing)
  const sendMessage = useCallback((message: string) => {
    processChatFast(message);
  }, [processChatFast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    error,
    isSupported,
    isConnected: isSupported, // Assuming isSupported is the indicator for connection
    startListening,
    stopListening,
    sendMessage,
    processChatFast
  };
} 