'use client';

import { useState, useEffect } from 'react';

interface SimplePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  sessionId: string;
}

export default function SimplePaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  sessionId
}: SimplePaymentModalProps) {
  const [paymentAddress, setPaymentAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      createPayment();
    }
  }, [isOpen, sessionId]);

  const createPayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentAddress(data.paymentAddress);
        startPaymentCheck();
      } else {
        setError(data.error || 'Failed to create payment');
      }
    } catch {
      setError('Failed to create payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentCheck = () => {
    setIsChecking(true);
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
          setIsChecking(false);
          onPaymentSuccess();
          onClose();
        }
      } catch {
        // Continue checking
      }
    }, 3000); // Check every 3 seconds

    // Stop checking after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      setIsChecking(false);
    }, 300000);
  };

  const copyAddress = () => {
    if (paymentAddress) {
      navigator.clipboard.writeText(paymentAddress);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-gray-600 mb-6">
            Get unlimited access to Samantha for 1 hour
          </p>

          {isLoading ? (
            <div className="py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Creating payment...</p>
            </div>
          ) : error ? (
            <div className="py-4">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={createPayment}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Send exactly:</p>
                <p className="text-2xl font-bold text-green-600">0.01 SOL</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">To this address:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                    {paymentAddress}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {isChecking && (
                <div className="py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2 text-sm">Checking for payment...</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={createPayment}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 