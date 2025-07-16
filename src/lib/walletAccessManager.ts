/**
 * Wallet-Based Access Manager
 * Checks real SOL payments on blockchain for access control
 * Cannot be bypassed by incognito mode or session resets
 */

interface WalletAccess {
  hasAccess: boolean;
  walletAddress: string | null;
  transactionSignature?: string;
  amount?: number;
  blockTime?: number;
  lastChecked: number;
}

export class WalletAccessManager {
  private accessData: WalletAccess | null = null;
  private checkInProgress = false;

  constructor() {
    // Initialize with no access
    this.accessData = {
      hasAccess: false,
      walletAddress: null,
      lastChecked: 0
    };
  }

  /**
   * Check if a wallet has paid for access by scanning blockchain
   */
  async checkWalletAccess(walletAddress: string): Promise<boolean> {
    if (!walletAddress) {
      this.accessData = {
        hasAccess: false,
        walletAddress: null,
        lastChecked: Date.now()
      };
      return false;
    }

    // Prevent multiple simultaneous checks
    if (this.checkInProgress) {
      return this.accessData?.hasAccess || false;
    }

    // Use cached result if recent (5 minutes)
    const cacheAge = Date.now() - (this.accessData?.lastChecked || 0);
    if (this.accessData?.walletAddress === walletAddress && cacheAge < 5 * 60 * 1000) {
      return this.accessData.hasAccess;
    }

    this.checkInProgress = true;

    try {
      const response = await fetch('/api/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      this.accessData = {
        hasAccess: data.hasAccess,
        walletAddress,
        transactionSignature: data.transactionSignature,
        amount: data.amount,
        blockTime: data.blockTime,
        lastChecked: Date.now()
      };

      return data.hasAccess;

    } catch {
      console.error('Failed to check wallet access');
      return false;
    } finally {
      this.checkInProgress = false;
    }
  }

  /**
   * Get current access data
   */
  getAccessData(): WalletAccess | null {
    return this.accessData;
  }

  /**
   * Force a fresh check (ignoring cache)
   */
  async refreshAccess(walletAddress: string): Promise<boolean> {
    // Reset cache
    this.accessData = {
      hasAccess: false,
      walletAddress: null,
      lastChecked: 0
    };
    
    return this.checkWalletAccess(walletAddress);
  }

  /**
   * Check if user should get free trial (3 minutes)
   * This is separate from paid access and still uses localStorage for trial tracking
   */
  canStartFreeTrial(): boolean {
    const trialKey = 'samantha_trial_used';
    
    try {
      const trialUsed = localStorage.getItem(trialKey);
      return !trialUsed;
    } catch {
      // If localStorage fails, allow trial
      return true;
    }
  }

  /**
   * Mark free trial as used
   */
  markTrialUsed(): void {
    const trialKey = 'samantha_trial_used';
    
    try {
      localStorage.setItem(trialKey, 'true');
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Reset trial (for testing purposes)
   */
  resetTrial(): void {
    const trialKey = 'samantha_trial_used';
    
    try {
      localStorage.removeItem(trialKey);
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Clear temporary access (for testing purposes)
   */
  clearTemporaryAccess(walletAddress?: string): void {
    try {
      if (walletAddress) {
        localStorage.removeItem(`temp_access_${walletAddress}`);
      } else {
        // Clear all temporary access keys
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('temp_access_')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Singleton instance
let walletAccessManagerInstance: WalletAccessManager | null = null;

export function getWalletAccessManager(): WalletAccessManager {
  if (!walletAccessManagerInstance) {
    walletAccessManagerInstance = new WalletAccessManager();
  }
  return walletAccessManagerInstance;
} 