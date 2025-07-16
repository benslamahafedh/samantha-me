'use client';

import { useState, useEffect } from 'react';
import PaymentModal from '@/components/PaymentModal';
import { getSessionManager } from '@/lib/sessionManager';

export default function SessionEnded() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [timeUsed, setTimeUsed] = useState(0);

  useEffect(() => {
    const sessionManager = getSessionManager();
    const sessionData = sessionManager.getSessionData();
    
    if (sessionData) {
      setTimeUsed(sessionData.totalTimeUsed);
      
      // If user has already paid, redirect back to main page
      if (sessionData.isPaid) {
        window.location.href = '/';
        return;
      }
    }

    // Ensure session is completely ended and blocked
    sessionManager.endSession();
    
    // Log that access is blocked
    console.log('🔒 Session ended page - blocking all voice access');
  }, []);

  const handlePaymentSuccess = () => {
    // Redirect back to main page after successful payment
    window.location.href = '/';
  };

  const handleTryAgain = () => {
    // Check if user can start a new session
    const sessionManager = getSessionManager();
    const canStart = sessionManager.canStartSession();
    
    if (canStart) {
      window.location.href = '/';
    } else {
      setShowPaymentModal(true);
    }
  };

  return (
    <main className="min-h-screen gradient-rose-pink relative overflow-hidden flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        <div className="glass-card rounded-3xl p-8 backdrop-blur-sm border border-white/10">
          {/* Session ended icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-rose-400 to-pink-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            Session Time Expired
          </h1>
          
          <p className="text-white/80 mb-2">
            You&apos;ve used your {Math.floor(timeUsed / 60)} minute free trial with Samantha.
          </p>
          
          <p className="text-white/60 text-sm mb-6">
            To continue enjoying unlimited conversations with your AI assistant, please upgrade to premium access.
          </p>

          {/* Benefits list */}
          <div className="text-left mb-6 space-y-2">
            <div className="flex items-center text-white/80 text-sm">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unlimited conversation time
            </div>
            <div className="flex items-center text-white/80 text-sm">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Advanced AI responses
            </div>
            <div className="flex items-center text-white/80 text-sm">
              <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Priority support
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Upgrade for 0.01 SOL
            </button>
            
            <button
              onClick={handleTryAgain}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-2xl transition-all duration-200 border border-white/20"
            >
              Try Again
            </button>
          </div>

          <p className="text-white/50 text-xs mt-4">
            Secure payments powered by Solana blockchain
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </main>
  );
} 