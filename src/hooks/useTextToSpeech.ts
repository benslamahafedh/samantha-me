import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTextToSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  error: string | null;
}

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices
  const loadVoices = useCallback(() => {
    if (!isSupported) return;

    const availableVoices = speechSynthesis.getVoices();
    setVoices(availableVoices);

    // Try to find the best soft, human-like female voice for Samantha
    const preferredVoices = [
      'Samantha', // macOS - soft and natural
      'Google UK English Female', // Chrome - warm and clear
      'Microsoft Zira Desktop', // Windows - friendly
      'Alex', // macOS - natural and warm
      'Karen', // Windows - soft and pleasant
      'Moira', // macOS - gentle
      'Tessa', // macOS - warm
      'Veena', // Chrome - soft
      'Fiona', // macOS - natural
      'Google US English Female', // Chrome - clear and warm
      'Microsoft Aria Desktop' // Windows - natural
    ];

    let bestVoice = null;
    
    // First, try to find a preferred voice
    for (const voiceName of preferredVoices) {
      const voice = availableVoices.find(v => 
        v.name.includes(voiceName) || v.name.toLowerCase().includes(voiceName.toLowerCase())
      );
      if (voice) {
        bestVoice = voice;
        break;
      }
    }

    // If no preferred voice, try to find any English female voice
    if (!bestVoice) {
      bestVoice = availableVoices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('woman'))
      );
    }

    // If still no match, use the first English voice
    if (!bestVoice) {
      bestVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
    }

    // If still no match, use the default voice
    if (!bestVoice && availableVoices.length > 0) {
      bestVoice = availableVoices[0];
    }

    setSelectedVoice(bestVoice || null);
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;

    loadVoices();
    
    // Handle voice changes
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported, loadVoices]);

  const speak = useCallback(async (text: string) => {
    if (isSpeaking || !text.trim()) return;

    try {
      setIsSpeaking(true);
      setError(null);

      // iOS Audio Session Configuration for TTS
      if (typeof window !== 'undefined' && 'webkitAudioContext' in window) {
        const audioContext = new (window as any).webkitAudioContext();
        
        // Configure audio session for iOS TTS
        if (audioContext.setAudioSessionConfiguration) {
          try {
            await audioContext.setAudioSessionConfiguration({
              category: 'playback',
              mode: 'default',
              options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
            });
          } catch (e) {
            console.log('iOS TTS audio session config not available:', e);
          }
        }
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }

      // iOS-specific: Force audio output to speaker
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        // Try to set audio output to speaker using Web Audio API
        const audioContext = new (window as any).AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Set gain to 0 to make it silent but still activate audio session
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start and stop immediately to activate audio session
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // iOS-specific audio settings
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        audio.volume = 1.0; // Ensure full volume
        // Try to force audio output to speaker
        if ('webkitAudioContext' in window) {
          audio.setAttribute('playsinline', 'false');
        }
      }

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

    } catch (error) {
      console.error('TTS error:', error);
      setError(error instanceof Error ? error.message : 'Failed to speak');
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        setError(null); // Clear any errors when manually stopping
      } catch {
        // Ignore errors during cancellation
        setIsSpeaking(false);
      }
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    error
  };
}; 