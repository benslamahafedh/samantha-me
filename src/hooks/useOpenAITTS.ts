import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOpenAITTSReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  error: string | null;
}

export const useOpenAITTS = (): UseOpenAITTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const isSupported = typeof window !== 'undefined' && 'Audio' in window;

  const speak = useCallback(async (text: string) => {
    if (!isSupported) {
      setError('Audio playback is not supported in this browser');
      return;
    }

    if (!text.trim()) return;

    // Stop any current speech
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      setIsSpeaking(true);
      setError(null);

      console.log('🎤 Sending text to OpenAI TTS:', text);

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

      // Get the audio blob
      const audioBlob = await response.blob();
      console.log('🎵 Audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio blob from TTS API');
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      // Add more detailed event listeners for debugging
      audio.onloadstart = () => {
        console.log('🎵 OpenAI TTS audio loading started');
      };

      audio.onprogress = () => {
        console.log('🎵 OpenAI TTS audio loading progress');
      };

      audio.onloadedmetadata = () => {
        console.log('🎵 OpenAI TTS audio metadata loaded, duration:', audio.duration);
      };

      audio.onloadeddata = () => {
        console.log('🎵 OpenAI TTS audio data loaded');
      };

      audio.oncanplay = () => {
        console.log('🎵 OpenAI TTS audio ready to play');
      };

      audio.oncanplaythrough = () => {
        console.log('🎵 OpenAI TTS audio can play through');
      };

      // Remove duplicate onloadstart since we added it above

      audio.onplay = () => {
        console.log('🎵 OpenAI TTS audio playing');
        setIsSpeaking(true);
      };

      audio.onended = () => {
        console.log('🎵 OpenAI TTS audio finished');
        setIsSpeaking(false);
        // Clean up
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onerror = (event: Event | string) => {
        console.error('🎵 OpenAI TTS audio error:', event);
        const audioElement = typeof event === 'string' ? null : (event.target as HTMLAudioElement);
        const errorDetails = {
          error: event,
          audioSrc: audioUrl,
          text: text.substring(0, 50) + '...',
          errorCode: audioElement?.error?.code,
          errorMessage: audioElement?.error?.message,
          audioReadyState: audioElement?.readyState,
          audioNetworkState: audioElement?.networkState,
          audioCurrentSrc: audioElement?.currentSrc
        };
        console.error('🎵 OpenAI TTS audio error details:', errorDetails);
        
        // Try to provide more specific error messages
        if (audioElement?.error) {
          switch (audioElement.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              setError('Audio playback was aborted. Please try again.');
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              setError('Network error during audio playback. Please check your connection.');
              break;
            case MediaError.MEDIA_ERR_DECODE:
              setError('Audio format not supported. Please try again.');
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              setError('Audio source not supported. Please try again.');
              break;
            default:
              setError('Failed to play audio. Please try again.');
          }
        } else {
          setError('Failed to play audio. Please try again.');
        }
        
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onpause = () => {
        console.log('🎵 OpenAI TTS audio paused');
        setIsSpeaking(false);
      };

      // Start playing with autoplay policy handling
      try {
        console.log('🎵 Attempting to play audio...');
      await audio.play();
        console.log('🎵 Audio play() succeeded');
      } catch (playError) {
        console.error('🎵 Audio play() failed:', playError);
        
        // Check if it's an autoplay policy issue
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          console.log('🎵 Autoplay blocked by browser policy');
          setError('Audio autoplay blocked. Please click to interact first.');
          
          // Try to enable audio context on user interaction
          const enableAudio = () => {
            audio.play().then(() => {
              console.log('🎵 Audio started after user interaction');
              document.removeEventListener('click', enableAudio);
            }).catch(err => {
              console.error('🎵 Audio still failed after user interaction:', err);
            });
          };
          
          document.addEventListener('click', enableAudio, { once: true });
        } else {
          throw playError; // Re-throw other errors
        }
      }

    } catch (err) {
      console.error('OpenAI TTS error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsSpeaking(false);
      
      // Provide more specific error messages
      if (errorMessage.includes('API key')) {
        setError('OpenAI API key not configured. Please check your settings.');
      } else if (errorMessage.includes('network')) {
        setError('Network error. Please check your internet connection.');
      } else if (errorMessage.includes('quota')) {
        setError('OpenAI quota exceeded. Please try again later.');
      } else {
        setError('Text-to-speech failed. Please try again.');
      }
      
      // Fallback: try to use browser's built-in speech synthesis as backup
      try {
        if ('speechSynthesis' in window && speechSynthesis.getVoices().length > 0) {
          console.log('🎤 Attempting browser fallback TTS...');
          
          // Cancel any existing speech
          speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          
          // Try to find a good voice
          const voices = speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.toLowerCase().includes('female')
          ) || voices[0];
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log('🎤 Using voice:', preferredVoice.name);
          }
          
          utterance.onstart = () => {
            console.log('🎤 Browser fallback TTS started');
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            console.log('🎤 Browser fallback TTS finished');
            setIsSpeaking(false);
          };
          
          utterance.onerror = (event) => {
            console.log('🎤 Browser fallback TTS failed:', event);
            setIsSpeaking(false);
          };
          
          speechSynthesis.speak(utterance);
        } else {
          console.log('🎤 Browser speech synthesis not available');
          setError('Text-to-speech not available. Please check your browser settings.');
        }
      } catch (fallbackError) {
        console.error('Browser TTS fallback also failed:', fallbackError);
        setError('Text-to-speech failed. Please try again.');
      }
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    error
  };
}; 