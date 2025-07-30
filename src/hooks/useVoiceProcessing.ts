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

  const isSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Simple and reliable TTS function
  const speak = useCallback(async (text: string) => {
    if (isSpeakingRef.current || !text.trim()) return;

    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setError(null);

      console.log('Requesting TTS for:', text.substring(0, 50));

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

      // Simple audio setup
      audio.volume = 1.0;
      audio.muted = false;
      
      // iOS-specific attributes
      if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
      }

      // Simple event handlers
      audio.oncanplay = () => {
        audio.play().catch((error) => {
          console.error('Audio play failed:', error);
          setIsSpeaking(false);
          isSpeakingRef.current = false;
        });
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      audio.src = audioUrl;

    } catch (error) {
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