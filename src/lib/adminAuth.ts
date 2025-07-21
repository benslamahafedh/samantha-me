// SECURITY FIX: Admin authentication utilities
// In-memory token store (in production, use Redis or database)
const validTokens = new Set<string>();

// Export for token verification
export function isValidToken(token: string): boolean {
  return validTokens.has(token);
}

// Add token to store
export function addToken(token: string): void {
  validTokens.add(token);
}

// Remove token from store
export function removeToken(token: string): void {
  validTokens.delete(token);
}

// Clean up expired tokens
export function cleanupExpiredTokens(): void {
  // This is handled by setTimeout in the login route
  // In production, implement proper cleanup with timestamps
} 