import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseMicrophoneMuteDetectionReturn {
  isMuted: boolean;
  isDetecting: boolean;
  error: string | null;
  checkMuteStatus: () => Promise<boolean>;
}

export function useMicrophoneMuteDetection(): UseMicrophoneMuteDetectionReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if audio detection is supported
  const isSupported = typeof window !== 'undefined' && 
    'AudioContext' in window && 
    'getUserMedia' in navigator.mediaDevices;

  // Initialize audio context
  const initializeAudioContext = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }, [isSupported]);

  // Get microphone stream
  const getMicrophoneStream = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Failed to get microphone stream:', error);
      return null;
    }
  }, [isSupported]);

  // Setup audio analysis
  const setupAudioAnalysis = useCallback(async () => {
    if (!audioContextRef.current) {
      const initialized = await initializeAudioContext();
      if (!initialized) return false;
    }

    const stream = await getMicrophoneStream();
    if (!stream) return false;

    try {
      const analyser = audioContextRef.current!.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      const microphone = audioContextRef.current!.createMediaStreamSource(stream);
      microphone.connect(analyser);

      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      return true;
    } catch (error) {
      console.error('Failed to setup audio analysis:', error);
      return false;
    }
  }, [initializeAudioContext, getMicrophoneStream]);

  // Check mute status by analyzing audio levels
  const checkMuteStatus = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setIsDetecting(true);
      setError(null);

      const setupSuccess = await setupAudioAnalysis();
      if (!setupSuccess) {
        setError('Failed to setup audio detection');
        return false;
      }

      // Wait a moment for audio to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));

      const analyser = analyserRef.current;
      if (!analyser) return false;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      // Consider muted if average volume is very low
      const muted = average < 5; // Threshold for mute detection
      
      setIsMuted(muted);
      return muted;

    } catch (error) {
      console.error('Error checking mute status:', error);
      setError('Failed to check mute status');
      return false;
    } finally {
      setIsDetecting(false);
    }
  }, [isSupported, setupAudioAnalysis]);

  // Start continuous mute detection
  const startMuteDetection = useCallback(() => {
    if (!isSupported) return;

    // Check immediately
    checkMuteStatus();

    // Then check every 2 seconds
    detectionIntervalRef.current = setInterval(() => {
      checkMuteStatus();
    }, 2000);
  }, [isSupported, checkMuteStatus]);

  // Stop mute detection
  const stopMuteDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Cleanup audio resources
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  // Start detection when component mounts
  useEffect(() => {
    if (isSupported) {
      startMuteDetection();
    }

    return () => {
      stopMuteDetection();
    };
  }, [isSupported, startMuteDetection, stopMuteDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMuteDetection();
    };
  }, [stopMuteDetection]);

  return useMemo(() => ({
    isMuted,
    isDetecting,
    error,
    checkMuteStatus
  }), [isMuted, isDetecting, error, checkMuteStatus]);
} 