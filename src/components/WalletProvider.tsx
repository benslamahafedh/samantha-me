'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: React.ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  // Choose network - you can switch between 'mainnet-beta', 'testnet', 'devnet'
  const network = WalletAdapterNetwork.Mainnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    // Use a reliable RPC endpoint
    return 'https://api.mainnet-beta.solana.com';
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors gracefully
  const handleError = useCallback((error: any) => {
    console.log('Wallet connection error:', error);
    
    // Don't throw the error, just log it
    // This prevents the app from crashing due to wallet issues
    
    // If it's a connection error, we can handle it silently
    if (error?.name === 'WalletConnectionError') {
      console.log('Wallet connection failed - user may not have wallet installed or wallet is locked');
    } else if (error?.name === 'WalletNotInstalledError') {
      console.log('Wallet not installed - user needs to install Phantom or Solflare');
    } else if (error?.name === 'WalletNotSelectedError') {
      console.log('No wallet selected - user needs to select a wallet');
    } else {
      console.log('Unknown wallet error:', error);
    }
  }, []);

  // Wrap in try-catch to prevent wallet provider crashes
  try {
    return (
      <ConnectionProvider endpoint={endpoint}>
        <SolanaWalletProvider 
          wallets={wallets} 
          autoConnect={false} // Disable auto-connect to prevent errors
          onError={handleError}
        >
          <WalletModalProvider>{children}</WalletModalProvider>
        </SolanaWalletProvider>
      </ConnectionProvider>
    );
  } catch (error) {
    console.error('Wallet provider error:', error);
    // Fallback: render children without wallet provider
    return <>{children}</>;
  }
} 