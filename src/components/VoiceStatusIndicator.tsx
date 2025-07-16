'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface VoiceStatusIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  hasStarted: boolean;
  sessionEnded: boolean;
  isPaused?: boolean;
}

export default function VoiceStatusIndicator({
  isListening,
  isSpeaking,
  hasStarted,
  sessionEnded,
  isPaused = false
}: VoiceStatusIndicatorProps) {
  
  const getStatus = () => {
    if (sessionEnded) return { text: 'Session Ended', color: 'text-gray-400' };
    if (!hasStarted) return { text: 'Ready', color: 'text-white/60' };
    if (isSpeaking) return { text: 'Speaking...', color: 'text-blue-400' };
    if (isListening) return { text: 'Listening...', color: 'text-rose-400' };
    if (isPaused) return { text: 'Click to continue', color: 'text-yellow-400' };
    return { text: 'Ready to talk', color: 'text-white/60' };
  };

  const status = getStatus();

  if (!hasStarted && !sessionEnded) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 left-4 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
          <div className="flex items-center space-x-2">
            <motion.div
              className={`w-2 h-2 rounded-full ${
                isSpeaking ? 'bg-blue-400' : 
                isListening ? 'bg-rose-400' : 
                isPaused ? 'bg-yellow-400' : 'bg-white/40'
              }`}
              animate={{
                scale: (isListening || isSpeaking) ? [1, 1.3, 1] : 1,
                opacity: (isListening || isSpeaking) ? [0.7, 1, 0.7] : 0.7
              }}
              transition={{
                duration: 1.5,
                repeat: (isListening || isSpeaking) ? Infinity : 0,
                ease: "easeInOut"
              }}
            />
            <span className={`text-xs font-light ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
} 