'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface MuteIndicatorProps {
  isMuted: boolean;
  className?: string;
}

export default function MuteIndicator({ isMuted, className = '' }: MuteIndicatorProps) {
  return (
    <AnimatePresence>
      {isMuted && (
        <motion.div
          className={`fixed top-4 right-4 z-50 bg-gray-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-700 ${className}`}
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">🔇 Muted</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 