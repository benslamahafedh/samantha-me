'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VoiceVisualizationProps {
  isListening: boolean;
  isSpeaking: boolean;
  hasStarted?: boolean;
  isReady?: boolean;
  isIntroComplete?: boolean;
  onIntroComplete?: () => void;
  onStartConversation?: () => void;
  sessionTimeLeft?: number;
  sessionEnded?: boolean;
}

export default function VoiceVisualization({
  isListening,
  isSpeaking,
  hasStarted = false,
  isReady = false,
  isIntroComplete = false,
  onIntroComplete,
  onStartConversation,
  sessionTimeLeft = 60,
  sessionEnded = false
}: VoiceVisualizationProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);
  
  // Auto-advance intro
  useEffect(() => {
    if (!showIntro) return;
    
    const timer = setTimeout(() => {
      if (introStep < 2) {
        setIntroStep(prev => prev + 1);
      } else {
        setShowIntro(false);
        onIntroComplete?.();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [introStep, showIntro, onIntroComplete]);

  // Session time formatting
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Intro sequence
  if (showIntro && !isIntroComplete) {
    const introTexts = [
      "Welcome to Samantha",
      "Your AI companion",
      "Click the orbit to begin"
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900/20 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center z-10"
        >
          <motion.h1
            key={introStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-4xl md:text-6xl font-light text-white mb-8"
          >
            {introTexts[introStep]}
          </motion.h1>
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="w-2 h-2 bg-rose-400 rounded-full mx-auto animate-pulse"
          />
        </motion.div>
      </div>
    );
  }

  // Main voice interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900/20 to-slate-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent"></div>
      
      {/* Session timer (top right) */}
      {hasStarted && !sessionEnded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 right-6 z-20"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <span className="text-white font-mono text-sm">
              {formatTime(sessionTimeLeft)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Central orbit visualization */}
      <div className="relative z-10">
        <motion.div
          className="relative w-64 h-64 md:w-80 md:h-80"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          {/* Main orbit */}
          <motion.div
            className={`absolute inset-0 rounded-full border-2 transition-all duration-700 cursor-pointer ${
              hasStarted
                ? isListening
                  ? 'border-rose-400 shadow-[0_0_50px_rgba(244,63,94,0.5)]'
                  : isSpeaking
                  ? 'border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)]'
                  : 'border-white/30'
                : 'border-white/50 hover:border-rose-400/70'
            }`}
            onClick={() => {
              if (!hasStarted && isReady) {
                onStartConversation?.();
              }
            }}
            whileHover={!hasStarted ? { scale: 1.05 } : {}}
            whileTap={!hasStarted ? { scale: 0.95 } : {}}
          >
            {/* Inner glow */}
            <div 
              className={`absolute inset-4 rounded-full transition-all duration-700 ${
                isListening
                  ? 'bg-gradient-to-br from-rose-500/20 to-pink-500/20'
                  : isSpeaking
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                  : 'bg-gradient-to-br from-white/5 to-rose-500/10'
              }`}
            />
            
            {/* Center dot */}
            <motion.div
              className={`absolute top-1/2 left-1/2 w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 ${
                isListening
                  ? 'bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                  : isSpeaking
                  ? 'bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]'
                  : 'bg-white/70'
              }`}
              animate={
                isListening || isSpeaking
                  ? {
                      scale: [1, 1.5, 1],
                      opacity: [0.7, 1, 0.7],
                    }
                  : { scale: 1, opacity: 0.7 }
              }
              transition={{
                duration: 1.5,
                repeat: isListening || isSpeaking ? Infinity : 0,
                ease: "easeInOut"
              }}
            />
          </motion.div>

          {/* Breathing animation rings */}
          {(isListening || isSpeaking) && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute inset-0 rounded-full border ${
                    isListening ? 'border-rose-400/30' : 'border-blue-400/30'
                  }`}
                  animate={{
                    scale: [1, 1.5, 2],
                    opacity: [0.5, 0.3, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Status text */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {!hasStarted ? (
            <p className="text-white/70 text-lg font-light">
              Click to start conversation
            </p>
          ) : isListening ? (
            <p className="text-rose-400 text-lg font-light">
              Listening...
            </p>
          ) : isSpeaking ? (
            <p className="text-blue-400 text-lg font-light">
              Speaking...
            </p>
          ) : (
            <p className="text-white/50 text-lg font-light">
              Voice conversation active
            </p>
          )}
        </motion.div>
      </div>

      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
} 