import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<unknown>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Prevent multiple instances - only start if not already listening
    if (isListening) {
      return;
    }

    // Clean up any existing recognition
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as any).abort();
        recognitionRef.current = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Wait a bit before creating new instance to avoid conflicts
    setTimeout(() => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        (recognitionRef.current as any).continuous = true;
        (recognitionRef.current as any).interimResults = true;
        (recognitionRef.current as any).lang = 'en-US';

        (recognitionRef.current as any).onstart = () => {
          setIsListening(true);
          setError(null);
        };

        (recognitionRef.current as any).onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setInterimTranscript(interimTranscript);
          
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
            setInterimTranscript('');
          }

          // Auto-restart if no speech detected for 6 seconds (balanced pause)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isListening) {
              (recognitionRef.current as any).stop();
              setTimeout(() => startListening(), 500);
            }
          }, 6000); // Balanced 6 seconds - not too short, not too long
        };

        (recognitionRef.current as any).onerror = (event: any) => {
          // Handle specific errors more gracefully
          if (event.error === 'aborted') {
            // Don't show error for aborted - it's usually intentional
            setIsListening(false);
            return;
          }
          
          if (event.error === 'network') {
            setError('Network connection issue. Please check your internet.');
            setIsListening(false);
            // Auto-retry after network error
            setTimeout(() => {
              if (!isListening) startListening();
            }, 3000);
            return;
          }
          
          if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please allow microphone access.');
            setIsListening(false);
            return;
          }
          
          // For other errors, show a generic message and retry
          setError('Voice recognition temporarily unavailable');
          setIsListening(false);
          
          // Auto-retry for most errors after a short delay
          setTimeout(() => {
            if (!isListening) {
              setError(null);
              startListening();
            }
          }, 2000);
        };

        (recognitionRef.current as any).onend = () => {
          setIsListening(false);
        };

        try {
          (recognitionRef.current as any).start();
        } catch (err) {
          setError('Failed to start speech recognition');
          setIsListening(false);
        }
      } catch (setupError) {
        setError('Failed to initialize speech recognition');
        setIsListening(false);
      }
    }, 100); // Small delay to prevent conflicts
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    try {
      if (recognitionRef.current) {
        (recognitionRef.current as any).abort(); // Use abort instead of stop for cleaner shutdown
        recognitionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsListening(false);
      setError(null); // Clear any errors when manually stopping
    } catch (e) {
      // Ignore errors during cleanup
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        (recognitionRef.current as any).stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error
  };
};

// Extend the Window interface to include speech recognition
declare global {
  interface Window {
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;
  }
} 