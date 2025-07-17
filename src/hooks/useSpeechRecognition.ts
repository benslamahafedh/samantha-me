import { useState, useEffect, useRef, useCallback } from 'react';

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
  const isStartingRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;
    
    try {
      startSpeechRecognition();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError('Failed to start voice recognition');
    }
  }, [isSupported, isListening]);

  const startSpeechRecognition = useCallback(() => {
    console.log('🧹 Cleaning up existing recognition');
    // Clean up any existing recognition
    if (recognitionRef.current) {
      try {
        console.log('🛑 Aborting existing recognition instance');
        (recognitionRef.current as unknown as SpeechRecognition).abort();
        recognitionRef.current = null;
      } catch {
        // Ignore cleanup errors
      }
    }

    // Wait a bit before creating new instance to avoid conflicts
    setTimeout(() => {
      // Double-check that we should still start
      if (!isStartingRef.current) {
        console.log('🚫 Starting cancelled, aborting speech recognition creation');
        return;
      }
      
      try {
        console.log('🔧 Creating new SpeechRecognition instance');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        // Create fresh instance
        const recognition = new SpeechRecognition();
        const instanceId = Math.random().toString(36).substring(2, 8);
        console.log(`🆔 Creating recognition instance: ${instanceId}`);
        recognitionRef.current = recognition;

        // More conservative settings to avoid browser issues
        recognition.continuous = false; // Start with non-continuous to avoid immediate stops
        recognition.interimResults = false; // Disable interim to reduce complexity
        recognition.lang = 'en-US';
        
        // Web Speech API doesn't have direct timeout control, but we can use continuous mode
        // The auto-restart mechanism in VoiceManager will handle keeping it alive
        console.log('🔧 Configured speech recognition for extended listening sessions');

        recognition.onstart = () => {
          console.log(`✅ SpeechRecognition started successfully [${instanceId}]`);
          startTimeRef.current = Date.now();
          setIsListening(true);
          setError(null);
          isStartingRef.current = false;
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
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
            console.log('🎯 Final transcript received:', finalTranscript);
            setTranscript(prev => prev + finalTranscript);
            setInterimTranscript('');
          }
          
          // Log interim results for debugging
          if (interimTranscript) {
            console.log('💭 Interim transcript:', interimTranscript);
          }

          // Remove auto-restart timeout - let the VoiceManager handle restarting
          // This prevents infinite restart loops
        };

        recognition.onerror = (event: { error: string }) => {
          console.log(`❌ SpeechRecognition error [${instanceId}]:`, event.error);
          
          // Handle specific errors more gracefully
          if (event.error === 'aborted') {
            // Don't show error for aborted - it's usually intentional
            console.log(`🛑 SpeechRecognition aborted (intentional) [${instanceId}]`);
            setIsListening(false);
            isStartingRef.current = false;
            return;
          }
          
          if (event.error === 'network') {
            setError('Network connection issue. Please check your internet.');
            setIsListening(false);
            isStartingRef.current = false;
            return;
          }
          
          if (event.error === 'not-allowed') {
            setError('❌ Microphone access denied. Please click the microphone icon in your browser and allow access, then refresh the page.');
            setIsListening(false);
            isStartingRef.current = false;
            return;
          }
          
          // For other errors, show a generic message and retry
          setError('Voice recognition temporarily unavailable');
          setIsListening(false);
          isStartingRef.current = false;
          
          // DISABLED: Auto-retry for most errors - CAUSING INFINITE LOOP
          // setTimeout(() => {
          //   if (!isListening) {
          //     setError(null);
          //     startListening();
          //   }
          // }, 2000);
        };

        // Add additional event handlers for debugging
        recognition.onsoundstart = () => {
          console.log(`🔊 Sound detection started [${instanceId}]`);
        };
        
        recognition.onsoundend = () => {
          console.log(`🔇 Sound detection ended [${instanceId}]`);
        };
        
        recognition.onspeechstart = () => {
          console.log(`🗣️ Speech detection started [${instanceId}]`);
        };
        
        recognition.onspeechend = () => {
          console.log(`🤐 Speech detection ended [${instanceId}]`);
        };
        
        recognition.onend = () => {
          const endTime = Date.now();
          const duration = endTime - startTimeRef.current;
          console.log(`🛑 SpeechRecognition ended naturally [${instanceId}] after ${duration}ms`);
          
          if (duration < 1000) {
            console.log(`⚠️ Recognition ended too quickly (${duration}ms) - trying restart`);
            setError('Speech recognition ended too quickly. Click the restart button to try again.');
          }
          
          setIsListening(false);
          isStartingRef.current = false;
          
          // Don't auto-restart here - let the VoiceManager handle it
          // This prevents the infinite restart loop
        };

        try {
          console.log(`🚀 Calling SpeechRecognition.start() [${instanceId}]`);
          recognition.start();
        } catch (error) {
          console.log(`❌ Failed to start speech recognition [${instanceId}]:`, error);
          setError('Failed to start speech recognition');
          setIsListening(false);
          isStartingRef.current = false;
        }
      } catch {
        setError('Failed to initialize speech recognition');
        setIsListening(false);
        isStartingRef.current = false;
      }
          }, 500); // Longer delay to ensure browser readiness
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (!isSupported || !isListening) return;
    
    try {
      if (recognitionRef.current) {
        (recognitionRef.current as unknown as SpeechRecognition).stop();
      }
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }
  }, [isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        (recognitionRef.current as unknown as SpeechRecognition).stop();
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
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  // Only declare if not already present
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onaudioend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onerror: ((this: SpeechRecognition, ev: { error: string }) => unknown) | null;
    onnomatch: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
}