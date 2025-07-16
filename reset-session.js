// Simple script to reset session timer
console.log('Resetting session timer...');

// Clear all session data from localStorage
if (typeof window !== 'undefined') {
  // Find all session keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('samantha_session_')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all session keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log(`Removed ${keysToRemove.length} session keys`);
  console.log('Session timer reset complete!');
} else {
  console.log('Run this in the browser console');
} 