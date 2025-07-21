import crypto from 'crypto';

// SECURITY FIX: Comprehensive input validation system
export class InputValidator {
  private static readonly MAX_INPUT_LENGTH = 1000;
  private static readonly MAX_SESSION_ID_LENGTH = 64;
  private static readonly MAX_WALLET_ADDRESS_LENGTH = 44;
  private static readonly MAX_REFERENCE_ID_LENGTH = 50;
  private static readonly MAX_MESSAGE_LENGTH = 500;
  private static readonly MAX_USER_AGENT_LENGTH = 500;
  private static readonly MAX_IP_LENGTH = 45;

  // Rate limiting storage
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

  // Validate and sanitize session ID
  static validateSessionId(sessionId: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!sessionId || typeof sessionId !== 'string') {
      return { isValid: false, error: 'Session ID is required and must be a string' };
    }

    if (sessionId.length > this.MAX_SESSION_ID_LENGTH) {
      return { isValid: false, error: `Session ID too long (max ${this.MAX_SESSION_ID_LENGTH} characters)` };
    }

    // SECURITY FIX: Validate session ID format (hex string)
    if (!/^[a-f0-9]{32,64}$/i.test(sessionId)) {
      return { isValid: false, error: 'Invalid session ID format' };
    }

    return { isValid: true, sanitized: sessionId.trim() };
  }

  // Validate and sanitize wallet address
  static validateWalletAddress(address: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'Wallet address is required and must be a string' };
    }

    if (address.length > this.MAX_WALLET_ADDRESS_LENGTH) {
      return { isValid: false, error: `Wallet address too long (max ${this.MAX_WALLET_ADDRESS_LENGTH} characters)` };
    }

    // SECURITY FIX: Validate Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return { isValid: false, error: 'Invalid Solana wallet address format' };
    }

    return { isValid: true, sanitized: address.trim() };
  }

  // Validate and sanitize reference ID
  static validateReferenceId(referenceId: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!referenceId || typeof referenceId !== 'string') {
      return { isValid: false, error: 'Reference ID is required and must be a string' };
    }

    if (referenceId.length > this.MAX_REFERENCE_ID_LENGTH) {
      return { isValid: false, error: `Reference ID too long (max ${this.MAX_REFERENCE_ID_LENGTH} characters)` };
    }

    // SECURITY FIX: Validate reference ID format (alphanumeric with hyphens)
    if (!/^[a-zA-Z0-9\-_]+$/.test(referenceId)) {
      return { isValid: false, error: 'Invalid reference ID format (alphanumeric, hyphens, underscores only)' };
    }

    return { isValid: true, sanitized: referenceId.trim() };
  }

  // Validate and sanitize chat message
  static validateChatMessage(message: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!message || typeof message !== 'string') {
      return { isValid: false, error: 'Message is required and must be a string' };
    }

    if (message.length > this.MAX_MESSAGE_LENGTH) {
      return { isValid: false, error: `Message too long (max ${this.MAX_MESSAGE_LENGTH} characters)` };
    }

    // SECURITY FIX: Remove potentially dangerous characters
    const sanitized = message
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, ''); // Remove vbscript: protocol

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Message cannot be empty after sanitization' };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize user agent
  static validateUserAgent(userAgent: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!userAgent || typeof userAgent !== 'string') {
      return { isValid: false, error: 'User agent is required and must be a string' };
    }

    if (userAgent.length > this.MAX_USER_AGENT_LENGTH) {
      return { isValid: false, error: `User agent too long (max ${this.MAX_USER_AGENT_LENGTH} characters)` };
    }

    // SECURITY FIX: Basic user agent validation
    const sanitized = userAgent.trim();
    if (sanitized.length === 0) {
      return { isValid: false, error: 'User agent cannot be empty' };
    }

    return { isValid: true, sanitized };
  }

  // Validate and sanitize IP address
  static validateIpAddress(ip: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!ip || typeof ip !== 'string') {
      return { isValid: false, error: 'IP address is required and must be a string' };
    }

    if (ip.length > this.MAX_IP_LENGTH) {
      return { isValid: false, error: `IP address too long (max ${this.MAX_IP_LENGTH} characters)` };
    }

    // SECURITY FIX: Validate IP address format
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return { isValid: false, error: 'Invalid IP address format' };
    }

    return { isValid: true, sanitized: ip.trim() };
  }

  // Validate amount (for payments)
  static validateAmount(amount: number): { isValid: boolean; error?: string } {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }

    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (amount > 1000) {
      return { isValid: false, error: 'Amount too high (max 1000 SOL)' };
    }

    return { isValid: true };
  }

  // SECURITY FIX: Rate limiting
  static checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = `rate_limit_${identifier}`;
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      return { allowed: true, remaining: this.RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + this.RATE_LIMIT_WINDOW };
    }

    if (record.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment count
    record.count++;
    this.rateLimitStore.set(key, record);

    return { allowed: true, remaining: this.RATE_LIMIT_MAX_REQUESTS - record.count, resetTime: record.resetTime };
  }

  // SECURITY FIX: Clean up rate limit store periodically
  static cleanupRateLimitStore(): void {
    const now = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  // SECURITY FIX: Validate admin credentials
  static validateAdminCredentials(username: string, password: string): { isValid: boolean; error?: string } {
    if (!username || typeof username !== 'string') {
      return { isValid: false, error: 'Username is required' };
    }

    if (!password || typeof password !== 'string') {
      return { isValid: false, error: 'Password is required' };
    }

    if (username.length > 50) {
      return { isValid: false, error: 'Username too long' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password too short (min 8 characters)' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Password too long' };
    }

    // SECURITY FIX: Basic credential validation
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      return { isValid: false, error: 'Invalid username format' };
    }

    return { isValid: true };
  }

  // SECURITY FIX: Validate token
  static validateToken(token: string): { isValid: boolean; error?: string } {
    if (!token || typeof token !== 'string') {
      return { isValid: false, error: 'Token is required' };
    }

    if (token.length !== 64) {
      return { isValid: false, error: 'Invalid token length' };
    }

    // SECURITY FIX: Validate token format (hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return { isValid: false, error: 'Invalid token format' };
    }

    return { isValid: true };
  }

  // SECURITY FIX: Sanitize conversation history
  static sanitizeConversationHistory(history: any[]): any[] {
    if (!Array.isArray(history)) {
      return [];
    }

    return history.slice(0, 50).map(item => {
      if (typeof item === 'object' && item !== null) {
        const sanitized: any = {};
        
        if (item.role && typeof item.role === 'string') {
          sanitized.role = ['user', 'assistant', 'system'].includes(item.role) ? item.role : 'user';
        }
        
        if (item.content && typeof item.content === 'string') {
          const contentValidation = this.validateChatMessage(item.content);
          if (contentValidation.isValid) {
            sanitized.content = contentValidation.sanitized;
          }
        }
        
        return sanitized;
      }
      return null;
    }).filter(Boolean);
  }
}

// Start rate limit cleanup
setInterval(() => {
  InputValidator.cleanupRateLimitStore();
}, 5 * 60 * 1000); // Every 5 minutes 