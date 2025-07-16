'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import SecureVoiceManager from '@/components/SecureVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import PaymentModal from '@/components/PaymentModal';
import WalletProvider from '@/components/WalletProvider';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(180); // 3 minutes
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hasWalletAccess, setHasWalletAccess] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);

  // Wallet connection state
  const { connected } = useWallet();

  // Check if wallet is available - client-side only to prevent hydration mismatch
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check for wallet availability on client side only
    const hasWallet = !!(window as unknown as Record<string, unknown>).solana || !!(window as unknown as Record<string, unknown>).phantom || !!(window as unknown as Record<string, unknown>).solflare;
    setIsWalletAvailable(hasWallet);
  }, []);



  const handleHasStartedChange = (started: boolean) => {
    setHasStarted(started);
  };

  const handleIsReadyChange = (ready: boolean) => {
    setIsReady(ready);
  };

  const handleSessionTimeChange = (timeLeft: number) => {
    setSessionTimeLeft(timeLeft);
  };

  const handleSessionEndedChange = (sessionEnded: boolean) => {
    setSessionEnded(sessionEnded);
  };

  const handleRequirePayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSessionEnded(false);
    // The SecureVoiceManager will automatically detect the payment and update access
  };



  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleStartConversation = useCallback(() => {
    const event = new Event('startConversation');
    window.dispatchEvent(event);
  }, []);

  const handleAccessStatusChange = useCallback((hasAccess: boolean, trialActive: boolean) => {
    setHasWalletAccess(hasAccess);
    setIsTrialActive(trialActive);
  }, []);

  return (
    <WalletProvider>
      <main className="relative min-h-screen overflow-hidden">
        <div className="relative min-h-screen">
          <VoiceVisualization
            isListening={isListening}
            isSpeaking={isSpeaking}
            transcript={''}
            error={null}
            hasStarted={hasStarted}
            isReady={isReady}
            isIntroComplete={isIntroComplete}
            onIntroComplete={handleIntroComplete}
            onStartConversation={handleStartConversation}
            sessionTimeLeft={sessionTimeLeft}
            sessionEnded={sessionEnded}
          />
          
          <SecureVoiceManager
            onSpeakingChange={setIsSpeaking}
            onListeningChange={setIsListening}
            onHasStartedChange={handleHasStartedChange}
            onIsReadyChange={handleIsReadyChange}
            onSessionTimeChange={handleSessionTimeChange}
            onSessionEndedChange={handleSessionEndedChange}
            onRequirePayment={handleRequirePayment}
            onAccessStatusChange={handleAccessStatusChange}
          />
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Session timer display - only for trial users */}
        {hasStarted && !sessionEnded && isTrialActive && sessionTimeLeft < 999999 && sessionTimeLeft > 0 && (
          <div className="fixed top-4 right-4 z-20">
            <div className="bg-black/30 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${sessionTimeLeft <= 30 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-white/80 text-sm font-light">
                  {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Unlimited access indicator for paid users */}
        {hasStarted && !sessionEnded && hasWalletAccess && (
          <div className="fixed top-4 right-4 z-20">
            <div className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-rose-500/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></div>
                <span className="text-rose-200 text-sm font-light">
                  Unlimited
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wallet status indicator */}
        {isClient && hasStarted && (
          <div className="fixed bottom-4 right-4 z-20">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
              <div className="flex items-center space-x-2 text-white/60 text-xs">
                <div className={`w-2 h-2 rounded-full ${hasWalletAccess ? 'bg-green-400' : connected ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
                <span>
                  {hasWalletAccess ? 'Verified Payment' : connected ? 'Wallet Connected' : isTrialActive ? 'Trial Active' : 'Connect Wallet'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Development mode indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-full px-3 py-1 border border-yellow-500/30">
              <span className="text-yellow-200 text-xs font-medium">DEV MODE</span>
            </div>
          </div>
        )}

        {/* Wallet connection button - only show when not connected and not in trial */}
        {isClient && !connected && !isTrialActive && !hasWalletAccess && isWalletAvailable && (
          <div className="fixed top-4 left-4 z-20">
            <WalletMultiButton className="!bg-gradient-to-r !from-rose-500 !to-pink-500 !text-white !border !border-white/20 !rounded-full !px-4 !py-2 !text-sm !font-medium hover:!from-rose-600 hover:!to-pink-600 transition-all duration-300" />
          </div>
        )}

        {/* Wallet not available message */}
        {isClient && !connected && !isTrialActive && !hasWalletAccess && !isWalletAvailable && (
          <div className="fixed top-4 left-4 z-20">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
              <div className="flex items-center space-x-2 text-white/60 text-xs">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span>Install Phantom or Solflare wallet</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </WalletProvider>
  );
} 