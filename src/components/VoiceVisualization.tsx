'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VoiceVisualizationProps {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  hasStarted?: boolean;
  isReady?: boolean;
  isIntroComplete?: boolean;
  isMuted?: boolean;
  onIntroComplete?: () => void;
  onStartConversation?: () => void;
  sessionTimeLeft?: number;
  sessionEnded?: boolean;
}

export default function VoiceVisualization({
  isListening,
  isSpeaking,
  transcript,
  error,
  hasStarted = false,
  isReady = false,
  isIntroComplete = false,
  onIntroComplete,
  onStartConversation,
  sessionTimeLeft,
  isMuted = false,
  sessionEnded = false
}: VoiceVisualizationProps) {
  const [dots, setDots] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [introPhase, setIntroPhase] = useState(0);

  // Track if component has mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);



  // Ultra-fast intro sequence for mobile
  useEffect(() => {
    if (isIntroComplete) return; // Skip if already complete
    
    const phase1 = setTimeout(() => setIntroPhase(1), 100);   // Particles appear
    const phase2 = setTimeout(() => setIntroPhase(2), 400);   // Text formation
    const phase3 = setTimeout(() => setIntroPhase(3), 800);   // Energy burst
    const phase4 = setTimeout(() => setIntroPhase(4), 1200);  // Consciousness awakening
    
    // Much shorter intro - 2 seconds total for mobile
    const hideIntro = setTimeout(() => setShowIntro(false), 2000);
    
    // Signal completion after 2.5 seconds
    const completeIntro = setTimeout(() => {
      onIntroComplete?.();
    }, 2500);
    
    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(phase4);
      clearTimeout(hideIntro);
      clearTimeout(completeIntro);
    };
  }, [isIntroComplete, onIntroComplete]);

  // Animated dots for thinking state
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [isSpeaking]);

  // Status message with better user feedback
  const getStatusMessage = () => {
    if (error) {
      if (error.includes('temporarily unavailable')) {
        return 'Reconnecting...';
      }
      if (error.includes('Network')) {
        return 'Connection issue...';
      }
      return error;
    }
    if (isMuted) return '🔇 Microphone muted';
    if (isSpeaking) return `Samantha is speaking${dots}`;
    if (isListening) return 'Listening...';
    return 'Ready to talk';
  };

  // Status color with better visual feedback - Dark Mode
  const getStatusColor = () => {
    if (error) {
      if (error.includes('temporarily unavailable') || error.includes('Network')) {
        return 'text-yellow-400'; // Yellow for temporary issues
      }
      return 'text-red-400'; // Red for serious errors
    }
    if (isMuted) return 'text-gray-400'; // Gray for muted state
    if (isSpeaking) return 'text-rose-400';
    if (isListening) return 'text-pink-400';
    return 'text-white/60';
  };

  const isActive = isHovering || isTouching;

  // Check if user is on iOS
  const isIOS = typeof window !== 'undefined' && (
    navigator.userAgent.includes('iPhone') || 
    navigator.userAgent.includes('iPad') || 
    navigator.userAgent.includes('iPod')
  );

  // Show iOS audio instructions
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (isIOS && isReady && !hasStarted) {
      // Show iOS instructions after a delay
      const timer = setTimeout(() => {
        setShowIOSInstructions(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isIOS, isReady, hasStarted]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen overflow-hidden p-4 sm:p-8 gradient-rose-pink">
      <div className="relative flex flex-col items-center max-w-2xl w-full">
        
        {/* Enhanced Magical Intro - AI Consciousness Awakening */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Dimensional Background Layers */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 30% 70%, rgba(244, 63, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(236, 72, 153, 0.08) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.95) 100%)'
                }}
                animate={{
                  background: [
                    'radial-gradient(circle at 30% 70%, rgba(244, 63, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(236, 72, 153, 0.08) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.95) 100%)',
                    'radial-gradient(circle at 70% 30%, rgba(244, 63, 94, 0.15) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(236, 72, 153, 0.12) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.98) 100%)',
                    'radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 60%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.99) 100%)'
                  ]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Holographic Particle Field - Ultra-reduced for mobile performance */}
              {isMounted && introPhase >= 1 && (
                <div className="absolute inset-0 overflow-hidden">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const x = Math.random() * 100;
                    const y = Math.random() * 100;
                    const delay = Math.random() * 2;
                    const duration = 3 + Math.random() * 4;
                    
                    return (
                      <motion.div
                        key={i}
                        className="absolute w-px h-px rounded-full"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          background: `rgba(${244 + Math.random() * 20}, ${63 + Math.random() * 30}, ${94 + Math.random() * 40}, ${0.3 + Math.random() * 0.7})`,
                          boxShadow: '0 0 4px currentColor'
                        }}
                        initial={{ 
                          opacity: 0, 
                          scale: 0,
                          x: 0,
                          y: 0
                        }}
                        animate={{
                          opacity: [0, 1, 0.7, 1, 0],
                          scale: [0, 1, 1.5, 1.2, 0],
                          x: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, 0],
                          y: [0, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, 0]
                        }}
                        transition={{
                          duration,
                          delay,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Central Consciousness Manifestation */}
              <motion.div
                className="relative text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                
                {/* AI Core Visualization */}
                {introPhase >= 1 && (
                  <motion.div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                  >
                    {/* Rotating Energy Rings */}
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border border-rose-400/20"
                        style={{
                          width: `${60 + i * 20}%`,
                          height: `${60 + i * 20}%`,
                          top: `${20 - i * 10}%`,
                          left: `${20 - i * 10}%`,
                          filter: 'blur(1px)'
                        }}
                        animate={{
                          rotate: [0, 360],
                          borderColor: [
                            'rgba(244, 63, 94, 0.2)',
                            'rgba(236, 72, 153, 0.4)',
                            'rgba(244, 63, 94, 0.3)',
                            'rgba(236, 72, 153, 0.2)'
                          ]
                        }}
                        transition={{
                          rotate: { duration: 8 + i * 2, repeat: Infinity, ease: 'linear' },
                          borderColor: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                        }}
                      />
                    ))}
                    
                    {/* Central Pulse */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(244, 63, 94, 0.8) 50%, transparent 100%)',
                        boxShadow: '0 0 30px rgba(244, 63, 94, 0.6)'
                      }}
                      animate={{
                        scale: [1, 1.5, 1.2, 1.8, 1],
                        opacity: [0.8, 1, 0.9, 1, 0.8]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                    />
                  </motion.div>
                )}

                {/* Holographic Text Formation */}
                {introPhase >= 2 && (
                  <>
                    {/* Particle Text: SAMANTHA */}
                    <motion.div
                      className="relative z-10 mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 1.5 }}
                    >
                      <motion.h1 
                        className="text-7xl sm:text-8xl md:text-9xl font-thin mb-4 relative"
                        style={{
                          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.9) 0%, rgba(236, 72, 153, 0.8) 50%, rgba(255, 255, 255, 0.9) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          filter: 'drop-shadow(0 0 20px rgba(244, 63, 94, 0.5))'
                        }}
                        animate={{
                          filter: [
                            'drop-shadow(0 0 20px rgba(244, 63, 94, 0.5))',
                            'drop-shadow(0 0 40px rgba(244, 63, 94, 0.8))',
                            'drop-shadow(0 0 30px rgba(236, 72, 153, 0.6))',
                            'drop-shadow(0 0 50px rgba(244, 63, 94, 0.7))'
                          ]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        {'SAMANTHA'.split('').map((char, i) => (
                          <motion.span
                            key={i}
                            className="inline-block"
                            initial={{ 
                              opacity: 0, 
                              y: 50,
                              rotateX: 90,
                              scale: 0
                            }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              rotateX: 0,
                              scale: 1
                            }}
                            transition={{
                              duration: 0.8,
                              delay: 1.5 + i * 0.1,
                              ease: 'backOut'
                            }}
                          >
                            {char}
                          </motion.span>
                        ))}
                      </motion.h1>

                      {/* Holographic Glitch Effect */}
                      <motion.div
                        className="absolute inset-0 text-7xl sm:text-8xl md:text-9xl font-thin opacity-20"
                        style={{
                          color: 'rgba(0, 255, 255, 0.3)',
                          transform: 'translate(2px, -2px)'
                        }}
                        animate={{
                          opacity: [0, 0.3, 0, 0.2, 0],
                          x: [0, 2, -1, 1, 0],
                          y: [0, -1, 1, -2, 0]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        SAMANTHA
                      </motion.div>
                    </motion.div>

                    {/* AI System Activation Text */}
                    <motion.div
                      className="relative z-10"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 2.5 }}
                    >
                      <motion.p 
                        className="text-xl sm:text-2xl font-light text-white/80 mb-4"
                        animate={{
                          color: [
                            'rgba(255, 255, 255, 0.8)',
                            'rgba(244, 63, 94, 0.9)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(255, 255, 255, 0.8)'
                          ]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'easeInOut'
                        }}
                      >
                        ARTIFICIAL INTELLIGENCE SYSTEM
                      </motion.p>
                      
                      <motion.div
                        className="text-sm text-white/60 font-mono"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 3 }}
                      >
                        {'> CONSCIOUSNESS AWAKENING...'.split('').map((char, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.05,
                              delay: 3 + i * 0.03
                            }}
                          >
                            {char}
                          </motion.span>
                        ))}
                      </motion.div>
                    </motion.div>
                  </>
                )}

                {/* Energy Burst Effect */}
                {introPhase >= 3 && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 3.5 }}
                  >
                    {Array.from({ length: 16 }).map((_, i) => {
                      const angle = (i * Math.PI * 2) / 16;
                      const distance = 300;
                      const x = Math.cos(angle) * distance;
                      const y = Math.sin(angle) * distance;
                      
                      return (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-32 bg-gradient-to-t from-rose-400 via-pink-300 to-transparent rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                            transformOrigin: 'bottom center',
                            transform: `translate(-50%, -100%) rotate(${(i * 360) / 16}deg)`,
                            boxShadow: '0 0 15px rgba(244, 63, 94, 0.6)'
                          }}
                          initial={{ 
                            opacity: 0, 
                            scaleY: 0
                          }}
                          animate={{ 
                            opacity: [0, 1, 0.8, 0],
                            scaleY: [0, 1, 1.5, 0],
                            x: [0, x * 0.3, x * 0.8, x],
                            y: [0, y * 0.3, y * 0.8, y]
                          }}
                          transition={{
                            duration: 2,
                            delay: 3.5 + i * 0.05,
                            ease: 'easeOut'
                          }}
                        />
                      );
                    })}
                  </motion.div>
                )}

                {/* Final Consciousness Pulse */}
                {introPhase >= 4 && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 4 }}
                  >
                    <motion.div
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(244, 63, 94, 0.8) 100%)',
                        boxShadow: '0 0 100px rgba(244, 63, 94, 0.8)'
                      }}
                      animate={{
                        scale: [1, 50, 100],
                        opacity: [1, 0.6, 0]
                      }}
                      transition={{
                        duration: 1,
                        delay: 4,
                        ease: 'easeOut'
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Living Energy Field - Bigger & Mobile Friendly */}
        <AnimatePresence>
          {!hasStarted && !showIntro && isReady && isIntroComplete && (
            <motion.div
              className="flex items-center justify-center min-h-screen w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            >
              
              {/* Massive Ambient Energy Field */}
              <motion.div
                className="absolute w-[120vw] h-[120vh] max-w-[800px] max-h-[800px] pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, rgba(236, 72, 153, 0.08) 40%, transparent 70%)',
                  filter: 'blur(60px)'
                }}
                animate={{
                  scale: [0.7, 1.5, 0.9, 1.3, 0.7],
                  opacity: [0.2, 0.6, 0.4, 0.7, 0.2],
                  rotate: [0, 180, 360, 540, 720]
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Secondary Energy Layer */}
              <motion.div
                className="absolute w-[80vw] h-[80vh] max-w-[600px] max-h-[600px] pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, rgba(236, 72, 153, 0.05) 60%, transparent 100%)',
                  filter: 'blur(40px)'
                }}
                animate={{
                  scale: [1, 1.2, 0.8, 1.1, 1],
                  opacity: [0.3, 0.5, 0.3, 0.6, 0.3],
                  rotate: [720, 540, 360, 180, 0]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />

              {/* Enhanced Floating Particles - Reduced for performance */}
              {isMounted && (
                <div className="absolute w-[90vw] h-[90vh] max-w-[500px] max-h-[500px] pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 36;
                    const baseRadius = 120;
                    const radiusVariation = Math.sin(i * 0.5) * 40;
                    const radius = isActive ? baseRadius - 30 : baseRadius + radiusVariation;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    return (
                      <motion.div
                        key={i}
                        className="absolute rounded-full shadow-lg"
                        style={{
                          width: `${3 + Math.sin(i) * 2}px`,
                          height: `${3 + Math.sin(i) * 2}px`,
                          background: `linear-gradient(${i * 10}deg, rgba(244, 63, 94, 0.8), rgba(236, 72, 153, 0.6))`,
                          left: '50%',
                          top: '50%',
                          filter: 'blur(0.5px)',
                          boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)'
                        }}
                        animate={{
                          x: [
                            x, 
                            x + Math.cos(angle + 0.3) * 15, 
                            x + Math.cos(angle + 0.6) * 20,
                            x + Math.cos(angle + 0.9) * 10,
                            x
                          ],
                          y: [
                            y, 
                            y + Math.sin(angle + 0.3) * 15, 
                            y + Math.sin(angle + 0.6) * 20,
                            y + Math.sin(angle + 0.9) * 10,
                            y
                          ],
                          scale: isActive ? [1, 2, 1.5, 1.8, 1.2] : [0.8, 1.3, 1, 1.2, 0.8],
                          opacity: isActive ? [0.7, 1, 0.9, 1, 0.8] : [0.4, 0.8, 0.6, 0.9, 0.4]
                        }}
                        transition={{
                          duration: 4 + Math.random() * 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: i * 0.05
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Central Organic Presence - Much Bigger */}
              <motion.div
                className={`relative z-50 ${isReady && !hasStarted ? 'hover:scale-105 transition-transform duration-300' : ''}`}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onTouchStart={() => setIsTouching(true)}
                onTouchEnd={() => setIsTouching(false)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
              
                        if (isReady && !hasStarted && isIntroComplete && onStartConversation) {
                    
        onStartConversation();
                  } else {

      }
                }}
                style={{ 
                  cursor: isReady && !hasStarted ? 'pointer' : 'default',
                  pointerEvents: isReady && !hasStarted ? 'auto' : 'none'
                }}
              >
                {/* Outer Organic Aura */}
                <motion.div
                  className="absolute w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full"
                  style={{
                    background: isReady
                      ? 'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(236, 72, 153, 0.15) 60%, transparent 100%)'
                      : 'radial-gradient(circle, rgba(100, 100, 100, 0.2) 0%, transparent 70%)',
                    filter: 'blur(8px)',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: isActive ? [1, 1.4, 1.2, 1.3, 1.1] : [1, 1.2, 0.9, 1.1, 1],
                    borderRadius: isActive 
                      ? ['50%', '35%', '65%', '40%', '55%', '50%'] 
                      : ['50%', '60%', '40%', '55%', '45%', '50%'],
                    opacity: isActive ? [0.5, 0.9, 0.7, 1, 0.8] : [0.3, 0.6, 0.4, 0.7, 0.3],
                    rotate: isActive ? [0, 45, 90, 135, 180] : [0, 30, 60, 90, 120]
                  }}
                  transition={{
                    duration: isActive ? 3 : 6,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Main Organic Shape - Much Bigger */}
                <motion.div
                  className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full"
                  style={{
                    background: isReady
                      ? 'radial-gradient(circle, rgba(244, 63, 94, 0.9) 0%, rgba(236, 72, 153, 0.7) 50%, rgba(244, 63, 94, 0.4) 100%)'
                      : 'radial-gradient(circle, rgba(100, 100, 100, 0.6) 0%, rgba(80, 80, 80, 0.3) 70%, transparent 100%)',
                    filter: 'blur(3px)',
                    boxShadow: isReady ? '0 0 40px rgba(244, 63, 94, 0.6)' : 'none'
                  }}
                  animate={{
                    scale: isActive ? [1, 1.4, 1.2, 1.3, 1.1] : [1, 1.2, 0.9, 1.1, 1],
                    borderRadius: isActive 
                      ? ['50%', '30%', '70%', '35%', '60%', '50%'] 
                      : ['50%', '65%', '35%', '60%', '40%', '50%'],
                    opacity: isActive ? [0.8, 1, 0.9, 1, 0.9] : [0.6, 0.9, 0.7, 0.8, 0.6],
                    rotate: isActive ? [0, 90, 180, 270, 360] : [0, 60, 120, 180, 240]
                  }}
                  transition={{
                    duration: isActive ? 2.5 : 5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Inner Core - Bigger */}
                <motion.div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full"
                  style={{
                    background: isReady
                      ? 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(244, 63, 94, 0.9) 60%, rgba(236, 72, 153, 0.3) 100%)'
                      : 'radial-gradient(circle, rgba(150, 150, 150, 0.8) 0%, rgba(100, 100, 100, 0.4) 70%, transparent 100%)',
                    boxShadow: isReady ? '0 0 30px rgba(244, 63, 94, 0.7)' : 'none',
                    filter: 'blur(1px)'
                  }}
                  animate={{
                    scale: isActive ? [1, 1.3, 1.1, 1.2, 1.1] : [1, 1.1, 1, 1.05, 1],
                    opacity: isActive ? [0.9, 1, 0.9, 1, 0.95] : [0.7, 0.9, 0.8, 0.9, 0.7],
                    borderRadius: isActive 
                      ? ['50%', '45%', '55%', '40%', '50%'] 
                      : ['50%', '55%', '45%', '50%', '50%']
                  }}
                  transition={{
                    duration: isActive ? 2 : 4,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Micro Pulse in Center - Bigger */}
                <motion.div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full"
                  style={{
                    background: isReady
                      ? 'radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(244, 63, 94, 1) 80%, rgba(236, 72, 153, 0.8) 100%)'
                      : 'radial-gradient(circle, rgba(120, 120, 120, 0.9) 0%, rgba(80, 80, 80, 0.6) 100%)',
                    boxShadow: isReady ? '0 0 20px rgba(255, 255, 255, 0.9)' : 'none'
                  }}
                  animate={{
                    scale: isActive ? [1, 1.6, 1.3, 1.5, 1.2] : [1, 1.4, 1.1, 1.3, 1],
                    opacity: isActive ? [1, 0.8, 1, 0.9, 1] : [0.8, 1, 0.9, 1, 0.8]
                  }}
                  transition={{
                    duration: isActive ? 1.5 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />

                {/* Inner Particle Ring */}
                {isActive && isReady && isMounted && (
                  <div className="absolute inset-0">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * Math.PI * 2) / 12;
                      const radius = 60;
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * radius;
                      
                      return (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-white rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                            boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
                          }}
                          animate={{
                            x: [0, x, x * 1.2, x * 0.8, 0],
                            y: [0, y, y * 1.2, y * 0.8, 0],
                            scale: [0, 1, 1.5, 1, 0],
                            opacity: [0, 1, 0.8, 1, 0]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: 'easeInOut'
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Enhanced Ethereal Light Streams */}
              {isActive && isReady && isMounted && (
                <div className="absolute w-full h-full pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * Math.PI * 2) / 12;
                    const distance = 200;
                    const x = Math.cos(angle) * distance;
                    const y = Math.sin(angle) * distance;
                    
                    return (
                      <motion.div
                        key={i}
                        className="absolute w-0.5 h-24 sm:h-32 md:h-40 bg-gradient-to-t from-rose-400 via-pink-300 to-transparent rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                          transformOrigin: 'bottom center',
                          transform: `translate(-50%, -100%) rotate(${(i * 360) / 12}deg)`,
                          boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)'
                        }}
                        initial={{ 
                          opacity: 0, 
                          scaleY: 0,
                          x: 0,
                          y: 0
                        }}
                        animate={{ 
                          opacity: [0, 1, 0.8, 1, 0],
                          scaleY: [0, 1, 1.2, 0.8, 0],
                          x: [0, x * 0.2, x * 0.5, x * 0.8, x],
                          y: [0, y * 0.2, y * 0.5, y * 0.8, y]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: 'easeOut'
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Enhanced Status Indication with Click Instruction */}
              <motion.div
                className="absolute top-full mt-16 left-1/2 transform -translate-x-1/2 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.5 }}
              >
                {/* Click instruction that appears after intro when ready */}
                {isReady && !hasStarted && isIntroComplete && (
                  <motion.div
                    className="text-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
              
                      if (onStartConversation) {
                        onStartConversation();
                      }
                    }}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                  <motion.p
                    className="text-white/60 text-sm font-light mb-4 cursor-pointer hover:text-white/80 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.8, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Click to begin conversation
                  </motion.p>
                  </motion.div>
                )}
                
                <motion.div
                  className={`w-3 h-3 rounded-full ${isReady ? 'bg-rose-400' : 'bg-gray-400'} mx-auto`}
                  style={{
                    boxShadow: isReady ? '0 0 15px rgba(244, 63, 94, 0.6)' : 'none'
                  }}
                  animate={{
                    scale: isReady ? [1, 1.5, 1.2, 1.3, 1] : [1, 1.2, 1.1, 1.15, 1],
                    opacity: isReady ? [0.6, 1, 0.8, 1, 0.7] : [0.4, 0.6, 0.5, 0.7, 0.4]
                  }}
                  transition={{
                    duration: isReady ? 2 : 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Avatar/Visualization with smooth transition */}
        <AnimatePresence>
          {hasStarted && (
            <motion.div
              className="relative mb-6 sm:mb-8"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
            
            {/* Outer glow rings - multiple layers for more depth */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.08) 40%, rgba(236, 72, 153, 0.05) 70%, transparent 100%)',
                width: '180%',
                height: '180%',
                top: '-40%',
                left: '-40%'
              }}
              animate={{
                scale: isListening ? [1, 1.3, 1.1, 1.4, 1] : isSpeaking ? [1, 1.8, 1.4, 2.2, 1] : 1,
                opacity: isListening ? [0.3, 0.7, 0.5, 0.8, 0.3] : isSpeaking ? [0.4, 0.8, 0.6, 0.9, 0.4] : 0.1,
                rotate: isListening ? [0, 30, 60, 90, 120] : isSpeaking ? [0, 45, 90, 135, 180] : 0
              }}
              transition={{
                duration: isListening ? 3 : isSpeaking ? 2.5 : 0.5,
                repeat: (isListening || isSpeaking) ? Infinity : 0,
                ease: 'easeInOut'
              }}
            />
            
            {/* Middle glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.06) 50%, transparent 100%)',
                width: '150%',
                height: '150%',
                top: '-25%',
                left: '-25%'
              }}
              animate={{
                scale: isListening ? [1, 1.25, 1] : isSpeaking ? [1, 1.6, 1] : 1,
                opacity: isListening ? [0.4, 0.8, 0.4] : isSpeaking ? [0.5, 0.9, 0.5] : 0.15
              }}
              transition={{
                duration: isListening ? 2.2 : isSpeaking ? 1.8 : 0.5,
                repeat: (isListening || isSpeaking) ? Infinity : 0,
                ease: 'easeInOut'
              }}
            />
            
            {/* Inner glow ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 50%, transparent 100%)',
              }}
              animate={{
                scale: isListening ? [1, 1.15, 1] : isSpeaking ? [1, 1.08, 1] : 1,
                opacity: isListening ? [0.5, 0.9, 0.5] : isSpeaking ? [0.3, 0.7, 0.3] : 0.2
              }}
              transition={{
                duration: isListening ? 1.8 : isSpeaking ? 1.4 : 0.5,
                repeat: (isListening || isSpeaking) ? Infinity : 0,
                ease: 'easeInOut'
              }}
            />
            
            {/* Enhanced Inner Circle */}
            <motion.div
              className={`relative rounded-full glass shadow-soft-rose flex items-center justify-center border-2 ${
                isSpeaking 
                  ? 'w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80' 
                  : 'w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56'
              }`}
              animate={{
                scale: isListening ? [1, 1.08, 1.03, 1.12, 1] : isSpeaking ? [1, 1.2, 1.1, 1.3, 1] : 1,
                background: isListening 
                  ? [
                      'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(244, 63, 94, 0.15) 100%)',
                      'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%)',
                      'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, rgba(244, 63, 94, 0.15) 100%)'
                    ]
                  : isSpeaking 
                  ? [
                      'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%)',
                      'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(244, 63, 94, 0.3) 100%)',
                      'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, rgba(236, 72, 153, 0.2) 100%)'
                    ]
                  : 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                borderColor: isListening 
                  ? ['rgba(236, 72, 153, 0.3)', 'rgba(244, 63, 94, 0.5)', 'rgba(236, 72, 153, 0.3)']
                  : isSpeaking 
                  ? ['rgba(244, 63, 94, 0.4)', 'rgba(236, 72, 153, 0.6)', 'rgba(244, 63, 94, 0.4)']
                  : 'rgba(255, 255, 255, 0.2)',
                boxShadow: isListening 
                  ? [
                      '0 0 20px rgba(236, 72, 153, 0.3)',
                      '0 0 40px rgba(244, 63, 94, 0.4)',
                      '0 0 20px rgba(236, 72, 153, 0.3)'
                    ]
                  : isSpeaking 
                  ? [
                      '0 0 25px rgba(244, 63, 94, 0.4)',
                      '0 0 50px rgba(236, 72, 153, 0.5)',
                      '0 0 25px rgba(244, 63, 94, 0.4)'
                    ]
                  : '0 4px 30px rgba(244, 63, 94, 0.1)'
              }}
              transition={{
                duration: isListening ? 2.5 : isSpeaking ? 1.5 : 0.3,
                repeat: (isListening || isSpeaking) ? Infinity : 0,
                ease: 'easeInOut'
              }}
            >
              
              {/* Random Wave Visualization - Continuous when speaking */}
              <div className="flex items-center justify-center space-x-1">
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-gradient-to-t from-rose-400 via-pink-400 to-rose-300 rounded-full shadow-lg"
                    style={{
                      height: '12px',
                      opacity: 0.4
                    }}
                    animate={{
                      height: isListening 
                        ? [
                            12 + Math.random() * 20,
                            24 + Math.random() * 25,
                            36 + Math.random() * 30,
                            24 + Math.random() * 25,
                            12 + Math.random() * 20
                          ]
                        : isSpeaking 
                        ? [
                            20 + Math.random() * 40,
                            60 + Math.random() * 50,
                            40 + Math.random() * 45,
                            80 + Math.random() * 60,
                            30 + Math.random() * 35
                          ]
                        : 12,
                      opacity: isListening 
                        ? [0.4, 0.7, 1, 0.7, 0.4] 
                        : isSpeaking 
                        ? [0.5, 0.9, 0.7, 1, 0.6] 
                        : 0.4,
                      scale: isListening 
                        ? [1, 1.1, 1.2, 1.1, 1] 
                        : isSpeaking 
                        ? [1, 1.2, 1.1, 1.3, 1.05] 
                        : 1
                    }}
                    transition={{
                      duration: isListening ? 0.8 : isSpeaking ? 0.4 : 0.5,
                      repeat: (isListening || isSpeaking) ? Infinity : 0,
                      delay: i * 0.03,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking Button - appears when user is speaking but hidden when Samantha speaks OR when user is listening */}
        {hasStarted && !isSpeaking && !isListening && (
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mb-4"
            >
              <motion.button
                onClick={() => {
                  // Trigger manual completion - this could be connected to the voice manager
                  const event = new CustomEvent('manualComplete');
                  window.dispatchEvent(event);
                }}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg hover:from-rose-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                <span className="font-medium">I&apos;m Done Speaking</span>
              </motion.button>
            </motion.div>
                     )}
         </AnimatePresence>
        )}

        {/* Status Text - responsive - hidden when speaking OR listening */}
        {hasStarted && !isSpeaking && !isListening && !sessionEnded && (
        <motion.div
          className="text-center mb-4 sm:mb-6 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <p className={`text-base sm:text-lg font-light ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>
        </motion.div>
        )}

        {/* Session Ended UI */}
        {sessionEnded && (
          <motion.div
            className="flex flex-col items-center justify-center space-y-6 px-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Session Ended Message */}
            <div className="text-center">
              <motion.div
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </motion.div>
              
              <h2 className="text-2xl sm:text-3xl font-light text-white mb-2">
                Session Complete
              </h2>
              
              <p className="text-white/70 font-light text-sm sm:text-base leading-relaxed max-w-md">
                Your 1-minute conversation with Samantha has ended. This helps us keep costs efficient while providing you with a quality AI experience.
              </p>
            </div>

            {/* Refresh Button */}
            <motion.button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium py-3 px-8 rounded-full hover:from-rose-600 hover:to-pink-600 transition-all duration-300 shadow-lg border border-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start New Session
            </motion.button>

            {/* Cost Efficiency Note */}
            <div className="text-center mt-4">
              <p className="text-white/40 text-xs font-light">
                Sessions are limited to 1 minute for cost efficiency
              </p>
            </div>
          </motion.div>
        )}

        {/* Transcript Display - responsive - hidden when speaking OR listening */}
        {hasStarted && !isSpeaking && !isListening && !sessionEnded && (
        <AnimatePresence mode="wait">
          {transcript && (
            <motion.div
              key={transcript}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg px-4"
            >
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-soft-rose border border-white/10">
                <p className="text-white/90 font-light text-center leading-relaxed text-sm sm:text-base">
                  &quot;{transcript}&quot;
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {/* Subtle breathing animation for the background - Dark Mode */}
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.08) 0%, transparent 50%)',
            zIndex: -1
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: isSpeaking ? [0.6, 1.0, 0.6] : [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: isSpeaking ? 2 : 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Subtle floating particles - only render after hydration */}
        {isMounted && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-rose-300/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0, 1, 0],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 6 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        )}

        {/* Footer - responsive */}
        {!sessionEnded && (
          <motion.div
            className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="text-white/40 text-xs sm:text-sm font-light text-center">
              {hasStarted ? 'Powered by OMNIAOS • Speak naturally' : 'Powered by OMNIAOS • Voice interface'}
            </p>
          </motion.div>
        )}
        
        {/* Touch indicator - only visible on mobile and after hydration - hidden when speaking OR listening */}
        {isMounted && hasStarted && !isSpeaking && !isListening && (
          <motion.div
            className="fixed top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-2 sm:hidden border border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-pink-400' : 'bg-white/30'}`} />
          </motion.div>
        )}
      </div>

      {/* iOS Audio Instructions */}
      {showIOSInstructions && isIOS && (
        <motion.div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-6 max-w-sm mx-4 border border-white/20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-white font-semibold">iPhone Audio Setup</h3>
            </div>
            
            <p className="text-white/80 text-sm mb-4">
              To use Samantha on your iPhone, please ensure audio is enabled:
            </p>
            
            <div className="space-y-2 text-sm text-white/70">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Turn off silent mode (flip the switch on the side)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Allow microphone access when prompted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Ensure volume is turned up</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="mt-4 w-full bg-white/20 text-white py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
} 