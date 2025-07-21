import { useState, useEffect } from 'react';

interface UseMicrophonePermissionReturn {
  hasPermission: boolean;
  isChecking: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
}

export const useMicrophonePermission = (): UseMicrophonePermissionReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      setError(null);

      // Don't automatically request permission on check - just test if we already have it
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'granted') {
          setHasPermission(true);
          return true;
        } else if (permission.state === 'denied') {
          setHasPermission(false);
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
          return false;
        }
        // If 'prompt', we'll request permission when needed
      }
      
      // If permissions API not available, we'll request when needed
      setHasPermission(false);
      return false;
    } catch (err) {
      // If permissions API fails, we'll request when needed
      setHasPermission(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setIsChecking(true);
      setError(null);

      console.log('🎤 Requesting microphone permission...');

      // Request permission by trying to get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        },
        video: false 
      });
      
      console.log('🎤 Microphone permission granted!');
      
      // If we get here, permission was granted
      stream.getTracks().forEach(track => track.stop()); // Clean up
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('🎤 Microphone permission denied:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide more specific error messages
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
        setError('Microphone access denied. Please click the microphone icon in your browser address bar and allow access.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no microphone')) {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (errorMessage.includes('NotSupportedError')) {
        setError('Microphone not supported in this browser. Please try a different browser.');
      } else {
        setError('Failed to access microphone. Please check your browser settings.');
      }
      
      setHasPermission(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  return {
    hasPermission,
    isChecking,
    error,
    requestPermission,
    checkPermission
  };
}; 