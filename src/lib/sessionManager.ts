/**
 * Bulletproof Session Manager
 * Handles session timing, state persistence, and access control
 */

interface SessionData {
  userId: string;
  sessionStartTime: number;
  sessionEndTime: number;
  totalTimeUsed: number;
  isPaid: boolean;
  walletAddress?: string;
  paymentTransactionId?: string;
  lastAccessTime: number;
}

const SESSION_KEY_PREFIX = 'samantha_session_';
const SESSION_DURATION = 180; // 3 minutes in seconds

export class SessionManager {
  private sessionData: SessionData | null = null;
  private _timerId: NodeJS.Timeout | null = null;
  private storageKey: string;
  private onSessionEndCallbacks: (() => void)[] = [];
  private onTimeUpdateCallbacks: ((timeLeft: number) => void)[] = [];
  private isClient: boolean;
  private instanceId: string;

  // Add getter/setter to track timer changes
  private get timerId(): NodeJS.Timeout | null {
    return this._timerId;
  }

  private set timerId(value: NodeJS.Timeout | null) {
    const stack = new Error().stack;
    console.log(`🔧 SessionManager[${this.instanceId}]: Timer ID changing from ${this._timerId} to ${value}`);
    console.log(`📍 Call stack:`, stack?.split('\n').slice(1, 4));
    this._timerId = value;
  }

  constructor() {
    this.instanceId = Math.random().toString(36).substring(2, 8);
    console.log(`🏗️ SessionManager: Creating new instance ${this.instanceId}`);
    
    this.isClient = typeof window !== 'undefined';
    // Generate unique user ID if not exists
    this.storageKey = this.getStorageKey();
    if (this.isClient) {
      this.loadSession();
    }
  }

  private getStorageKey(): string {
    if (!this.isClient) return '';
    
    // Get or create unique device ID
    let deviceId = localStorage.getItem('samantha_device_id');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('samantha_device_id', deviceId);
    }
    return `${SESSION_KEY_PREFIX}${deviceId}`;
  }

  private generateDeviceId(): string {
    // Generate unique device ID based on browser fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency || 0,
      Date.now()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private loadSession(): void {
    if (!this.isClient) return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.sessionData = JSON.parse(stored);
        
        // Validate session data
        if (this.sessionData && !this.isSessionValid()) {
          this.sessionData = null;
          localStorage.removeItem(this.storageKey);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.sessionData = null;
    }
  }

  private saveSession(): void {
    if (!this.isClient || !this.sessionData) return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private isSessionValid(): boolean {
    if (!this.sessionData) return false;
    
    const now = Date.now();
    const sessionAge = now - this.sessionData.sessionStartTime;
    
    // Check if session is expired (more than 24 hours old)
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    if (sessionAge > SESSION_EXPIRY) {
      return false;
    }
    
    return true;
  }

  public canStartSession(): boolean {
    if (!this.sessionData) return true;
    
    // If user has paid, always allow
    if (this.sessionData.isPaid) return true;
    
    // Check if user has already used their free session
    if (this.sessionData.totalTimeUsed >= SESSION_DURATION) {
      return false;
    }
    
    return true;
  }

  public getRemainingFreeTime(): number {
    if (!this.sessionData) return SESSION_DURATION;
    if (this.sessionData.isPaid) return Infinity;
    
    const remaining = SESSION_DURATION - this.sessionData.totalTimeUsed;
    return Math.max(0, remaining);
  }

  public startSession(): boolean {
    console.log(`🚀 SessionManager[${this.instanceId}]: startSession called`);
    
    if (!this.canStartSession()) {
      console.log(`❌ SessionManager[${this.instanceId}]: Cannot start session`);
      return false;
    }

    const now = Date.now();
    
    if (!this.sessionData) {
      // Create new session
      console.log(`🆕 SessionManager[${this.instanceId}]: Creating new session`);
      this.sessionData = {
        userId: this.generateDeviceId(),
        sessionStartTime: now,
        sessionEndTime: now + (SESSION_DURATION * 1000),
        totalTimeUsed: 0,
        isPaid: false,
        lastAccessTime: now
      };
    } else {
      // Resume existing session
      console.log(`🔄 SessionManager[${this.instanceId}]: Resuming existing session`);
      this.sessionData.lastAccessTime = now;
    }

    console.log(`💾 SessionManager[${this.instanceId}]: Saving session data:`, this.sessionData);
    this.saveSession();
    this.startTimer();
    
    console.log(`✅ SessionManager[${this.instanceId}]: Session started successfully`);
    return true;
  }

  private startTimer(): void {
    // Don't start timer for users with permanent access
    if (this.sessionData?.isPaid) {
      return;
    }

    if (this.timerId) {
      clearInterval(this.timerId);
    }
    
    this.updateSessionTime();
    
    this.timerId = setInterval(() => {
      this.updateSessionTime();
    }, 1000);
  }

  private updateSessionTime(): void {
    if (!this.sessionData) {
      return;
    }

    const now = Date.now();
    
    // Only update timer for unpaid users
    if (!this.sessionData.isPaid) {
      this.sessionData.totalTimeUsed += 1;
      const timeLeft = Math.max(0, SESSION_DURATION - this.sessionData.totalTimeUsed);
      
      // Notify listeners
      this.onTimeUpdateCallbacks.forEach(cb => {
        try {
          cb(timeLeft);
        } catch (error) {
          // Ignore callback errors
        }
      });
      
      if (timeLeft <= 0) {
        this.endSession();
      }
    } else {
      // For paid users, notify listeners with infinite time
      this.onTimeUpdateCallbacks.forEach(cb => {
        try {
          cb(Infinity);
        } catch (error) {
          // Ignore callback errors
        }
      });
    }
    
    this.sessionData.lastAccessTime = now;
    this.saveSession();
  }

  public endSession(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    // Notify all listeners
    this.onSessionEndCallbacks.forEach(cb => cb());
    
    this.saveSession();
  }

  public markAsPaid(walletAddress: string, transactionId: string): void {
    if (!this.sessionData) {
      this.sessionData = {
        userId: this.generateDeviceId(),
        sessionStartTime: Date.now(),
        sessionEndTime: 0,
        totalTimeUsed: 0,
        isPaid: true,
        walletAddress,
        paymentTransactionId: transactionId,
        lastAccessTime: Date.now()
      };
    } else {
      this.sessionData.isPaid = true;
      this.sessionData.walletAddress = walletAddress;
      this.sessionData.paymentTransactionId = transactionId;
    }
    
    this.saveSession();
  }

  public onSessionEnd(callback: () => void): void {
    this.onSessionEndCallbacks.push(callback);
  }

  public onTimeUpdate(callback: (timeLeft: number) => void): void {
    this.onTimeUpdateCallbacks.push(callback);
  }

  public getSessionData(): SessionData | null {
    return this.sessionData;
  }

  public destroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.onSessionEndCallbacks = [];
    this.onTimeUpdateCallbacks = [];
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
} 