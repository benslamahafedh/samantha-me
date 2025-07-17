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
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onloadstart = () => {
        console.log('🎵 OpenAI TTS audio loading...');
      };

      audio.oncanplay = () => {
        console.log('🎵 OpenAI TTS audio ready to play');
      };

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

      audio.onerror = (event) => {
        console.error('🎵 OpenAI TTS audio error:', event);
        setError('Failed to play audio');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };

      audio.onpause = () => {
        console.log('🎵 OpenAI TTS audio paused');
        setIsSpeaking(false);
      };

      // Start playing
      await audio.play();

    } catch (err) {
      console.error('OpenAI TTS error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
      setIsSpeaking(false);
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