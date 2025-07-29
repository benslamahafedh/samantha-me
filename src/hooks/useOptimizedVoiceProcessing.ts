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

// Simplified performance settings
const AUDIO_CHUNK_DURATION = 3000; // 3 seconds
const MIN_SPEECH_DURATION = 500; // 500ms minimum
const MAX_SPEECH_DURATION = 10000; // 10 seconds maximum
const PROCESSING_TIMEOUT = 15000; // 15 seconds max processing time
const SPEAKING_DELAY = 1000; // 1 second delay after speaking

export function useOptimizedVoiceProcessing(sessionId?: string): OptimizedVoiceProcessingReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Mute detection
  const muteDetection = useMicrophoneMuteDetection();

  // Refs for state management
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastProcessedTextRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Check support
  const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Initialize audio context once
  const initializeAudioContext = useCallback(async () => {
    if (typeof window === 'undefined' || audioContextRef.current) return;

    try {
      console.log('🔧 Initializing audio context...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({
        sampleRate: 44100,
        latencyHint: 'interactive'
      });

      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      console.log('✅ Audio context initialized');
    } catch (error) {
      console.error('❌ Audio context initialization failed:', error);
    }
  }, []);

  // Simple speech detection
  const isMeaningfulSpeech = useCallback((text: string): boolean => {
    if (!text || text.trim().length < 2) return false;
    
    const trimmed = text.trim().toLowerCase();
    
    // Avoid processing duplicate text
    if (trimmed === lastProcessedTextRef.current.toLowerCase()) return false;
    
    // Must contain actual words
    if (!/[a-z]{2,}/.test(trimmed)) return false;
    
    return true;
  }, []);

  // Cleanup recording resources
  const cleanupRecording = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsListening(false);
  }, []);

  // Simplified TTS with better error handling
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
      setError(null);
      
      // Stop listening immediately
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Clear any existing timeouts
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      console.log('🎤 Requesting TTS for text:', text.substring(0, 50) + '...');
      
      const response = await fetch('/api/tts-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();

      // Audio settings
      audio.preload = 'auto';
      audio.volume = 0.9;

      // Enhanced error handling
      audio.onloadstart = () => console.log('🎵 Audio loading started');
      audio.oncanplay = () => console.log('🎵 Audio can play');
      audio.onloadeddata = () => console.log('🎵 Audio data loaded');

      audio.oncanplay = () => {
        console.log('🎵 Attempting to play audio...');
        audio.play().then(() => {
          console.log('✅ Audio playback started successfully');
        }).catch((playError) => {
          console.error('❌ Audio playback failed:', playError);
          // Try fallback speech synthesis
          if ('speechSynthesis' in window) {
            console.log('🔄 Trying fallback speech synthesis...');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;
            
            utterance.onend = () => {
              console.log('✅ Fallback speech synthesis completed');
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              
              // Restart listening after delay
              speakingTimeoutRef.current = setTimeout(() => {
                if (!isProcessingRef.current) {
                  // Use setTimeout to avoid circular dependency
                  setTimeout(() => {
                    if (!isProcessingRef.current && !isSpeakingRef.current) {
                      // Restart listening manually
                      console.log('🔄 Restarting listening after speech...');
                    }
                  }, SPEAKING_DELAY);
                }
              }, SPEAKING_DELAY);
            };
            
            utterance.onerror = () => {
              console.error('❌ Fallback speech synthesis failed');
              setIsSpeaking(false);
              isSpeakingRef.current = false;
            };
            
            speechSynthesis.speak(utterance);
          } else {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
          }
        });
      };

      audio.onended = () => {
        console.log('✅ Audio playback completed');
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        
        // Restart listening after delay
        speakingTimeoutRef.current = setTimeout(() => {
          if (!isProcessingRef.current) {
            // Use setTimeout to avoid circular dependency
            setTimeout(() => {
              if (!isProcessingRef.current && !isSpeakingRef.current) {
                // Restart listening manually
                console.log('🔄 Restarting listening after speech...');
              }
            }, SPEAKING_DELAY);
          }
        }, SPEAKING_DELAY);
      };

      audio.onerror = (error) => {
        console.error('❌ Audio error:', error);
        URL.revokeObjectURL(audioUrl);
        
        // Try fallback speech synthesis
        if ('speechSynthesis' in window) {
          console.log('🔄 Trying fallback speech synthesis...');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 0.9;
          
          utterance.onend = () => {
            console.log('✅ Fallback speech synthesis completed');
            setIsSpeaking(false);
            isSpeakingRef.current = false;
          };
          
          utterance.onerror = () => {
            console.error('❌ Fallback speech synthesis failed');
            setIsSpeaking(false);
            isSpeakingRef.current = false;
          };
          
          speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        }
      };

      audio.src = audioUrl;

    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      
      // Try fallback speech synthesis
      if ('speechSynthesis' in window) {
        console.log('🔄 Trying fallback speech synthesis...');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        utterance.onend = () => {
          console.log('✅ Fallback speech synthesis completed');
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        };
        
        utterance.onerror = () => {
          console.error('❌ Fallback speech synthesis failed');
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        };
        
        speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    }
  }, [muteDetection.isMuted]);

  // Simplified chat processing with better error handling
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
      setError(null);

      // Set processing timeout
      processingTimeoutRef.current = setTimeout(() => {
        setIsProcessing(false);
        isProcessingRef.current = false;
        setError('Processing timeout - please try again');
      }, PROCESSING_TIMEOUT);

      console.log('💬 Processing chat message:', text.substring(0, 50) + '...');

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
      } else {
        throw new Error('No response from chat API');
      }

    } catch (error) {
      console.error('Chat processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to process message: ${errorMessage}`);
      
      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Retrying chat processing (${retryCountRef.current}/${maxRetries})...`);
        
        setTimeout(() => {
          if (!isProcessingRef.current) {
            processChatOptimized(text, sessionIdParam);
          }
        }, 1000);
      } else {
        retryCountRef.current = 0; // Reset for next time
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [speakOptimized, sessionId]);

  // Simplified listening with better error handling
  const startListening = useCallback(async () => {
    if (isListening || isProcessingRef.current || isSpeakingRef.current) return;

    try {
      console.log('🎤 Starting listening...');
      
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }

      // Request microphone with simple constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      audioStreamRef.current = stream;
      setIsListening(true);
      setError(null);
      retryCountRef.current = 0; // Reset retry count

      // Create MediaRecorder with fallback options
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });
      } catch (mimeError) {
        console.log('⚠️ WebM not supported, trying default format...');
        mediaRecorder = new MediaRecorder(stream);
      }

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
            
            console.log('🎤 Sending audio for transcription...');
            
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const data = await response.json();
              const transcribedText = data.text?.trim();
              
              if (transcribedText && isMeaningfulSpeech(transcribedText)) {
                console.log('✅ Transcribed text:', transcribedText);
                setTranscript(transcribedText);
                await processChatOptimized(transcribedText, sessionId);
              } else {
                console.log('⚠️ No meaningful speech detected');
                // Restart listening if no meaningful speech
                setTimeout(() => {
                  if (!isProcessingRef.current && !isSpeakingRef.current) {
                    startListening();
                  }
                }, 500);
              }
            } else {
              console.error('❌ Transcription failed');
              // Restart listening on transcription error
              setTimeout(() => {
                if (!isProcessingRef.current && !isSpeakingRef.current) {
                  startListening();
                }
              }, 1000);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            // Restart listening on error
            setTimeout(() => {
              if (!isProcessingRef.current && !isSpeakingRef.current) {
                startListening();
              }
            }, 1000);
          }
        } else {
          console.log('⚠️ Audio duration not in range:', duration);
          // Restart listening if duration is not suitable
          setTimeout(() => {
            if (!isProcessingRef.current && !isSpeakingRef.current) {
              startListening();
            }
          }, 500);
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
      setError('Failed to start listening. Please check microphone permissions.');
      setIsListening(false);
      
      // Retry logic for listening
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Retrying listening (${retryCountRef.current}/${maxRetries})...`);
        
        setTimeout(() => {
          if (!isListening && !isProcessingRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }, 2000);
      } else {
        retryCountRef.current = 0; // Reset for next time
      }
    }
  }, [isListening, initializeAudioContext, isMeaningfulSpeech, processChatOptimized, sessionId, cleanupRecording]);

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