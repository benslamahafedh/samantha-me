'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function SessionEnded() {
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeDiff = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${hours}h ${minutes}m`;
    };

    setTimeUntilReset(calculateTimeUntilReset());
    
    const interval = setInterval(() => {
      setTimeUntilReset(calculateTimeUntilReset());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-8 gradient-rose-pink">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 shadow-soft-rose">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-2xl font-light text-gray-800 mb-4"
          >
            Daily Limit Reached
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-gray-600 font-light mb-6 leading-relaxed"
          >
            You've used your 5 minutes of daily conversation time with Samantha. 
            Come back tomorrow for more intimate conversations!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/30 rounded-xl p-4 mb-6"
          >
            <p className="text-rose-700 font-medium mb-2">Next reset in:</p>
            <p className="text-2xl font-bold text-rose-600">{timeUntilReset}</p>
          </motion.div>
          
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-soft-rose"
          >
            Try Again
          </motion.button>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-4 text-xs text-gray-400"
          >
            Note: Daily limits reset at midnight in your local timezone
          </motion.p>
        </div>
      </motion.div>
    </main>
  );
} 