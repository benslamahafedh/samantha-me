'use client';

import { useState } from 'react';

interface VoiceErrorDisplayProps {
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
  onRequestPermission: () => void;
}

export default function VoiceErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  onRequestPermission 
}: VoiceErrorDisplayProps) {
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  });

  if (!error) return null;

  const isPermissionError = error.toLowerCase().includes('permission') || 
                           error.toLowerCase().includes('microphone') ||
                           error.toLowerCase().includes('access');
  
  const isIOSAudioError = isIOS && (error.toLowerCase().includes('audio') || 
                                   error.toLowerCase().includes('initialization'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full text-center">
        <div className="text-red-400 text-4xl mb-4">
          {isIOS ? '🍎' : '🎤'}
        </div>
        
        <h3 className="text-white text-lg font-medium mb-2">
          {isIOSAudioError ? 'iOS Audio Issue' : 'Voice Error'}
        </h3>
        
        <p className="text-gray-300 text-sm mb-4">
          {error}
        </p>

        {isIOSAudioError && (
          <div className="bg-blue-900 bg-opacity-50 rounded p-3 mb-4 text-left">
            <p className="text-blue-200 text-xs mb-2 font-medium">iOS Audio Fixes:</p>
            <ul className="text-blue-100 text-xs space-y-1">
              <li>• Make sure your device is not on silent mode</li>
              <li>• Check that Safari has microphone permission</li>
              <li>• Try refreshing the page</li>
              <li>• Ensure you're using Safari browser</li>
            </ul>
          </div>
        )}

        {isPermissionError && (
          <div className="bg-yellow-900 bg-opacity-50 rounded p-3 mb-4 text-left">
            <p className="text-yellow-200 text-xs mb-2 font-medium">Permission Required:</p>
            <ul className="text-yellow-100 text-xs space-y-1">
              <li>• Allow microphone access when prompted</li>
              <li>• Check browser settings for microphone permissions</li>
              <li>• Try refreshing the page</li>
            </ul>
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {isPermissionError && (
            <button
              onClick={onRequestPermission}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Grant Microphone Permission
            </button>
          )}
          
          <button
            onClick={onRetry}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={onDismiss}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
} 