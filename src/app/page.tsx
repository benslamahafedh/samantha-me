'use client';

import { useState, useCallback, useEffect } from 'react';
import OptimizedVoiceManager from '@/components/OptimizedVoiceManager';
import VoiceVisualization from '@/components/VoiceVisualization';
import VoiceErrorDisplay from '@/components/VoiceErrorDisplay';

export default function Home() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  // iOS detection and audio initialization
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Check for development mode (URL parameter or localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const devMode = urlParams.get('dev') === 'ios' || localStorage.getItem('samantha_dev_ios') === 'true';
    setIsDevMode(devMode);
    
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || devMode;
    setIsIOS(isIOSDevice);
    
    if (isIOSDevice) {
      console.log('🍎 iOS device detected - initializing audio session');
      console.log('📱 User Agent:', navigator.userAgent);
      console.log('🔧 Dev Mode:', devMode);
      
      // Initialize iOS audio session with enhanced error handling
      const initializeIOSAudio = async () => {
        try {
          console.log('🔧 Starting enhanced iOS audio initialization...');
          
          // Step 1: Create audio context to activate audio session
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            throw new Error('AudioContext not supported on this device');
          }
          
          console.log('✅ AudioContext available');
          const audioContext = new AudioContextClass({
            sampleRate: 44100,
            latencyHint: 'interactive'
          });
          console.log('📊 Audio context state:', audioContext.state);
          
          // Step 2: Configure iOS audio session if available
          if ((audioContext as any).setAudioSessionConfiguration) {
            console.log('🔧 Configuring iOS audio session...');
            try {
              await (audioContext as any).setAudioSessionConfiguration({
                category: 'playAndRecord',
                mode: 'voiceChat',
                options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
              });
              console.log('✅ iOS audio session configured');
            } catch (configError) {
              console.warn('⚠️ Audio session configuration failed:', configError);
              // Continue anyway - this is not critical
            }
          } else {
            console.log('⚠️ setAudioSessionConfiguration not available');
          }
          
          // Step 3: Resume audio context if suspended
          if (audioContext.state === 'suspended') {
            console.log('🔄 Resuming suspended audio context...');
            await audioContext.resume();
            console.log('✅ iOS audio context resumed');
          }
          
          // Step 4: Create a silent oscillator to activate audio session
          console.log('🔊 Creating silent oscillator to activate audio session...');
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.001);
          
          // Step 5: Test microphone access
          console.log('🎤 Testing microphone access...');
          try {
            const testStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
              }
            });
            
            // Stop the test stream immediately
            testStream.getTracks().forEach(track => track.stop());
            console.log('✅ Microphone access test successful');
          } catch (micError) {
            console.warn('⚠️ Microphone access test failed:', micError);
            // Don't fail completely - user might grant permission later
          }
          
          setAudioInitialized(true);
          setIsLoading(false);
          setAudioError(null);
          console.log('✅ iOS audio session activated successfully');
          
        } catch (error) {
          console.error('❌ iOS audio initialization failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setAudioError(`Audio initialization failed: ${errorMessage}. Please tap the screen to retry.`);
          setIsLoading(false);
        }
      };
      
      // Initialize audio on user interaction
      const handleUserInteraction = () => {
        console.log('👆 User interaction detected - initializing audio...');
        setAudioError(null);
        setIsLoading(true);
        initializeIOSAudio();
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };
      
      // Add event listeners for user interaction
      document.addEventListener('touchstart', handleUserInteraction);
      document.addEventListener('click', handleUserInteraction);
      
      // Also try to initialize on page load
      console.log('🚀 Attempting initial audio initialization...');
      initializeIOSAudio();
      
      // Fallback: if audio doesn't initialize within 8 seconds, show error
      const fallbackTimer = setTimeout(() => {
        if (!audioInitialized && !audioError) {
          console.log('⏰ Audio initialization timeout - showing fallback');
          setAudioError('Audio initialization timeout. Please tap the screen to retry.');
          setIsLoading(false);
        }
      }, 8000);
      
      return () => {
        clearTimeout(fallbackTimer);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
      };
    } else {
      console.log('🖥️ Non-iOS device detected');
      setAudioInitialized(true);
      setIsLoading(false);
    }
  }, [audioInitialized]);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Initialize server components first
        try {
          await fetch('/api/server-init');
        } catch (initError) {
          console.log('Server init failed (might already be initialized):', initError);
        }
        
        // Try to get existing session from localStorage
        const existingSessionId = localStorage.getItem('samantha_session_id');
        
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: existingSessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSessionId(data.sessionId);
          localStorage.setItem('samantha_session_id', data.sessionId);
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
      }
    };
    
    // Only initialize session after audio is ready on iOS
    if (!isIOS || audioInitialized) {
      initializeSession();
    }

    // Listen for session initialization from payment modal
    const handleSessionInitialized = (event: CustomEvent) => {
      setSessionId(event.detail.sessionId);
      localStorage.setItem('samantha_session_id', event.detail.sessionId);
    };

    window.addEventListener('sessionInitialized', handleSessionInitialized as EventListener);

    return () => {
      window.removeEventListener('sessionInitialized', handleSessionInitialized as EventListener);
    };
  }, [isIOS, audioInitialized]);

  // iOS fallback: if audio fails to initialize after 15 seconds, proceed anyway
  useEffect(() => {
    if (isIOS && !audioInitialized && !audioError) {
      const fallbackTimer = setTimeout(() => {
        console.log('⏰ iOS audio initialization timeout - proceeding with fallback');
        setAudioInitialized(true);
        setIsLoading(false);
        setAudioError('Audio initialization incomplete. Some features may not work properly. Please try tapping the screen to retry.');
      }, 15000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, [isIOS, audioInitialized, audioError]);

  // Mobile-specific fixes to prevent interference with voice interaction
  useEffect(() => {
    // Prevent text selection and touch highlighting
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Prevent pull-to-refresh
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const startY = touch.clientY;
      
      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const currentY = touch.clientY;
        const diff = currentY - startY;
        
        if (diff > 0 && window.scrollY === 0) {
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
      
      document.addEventListener('touchend', handleTouchEnd);
    };

    // Apply mobile fixes
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventSelection);
    document.addEventListener('contextmenu', preventSelection);
    document.addEventListener('touchend', preventZoom);
    document.addEventListener('touchstart', preventPullToRefresh);

    // Ensure proper microphone access on iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      // Request microphone permission early
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          // Permission granted
        })
        .catch((err) => {
          // Permission denied
        });
    }

    return () => {
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventSelection);
      document.removeEventListener('contextmenu', preventSelection);
      document.removeEventListener('touchend', preventZoom);
      document.removeEventListener('touchstart', preventPullToRefresh);
    };
  }, []);

  const handleHasStartedChange = (started: boolean) => {
    setHasStarted(started);
  };

  const handleIsReadyChange = (ready: boolean) => {
    setIsReady(ready);
  };



  const handleSessionEndedChange = (sessionEnded: boolean) => {
    setSessionEnded(sessionEnded);
  };

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleStartConversation = useCallback(() => {
    const event = new Event('startConversation');
    window.dispatchEvent(event);
  }, []);

  // iOS audio interaction handler - dispatch event for voice processing
  const handleIOSAudioInteraction = useCallback(() => {
    if (isIOS) {
      console.log('👆 iOS user interaction - triggering audio activation');
      const event = new CustomEvent('iosAudioInteraction');
      window.dispatchEvent(event);
    }
  }, [isIOS]);

  // Add iOS audio interaction listeners
  useEffect(() => {
    if (isIOS) {
      const events = ['touchstart', 'click', 'touchend'];
      events.forEach(event => {
        document.addEventListener(event, handleIOSAudioInteraction, { once: true });
      });
      
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleIOSAudioInteraction);
        });
      };
    }
  }, [isIOS, handleIOSAudioInteraction]);

  // Show loading state for iOS while audio initializes
  if (isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden select-none touch-none gradient-rose-pink">
        <div className="relative min-h-screen select-none touch-none flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="animate-pulse text-4xl mb-6">🍎</div>
            <div className="text-xl mb-4 font-medium">Initializing Samantha...</div>
            <div className="text-sm text-gray-300 mb-6">
              {isIOS ? 'Setting up audio for iOS' : 'Loading voice assistant'}
            </div>
            {isIOS && (
              <div className="text-xs text-gray-400 space-y-2">
                <div>• Make sure your device is not on silent mode</div>
                <div>• Use Safari browser for best compatibility</div>
                <div>• Tap anywhere to activate audio</div>
              </div>
            )}
            <div className="mt-8">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show error state if audio initialization failed
  if (audioError) {
    return (
      <main className="relative min-h-screen overflow-hidden select-none touch-none gradient-rose-pink">
        <div className="relative min-h-screen select-none touch-none flex items-center justify-center">
          <div className="text-center text-white p-8 max-w-sm">
            <div className="text-4xl mb-6">❌</div>
            <div className="text-xl mb-4 font-medium">Audio Setup Failed</div>
            <div className="text-sm text-gray-300 mb-6">{audioError}</div>
            <div className="text-xs text-gray-400 space-y-2 mb-6">
              <div>• Check that your device is not on silent mode</div>
              <div>• Try using Safari browser</div>
              <div>• Make sure microphone permissions are allowed</div>
            </div>
            <button 
              onClick={() => {
                setAudioError(null);
                setIsLoading(true);
                // Force re-initialization
                window.location.reload();
              }}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden select-none touch-none">
        <div className="relative min-h-screen select-none touch-none">
                    {/* Development Mode Toggle */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed top-4 right-4 z-50">
              <button
                onClick={() => {
                  const newMode = !isDevMode;
                  setIsDevMode(newMode);
                  localStorage.setItem('samantha_dev_ios', newMode.toString());
                  window.location.reload();
                }}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                {/* {isDevMode ? '🍎 iOS Mode' : '🖥️ Desktop Mode'} */}
              </button>
            </div>
          )}

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
            sessionEnded={sessionEnded}
          />

          {/* Simple clickable overlay when ready */}
          {isReady && !hasStarted && isIntroComplete && !sessionEnded && (
            <div 
              className="fixed inset-0 z-40 cursor-pointer"
              onClick={handleStartConversation}
              style={{ pointerEvents: 'auto' }}
            />
          )}

          {/* iOS Restart Button - when conversation is active but not responding */}
          {isIOS && hasStarted && !isListening && !isSpeaking && !sessionEnded && (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                onClick={() => {
                  console.log('🔄 iOS: Manual restart triggered');
                  setVoiceError(null);
                  // Trigger a conversation restart
                  window.dispatchEvent(new Event('startConversation'));
                }}
                className="bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                title="Restart conversation if Samantha stops responding"
              >
                🔄 Restart
              </button>
            </div>
          )}

          <OptimizedVoiceManager
            onSpeakingChange={setIsSpeaking}
            onListeningChange={setIsListening}
            onHasStartedChange={handleHasStartedChange}
            onIsReadyChange={handleIsReadyChange}
            onSessionEndedChange={handleSessionEndedChange}
            onRequirePayment={() => {
              // No payment required - just end session
              setSessionEnded(true);
            }}
            onAccessStatusChange={() => {
              // No access status changes needed
            }}
            sessionId={sessionId}
            onVoiceError={setVoiceError}
          />
        </div>

        {/* Voice Error Display */}
        <VoiceErrorDisplay
          error={voiceError}
          onRetry={() => {
            setVoiceError(null);
            // Trigger a conversation restart
            window.dispatchEvent(new Event('startConversation'));
          }}
          onDismiss={() => setVoiceError(null)}
          onRequestPermission={async () => {
            setVoiceError(null);
            // Try to request microphone permission directly
            try {
              await navigator.mediaDevices.getUserMedia({ audio: true });
              // If successful, trigger conversation restart
              window.dispatchEvent(new Event('startConversation'));
            } catch (error) {
              console.error('Failed to request microphone permission:', error);
              setVoiceError('Microphone access denied. Please check your browser settings.');
            }
          }}
        />
      </main>
  );
} 