import { useState, useCallback, useRef, useEffect } from 'react';

interface VoiceProcessingReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendMessage: (message: string, sessionId?: string) => void;
}

export function useVoiceProcessing(sessionId?: string): VoiceProcessingReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const globalAudioContextRef = useRef<AudioContext | null>(null);

  const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Initialize global audio context for iOS
  useEffect(() => {
    if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !globalAudioContextRef.current) {
        globalAudioContextRef.current = new AudioContextClass();
        console.log('Global audio context created for iOS');
      }
    }
  }, []);

  // Enhanced TTS function with robust iOS audio support
  const speak = useCallback(async (text: string) => {
    if (isSpeakingRef.current || !text.trim()) return;

    // Add timeout to prevent infinite loops
    const speakTimeout = setTimeout(() => {
      console.warn('TTS timeout - resetting speaking state');
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }, 30000); // 30 second timeout

    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setError(null);

      console.log('Requesting TTS for:', text.substring(0, 50));

      // Enhanced iOS Audio Context Activation
      let audioContext: AudioContext | null = null;
      if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        console.log('iOS detected - using global audio context');
        audioContext = globalAudioContextRef.current;
        
        if (!audioContext) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            globalAudioContextRef.current = audioContext;
            console.log('Created new audio context for iOS');
          }
        }
        
        if (audioContext && audioContext.state === 'suspended') {
          console.log('Resuming suspended audio context');
          await audioContext.resume();
        }
        console.log('Audio context state:', audioContext?.state);
      }

      const response = await fetch('/api/tts-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio();

      // Enhanced iOS audio setup
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.muted = false;
      
      // iOS-specific audio attributes
      if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('controls', 'false');
        audio.setAttribute('autoplay', 'false');
        console.log('iOS audio attributes set');
      }

      // Enhanced audio event handlers
      audio.oncanplay = () => {
        console.log('Audio can play - attempting to play');
        audio.play().catch((error) => {
          console.error('Audio play failed:', error);
          
          // Enhanced iOS retry logic
          if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
            console.log('iOS audio play failed - attempting retry');
            
            // Try to resume audio context first
            if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume().then(() => {
                console.log('Audio context resumed, retrying play');
                audio.play().catch((retryError) => {
                  console.error('iOS audio retry failed:', retryError);
                  clearTimeout(speakTimeout);
                  setIsSpeaking(false);
                  isSpeakingRef.current = false;
                });
              });
            } else {
              // Try playing with a small delay
              setTimeout(() => {
                audio.play().catch((retryError) => {
                  console.error('iOS audio delayed retry failed:', retryError);
                  clearTimeout(speakTimeout);
                  setIsSpeaking(false);
                  isSpeakingRef.current = false;
                });
              }, 100);
            }
          } else {
            clearTimeout(speakTimeout);
            setIsSpeaking(false);
            isSpeakingRef.current = false;
          }
        });
      };

      audio.onloadstart = () => console.log('Audio loading started');
      audio.onloadedmetadata = () => console.log('Audio metadata loaded');
      audio.onloadeddata = () => console.log('Audio data loaded');
      audio.oncanplaythrough = () => console.log('Audio can play through');

      audio.onended = () => {
        console.log('Audio playback ended');
        clearTimeout(speakTimeout);
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      audio.onerror = (error) => {
        clearTimeout(speakTimeout);
        console.error('Audio error:', error);
        console.error('Audio error details:', audio.error);
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      // Set audio source
      audio.src = audioUrl;

    } catch (error) {
      clearTimeout(speakTimeout);
      console.error('TTS error:', error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  // Process chat message
  const processChat = useCallback(async (text: string, sessionIdParam?: string) => {
    if (isProcessingRef.current || isSpeakingRef.current || !text.trim()) return;

    const currentSessionId = sessionIdParam || sessionId;
    if (!currentSessionId) {
      setError('Session ID required');
      return;
    }

    try {
      setIsProcessing(true);
      isProcessingRef.current = true;
      setError(null);

      console.log('Processing chat message:', text.substring(0, 50));

      const response = await fetch('/api/chat-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          sessionId: currentSessionId
        })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      
      if (data.response && data.response.trim()) {
        // Stop listening before speaking
        if (isListening && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        
        // Small delay to ensure listening is stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await speak(data.response);
      } else {
        throw new Error('No response from chat API');
      }

    } catch (error) {
      console.error('Chat processing error:', error);
      setError('Failed to process message');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [speak, sessionId, isListening]);

  // Start listening
  const startListening = useCallback(async () => {
    if (isListening || isProcessingRef.current || isSpeakingRef.current) return;

    try {
      console.log('Starting listening...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioStreamRef.current = stream;
      setIsListening(true);
      setError(null);
      setTranscript(''); // Clear previous transcript

      const mediaRecorder = new MediaRecorder(stream);
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

        if (duration >= 500 && duration <= 30000) { // Allow longer recordings for manual control
          try {
            // Prevent multiple simultaneous processing
            if (isProcessingRef.current || isSpeakingRef.current) {
              console.log('Already processing or speaking, skipping transcription');
              cleanupRecording();
              return;
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            if (sessionId) {
              formData.append('sessionId', sessionId);
            }
            
            console.log('Sending audio for transcription...');
            
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const data = await response.json();
              const transcribedText = data.text?.trim();
              
              if (transcribedText && transcribedText.length > 2) {
                console.log('Transcribed:', transcribedText);
                setTranscript(transcribedText);
                // Automatically process the transcript
                await processChat(transcribedText, sessionId);
              } else {
                console.log('No meaningful speech detected');
              }
            } else {
              console.error('Transcription failed');
            }
          } catch (error) {
            console.error('Transcription error:', error);
          }
        } else {
          console.log('Audio duration not suitable:', duration);
        }

        cleanupRecording();
      };

      mediaRecorder.start();
      
      // Don't auto-stop - let user control when to stop
      // setTimeout(() => {
      //   if (mediaRecorder.state === 'recording') {
      //     mediaRecorder.stop();
      //   }
      // }, 3000);

    } catch (error) {
      console.error('Listening start error:', error);
      setError('Failed to start listening. Please check microphone permissions.');
      setIsListening(false);
    }
  }, [isListening, processChat, sessionId]);

  // Cleanup recording
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

  // Send message
  const sendMessage = useCallback((message: string, sessionIdParam?: string) => {
    processChat(message, sessionIdParam);
  }, [processChat]);

  // Test audio function for iOS debugging
  const testAudio = useCallback(() => {
    if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
      console.log('Testing iOS audio...');
      
      // Create a simple test audio
      const testAudio = new Audio();
      testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      testAudio.volume = 0.1;
      
      testAudio.play().then(() => {
        console.log('iOS test audio played successfully');
      }).catch((error) => {
        console.error('iOS test audio failed:', error);
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    sendMessage
  };
} 