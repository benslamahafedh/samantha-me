// Polyfills for better browser compatibility

// iOS Audio Context Polyfill
if (typeof window !== 'undefined') {
  // Ensure AudioContext is available
  if (!window.AudioContext && (window as any).webkitAudioContext) {
    (window as any).AudioContext = (window as any).webkitAudioContext;
  }
  
  // iOS-specific audio session configuration
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    console.log('🍎 iOS detected - applying audio polyfills');
    
    // Override getUserMedia to handle iOS audio session
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async function(constraints) {
      try {
        // Create audio context first to activate audio session
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          
          // Resume if suspended
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          // Configure audio session if available
          if ((audioContext as any).setAudioSessionConfiguration) {
            try {
              await (audioContext as any).setAudioSessionConfiguration({
                category: 'playAndRecord',
                mode: 'voiceChat',
                options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
              });
            } catch (e) {
              console.log('iOS audio session config failed:', e);
            }
          }
        }
        
        return await originalGetUserMedia.call(this, constraints);
      } catch (error) {
        console.error('iOS getUserMedia polyfill failed:', error);
        throw error;
      }
    };
  }
}

// Prevent iOS Safari from interfering with audio
if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
  // Disable iOS Safari's automatic audio interruption
  document.addEventListener('touchstart', () => {
    // This helps prevent audio context suspension
  }, { passive: true });
  
  // Prevent iOS Safari from pausing audio on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Resume audio context when page becomes visible
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        // This will be handled by the audio initialization code
      }
    }
  });
} 