'use client';

import { motion } from 'framer-motion';

interface SimpleVoiceVisualizationProps {
  isListening: boolean;
  isSpeaking: boolean;
  hasStarted: boolean;
}

export default function SimpleVoiceVisualization({
  isListening,
  isSpeaking,
  hasStarted
}: SimpleVoiceVisualizationProps) {
  if (!hasStarted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
          <div className="text-2xl">🎤</div>
        </div>
        <p className="text-gray-600 text-sm">Click "Start Conversation" to begin</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      {isListening && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="flex space-x-1"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
        </motion.div>
      )}
      
      {isSpeaking && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="flex items-center space-x-2"
        >
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-purple-600 text-sm font-medium">Samantha is speaking...</span>
        </motion.div>
      )}
      
      {!isListening && !isSpeaking && (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-gray-500 text-sm">Ready</span>
        </div>
      )}
    </div>
  );
} 