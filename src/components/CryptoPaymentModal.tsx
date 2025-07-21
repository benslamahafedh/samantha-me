'use client';

import { useState, useEffect } from 'react';

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  sessionId: string;
}

export default function CryptoPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  sessionId
}: CryptoPaymentModalProps) {
  const [paymentAddress, setPaymentAddress] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [solAmount, setSolAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  // Create payment when modal opens
  useEffect(() => {
    if (isOpen && sessionId && sessionId.trim() !== '') {
      createPayment();
    } else if (isOpen && (!sessionId || sessionId.trim() === '')) {
      setError('Initializing session... Please wait.');
      // Try to create a new session
      const initializeSession = async () => {
        try {
          const response = await fetch('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: null })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Update the session ID in the parent component
            window.dispatchEvent(new CustomEvent('sessionInitialized', { 
              detail: { sessionId: data.sessionId } 
            }));
            createPayment();
          } else {
            setError('Failed to initialize session. Please refresh the page.');
          }
        } catch (error) {
          setError('Failed to initialize session. Please refresh the page.');
        }
      };
      
      initializeSession();
    }
  }, [isOpen, sessionId]);

  const createPayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentAddress(data.paymentAddress);
        setReferenceId(data.referenceId);
        setSolAmount(data.amount);
        setExpiresAt(data.expiresAt);
        setPaymentStatus('Payment address generated');
        startPaymentCheck();
      } else {
        if (data.error === 'Session ID is required') {
          setError('Session expired. Please refresh the page and try again.');
      } else {
        setError(data.error || 'Failed to create payment');
        }
      }
    } catch {
      setError('Failed to create payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentCheck = () => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/check-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (data.success && data.hasAccess) {
          clearInterval(checkInterval);
          setPaymentStatus('Payment confirmed!');
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
          }, 1000);
        } else {
          // Update status to show we're still checking
          setPaymentStatus('Checking for payment...');
        }
      } catch {
        // Continue checking
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      setPaymentStatus('Payment check timeout. Please refresh manually.');
    }, 300000);
  };

  const copyAddress = () => {
    if (paymentAddress) {
      navigator.clipboard.writeText(paymentAddress);
      setPaymentStatus('Address copied to clipboard!');
      setTimeout(() => setPaymentStatus('Payment address generated'), 2000);
    }
  };

  const copyReferenceId = () => {
    if (referenceId) {
      navigator.clipboard.writeText(referenceId);
      setPaymentStatus('Reference ID copied!');
      setTimeout(() => setPaymentStatus('Payment address generated'), 2000);
    }
  };

  const debugSession = async () => {
    try {
      const response = await fetch('/api/debug-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('🔍 Debug Info:', data.debugInfo);
        setPaymentStatus(`Debug: ${data.debugInfo.reason}`);
        setTimeout(() => setPaymentStatus('Payment address generated'), 5000);
      }
    } catch (error) {
      console.error('Debug error:', error);
      setPaymentStatus('Debug failed');
      setTimeout(() => setPaymentStatus('Payment address generated'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-10"
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-700/50 overflow-hidden"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20"></div>
          <div className="relative p-10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight px-2 py-1">
                  Upgrade to Premium
                </h2>
                <p className="text-indigo-100 text-lg font-medium px-2 py-1">
                  Unlimited access for 1 hour
                </p>
              </div>
        <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="text-white/80 hover:text-white transition-all duration-200 ml-8 flex-shrink-0 p-3 hover:bg-white/10 rounded-full"
                style={{ pointerEvents: 'auto' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
            </div>
          </div>
          </div>

        {/* Content */}
        <div className="p-10 space-y-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500/20 border-t-indigo-500"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <p className="text-slate-300 text-lg font-medium mt-8 px-4 py-2">Creating payment...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-sm mb-10">
                <div className="text-red-400 text-4xl mb-6 px-2 py-1">⚠️</div>
                <p className="text-red-300 text-lg font-medium px-4 py-2">{error}</p>
              </div>
            <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  createPayment();
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                style={{ pointerEvents: 'auto' }}
              >
                Try Again
            </button>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Payment Amount - Prominent Display */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
                  <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-3xl p-12 text-center backdrop-blur-sm">
                    <div className="text-slate-400 text-sm font-medium mb-6 uppercase tracking-wider px-4 py-2">Send exactly</div>
                    <div className="text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4 px-4 py-2">
                      {solAmount} SOL
                    </div>
                    <div className="text-slate-500 text-lg font-medium px-4 py-2">≈ $0.01 USD</div>
                  </div>
                </div>
              </div>

              {/* Payment Address */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300 text-lg font-semibold px-4 py-2">Payment Address</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyAddress();
                    }}
                    className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 hover:text-indigo-200 text-sm font-semibold transition-all duration-200 px-5 py-3 rounded-lg hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/30 hover:border-indigo-500/50"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm">
                  <code className="text-sm text-slate-200 break-all font-mono leading-relaxed px-2 py-1">
                    {paymentAddress}
                  </code>
                </div>
              </div>

              {/* Reference ID */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-slate-300 text-lg font-semibold px-4 py-2">Reference ID (optional)</p>
            <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyReferenceId();
                    }}
                    className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-300 hover:text-indigo-200 text-sm font-semibold transition-all duration-200 px-5 py-3 rounded-lg hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/30 hover:border-indigo-500/50"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Copy
            </button>
                </div>
                <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-6 backdrop-blur-sm">
                  <code className="text-sm text-slate-200 break-all font-mono leading-relaxed px-2 py-1">
                    {referenceId}
                  </code>
                </div>
              </div>

              {/* Status */}
              {paymentStatus && (
                <div className="flex justify-center">
                  <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-full px-10 py-5 border border-indigo-500/30 backdrop-blur-sm">
                    <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse shadow-lg"></div>
                    <p className="text-lg text-slate-200 font-semibold px-2 py-1">{paymentStatus}</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/30 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex items-start space-x-6">
                  <div className="text-blue-400 text-2xl flex-shrink-0 mt-1 px-2 py-1">💡</div>
                  <div className="flex-1">
                    <p className="text-blue-200 text-lg font-semibold mb-4 px-2 py-1">How to pay:</p>
                    <p className="text-blue-300 text-base leading-relaxed px-2 py-1">
                      Send exactly {solAmount} SOL to the address above using any Solana wallet. 
                      Payment will be detected automatically within seconds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-5 pt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                  }}
                  className="flex-1 bg-slate-700/50 text-slate-200 py-6 rounded-xl hover:bg-slate-600/50 transition-all duration-200 font-semibold text-lg border border-slate-600/50 hover:border-slate-500/50 backdrop-blur-sm"
                  style={{ pointerEvents: 'auto' }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    createPayment();
                  }}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ pointerEvents: 'auto' }}
                >
                  Refresh
                </button>
              </div>

              {/* Debug Button (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="pt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      debugSession();
                    }}
                    className="w-full bg-yellow-600/20 text-yellow-300 py-3 rounded-xl hover:bg-yellow-600/30 transition-all duration-200 font-medium text-sm border border-yellow-500/30 hover:border-yellow-500/50 backdrop-blur-sm"
                    style={{ pointerEvents: 'auto' }}
                  >
                    🔍 Debug Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 