// In-memory storage for paid sessions (in production, use a database)
const paidSessions = new Map<string, { expiresAt: Date; accessType: string }>();

// Helper function to check if a session has paid access
export function hasPaidAccess(sessionId: string): boolean {
  const session = paidSessions.get(sessionId);
  if (!session) return false;
  
  // Check if access has expired
  if (new Date() > session.expiresAt) {
    paidSessions.delete(sessionId);
    return false;
  }
  
  return true;
}

// Helper function to get session info
export function getSessionInfo(sessionId: string) {
  return paidSessions.get(sessionId);
}

// Grant paid access to a session
export function grantPaidAccess(sessionId: string, expiresAt: Date, accessType: string = '1hour'): void {
  paidSessions.set(sessionId, {
    expiresAt,
    accessType
  });
  console.log(`✅ Paid access granted for session ${sessionId} until ${expiresAt}`);
}

// Remove paid access (for cleanup)
export function removePaidAccess(sessionId: string): void {
  paidSessions.delete(sessionId);
  console.log(`🗑️ Paid access removed for session ${sessionId}`);
}

// Get all active sessions (for debugging)
export function getActiveSessions() {
  return Array.from(paidSessions.entries()).map(([sessionId, session]) => ({
    sessionId,
    expiresAt: session.expiresAt,
    accessType: session.accessType,
    isActive: new Date() < session.expiresAt
  }));
} 