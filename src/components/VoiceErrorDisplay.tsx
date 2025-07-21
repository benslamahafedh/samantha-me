'use client';

import { useState, useEffect } from 'react';

interface VoiceErrorDisplayProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onRequestPermission?: () => void;
}

export default function VoiceErrorDisplay({ error, onRetry, onDismiss, onRequestPermission }: VoiceErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [error, onDismiss]);

  if (!error || !isVisible) return null;

  const getErrorIcon = () => {
    if (error.includes('microphone') || error.includes('denied')) {
      return '🎤';
    } else if (error.includes('audio') || error.includes('TTS')) {
      return '🔊';
    } else if (error.includes('network')) {
      return '🌐';
    } else {
      return '⚠️';
    }
  };

  const getErrorColor = () => {
    if (error.includes('denied') || error.includes('not found')) {
      return 'bg-red-500/20 border-red-500/30 text-red-200';
    } else if (error.includes('network') || error.includes('API')) {
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200';
    } else {
      return 'bg-orange-500/20 border-orange-500/30 text-orange-200';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-full mx-4">
      <div className={`${getErrorColor()} backdrop-blur-sm rounded-lg p-4 border shadow-lg`}>
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{getErrorIcon()}</div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Voice Assistant Issue</h3>
            <p className="text-white/80 mb-4">
              Don&apos;t worry, I&apos;m still here to help! You can try:
            </p>
            <p className="text-sm opacity-90">{error}</p>
            
            {error.includes('microphone') && (
              <div className="mt-2 text-xs opacity-75">
                💡 <strong>Tip:</strong> Click the microphone icon in your browser&apos;s address bar and allow access.
              </div>
            )}
            
            {error.includes('network') && (
              <div className="mt-2 text-xs opacity-75">
                💡 <strong>Tip:</strong> Check your internet connection and try again.
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {error.includes('microphone') && onRequestPermission && (
              <button
                onClick={() => {
                  onRequestPermission();
                  setIsVisible(false);
                }}
                className="text-xs bg-blue-500/20 hover:bg-blue-500/30 rounded px-2 py-1 transition-colors"
              >
                Allow Microphone
              </button>
            )}
            {onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  setIsVisible(false);
                }}
                className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-colors"
              >
                Retry
              </button>
            )}
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss?.();
              }}
              className="text-xs bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 