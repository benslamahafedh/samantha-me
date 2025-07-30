'use client';

import React from 'react';

interface VoiceErrorDisplayProps {
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
  onRequestPermission?: () => void;
}

export default function VoiceErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss,
  onRequestPermission 
}: VoiceErrorDisplayProps) {
  if (!error) return null;

  // iOS detection removed
  const isMicrophoneError = error.includes('microphone') || error.includes('Microphone');
  const isAudioError = error.includes('audio') || error.includes('Audio');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Voice Error
          </h3>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>

          {/* iOS troubleshooting section removed */}

          {isMicrophoneError && onRequestPermission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-medium text-yellow-900 mb-2">Microphone Access:</h4>
              <p className="text-sm text-yellow-800">
                The app needs microphone access to work. Please allow microphone permissions when prompted.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {onRequestPermission && isMicrophoneError && (
              <button
                onClick={onRequestPermission}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Allow Microphone
              </button>
            )}
            
            {/* iOS retry button removed */}
            
            <button
              onClick={onRetry}
              className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={onDismiss}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Dismiss
            </button>
          </div>

          {/* iOS troubleshooting footer removed */}
        </div>
      </div>
    </div>
  );
} 