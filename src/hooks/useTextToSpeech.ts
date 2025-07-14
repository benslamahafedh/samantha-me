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

    // Try to find the best female voice for Samantha
    const preferredVoices = [
      'Google UK English Female',
      'Microsoft Zira Desktop',
      'Samantha',
      'Alex',
      'Karen',
      'Moira',
      'Tessa',
      'Veena',
      'Fiona'
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

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('Text-to-speech is not supported in this browser');
      return;
    }

    if (!text.trim()) return;

    // Stop any current speech
    speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure the utterance for a charming, intimate voice
      utterance.rate = 0.75; // Very slow and deliberate
      utterance.pitch = 1.05; // Slightly warmer pitch
      utterance.volume = 0.6; // Very soft and intimate

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        // Handle specific errors gracefully
        if (event.error === 'interrupted' || event.error === 'canceled') {
          // Don't show error for interrupted/canceled - usually intentional
          setIsSpeaking(false);
          return;
        }
        
        if (event.error === 'network') {
          setError('Voice synthesis network issue');
          setIsSpeaking(false);
          return;
        }
        
        if (event.error === 'synthesis-unavailable') {
          setError('Voice synthesis temporarily unavailable');
          setIsSpeaking(false);
          return;
        }
        
        // Only log other errors to console, don't show to user
        console.log('Speech synthesis error:', event.error);
        setIsSpeaking(false);
      };

      utterance.onpause = () => {
        setIsSpeaking(false);
      };

      utterance.onresume = () => {
        setIsSpeaking(true);
      };

      speechSynthesis.speak(utterance);
    } catch {
      setError('Failed to synthesize speech');
      setIsSpeaking(false);
    }
  }, [isSupported, selectedVoice]);

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