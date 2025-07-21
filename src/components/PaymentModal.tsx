'use client';

import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

// Payment configuration - 1 SOL for permanent access
const PAYMENT_AMOUNT = parseFloat(process.env.NEXT_PUBLIC_PAYMENT_AMOUNT_SOL || '0.00001'); // 1 SOL for lifetime access
// Replace this with your actual Solana wallet address where you want to receive payments
const RECEIVER_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS || 
  'HiUtCXm3qZ2TG6hgnc6ABfUtuf7HkBmDK3ZEZ2oMK7m6' // IMPORTANT: Replace with your actual wallet address
);

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess }: PaymentModalProps) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handlePayment = useCallback(async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create connection - Use multiple RPC endpoints as fallback
      const rpcEndpoints = [
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
        'https://solana-mainnet.g.alchemy.com/v2/demo', // Free Alchemy endpoint
        'https://api.mainnet-beta.solana.com',
        'https://solana-api.projectserum.com',
        'https://rpc.ankr.com/solana'
      ].filter(Boolean);

      let connection: Connection | null = null;
      let lastError: Error | null = null;

      // Try each endpoint until one works
      for (const endpoint of rpcEndpoints) {
        try {
          connection = new Connection(endpoint!, 'confirmed');
          // Test the connection
          await connection.getLatestBlockhash();
          console.log('Connected to RPC:', endpoint);
          break;
        } catch (err) {
          console.warn(`Failed to connect to ${endpoint}:`, err);
          lastError = err as Error;
          continue;
        }
      }

      if (!connection) {
        throw new Error(`Failed to connect to any RPC endpoint. ${lastError?.message || ''}`);
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: PAYMENT_AMOUNT * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      // Mark session as paid
      // Verify the payment on blockchain FIRST
      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          transactionSignature: signature
        }),
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.verified) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      // Payment verified successfully
      console.log('✅ Payment verified and processed');

      // Success
      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, onPaymentSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-rose-500/20 p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-white mb-2">Unlock Unlimited Access</h2>
            <p className="text-gray-400">Your 3-minute free trial has ended</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Get Lifetime Access</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 text-rose-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Unlimited conversations forever</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 text-rose-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>No interruptions or time limits</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <svg className="w-5 h-5 text-rose-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>One-time payment, lifetime access</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="text-center">
              <div className="text-3xl font-light text-white mb-1">
                {PAYMENT_AMOUNT} SOL
              </div>
              <div className="text-sm text-gray-400">One-time payment • Lifetime access</div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Action buttons */}
            {!connected ? (
              <button
                onClick={handleConnect}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-rose-500/25"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Get Lifetime Access'
                )}
              </button>
            )}

            {/* Wallet info */}
            {connected && publicKey && (
              <div className="text-center text-sm text-gray-400">
                Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 