# 🍎 iOS Audio Setup Guide

This guide helps resolve common iOS audio issues that can cause black screens or audio problems.

## 🧪 Testing iOS Features Without iPhone

### Method 1: Development Mode Toggle (Recommended)
1. **Start your development server**: `npm run dev`
2. **Open the app** in your browser
3. **Look for the blue toggle button** in the top-right corner (only visible in development)
4. **Click "🍎 iOS Mode"** to simulate iOS behavior
5. **Test all iOS-specific features**:
   - Audio initialization flow
   - Loading states
   - Error handling
   - Simplified animations
   - iOS-specific UI elements

### Method 2: URL Parameter
Add `?dev=ios` to your URL:
```
http://localhost:3000?dev=ios
```

### Method 3: Browser Developer Tools
1. **Open Chrome DevTools** (F12)
2. **Go to Device Toolbar** (Ctrl+Shift+M)
3. **Select iPhone device** from the dropdown
4. **Test the app** in mobile view
5. **Check console logs** for iOS-specific messages

### Method 4: Safari on Mac (Most Accurate)
1. **Open Safari** on your Mac
2. **Enable Developer Menu**: Safari → Preferences → Advanced → "Show Develop menu"
3. **Go to Develop → User Agent → iOS Device**
4. **Test the app** with iOS user agent

### Method 5: Browser Extensions
Install browser extensions that simulate iOS:
- **Chrome**: "User-Agent Switcher" extension
- **Firefox**: "User Agent Switcher" add-on

## 🔍 What to Test in iOS Mode

### Audio Initialization
- [ ] Loading screen appears
- [ ] Audio context initialization
- [ ] User interaction requirement
- [ ] Error handling for audio failures
- [ ] Fallback mechanisms

### UI/UX Elements
- [ ] iOS-specific loading messages
- [ ] Simplified animations
- [ ] Touch interactions
- [ ] Error messages with iOS troubleshooting
- [ ] Audio activation overlay

### Performance
- [ ] Reduced animation complexity
- [ ] Faster loading times
- [ ] Memory usage optimization
- [ ] Smooth interactions

### Error Scenarios
- [ ] Audio context failure
- [ ] Microphone permission denied
- [ ] Network connectivity issues
- [ ] Timeout scenarios

## 🐛 Debugging iOS Issues

### Console Logs to Watch For
```javascript
🍎 iOS detected - applying early fixes
🍎 iOS device detected - initializing audio session
🔧 Dev Mode: true/false
✅ AudioContext available
✅ iOS audio session configured
✅ iOS audio session activated successfully
⏰ Audio initialization timeout - showing fallback
```

### Common Testing Scenarios

#### 1. Audio Initialization Success
- Should see loading screen → audio initialized → main app
- Console should show successful audio context creation

#### 2. Audio Initialization Failure
- Should see error screen with retry options
- Console should show specific error messages

#### 3. User Interaction Required
- Should show iOS audio activation overlay
- Should require tap/click to proceed

#### 4. Timeout Scenarios
- Wait 10+ seconds without interaction
- Should show fallback error message

## 📱 Real Device Testing Options

### Free Options
1. **BrowserStack** (free tier): Test on real iOS devices
2. **LambdaTest** (free tier): iOS Safari testing
3. **Sauce Labs** (free tier): Cross-browser testing

### Paid Options
1. **AWS Device Farm**: Real device testing
2. **Firebase Test Lab**: Android and iOS testing
3. **Appetize**: iOS simulator in browser

### Local Options
1. **Xcode Simulator** (Mac only): iOS simulator
2. **iOS Simulator** (Mac only): Built into Xcode

## 🔧 Development Tips

### Quick Testing Commands
```bash
# Start dev server
npm run dev

# Test iOS mode
open http://localhost:3000?dev=ios

# Test with different user agents
# (Use browser dev tools)
```

### Debugging Commands
```javascript
// Check if iOS mode is active
console.log('iOS Mode:', localStorage.getItem('samantha_dev_ios'));

// Force iOS mode
localStorage.setItem('samantha_dev_ios', 'true');
location.reload();

// Disable iOS mode
localStorage.removeItem('samantha_dev_ios');
location.reload();
```

### Performance Testing
```javascript
// Monitor memory usage
console.log('Memory:', performance.memory);

// Monitor frame rate
let frameCount = 0;
let lastTime = performance.now();

function checkFPS() {
  frameCount++;
  const currentTime = performance.now();
  
  if (currentTime - lastTime >= 1000) {
    console.log('FPS:', frameCount);
    frameCount = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(checkFPS);
}

checkFPS();
```

## Common iOS Issues

### 1. Black Screen After Greeting
**Symptoms**: App loads, greeting plays, then black screen
**Cause**: iOS audio session not properly initialized
**Solution**: 
- Tap anywhere on the screen to activate audio
- Make sure device is not on silent mode
- Use Safari browser (not Chrome/Firefox)

### 2. No Microphone Access
**Symptoms**: App asks for microphone but doesn't work
**Cause**: iOS permission restrictions
**Solution**:
- Go to Settings > Safari > Microphone > Allow
- Refresh the page after granting permission
- Try closing and reopening Safari

### 3. Silent Mode Issues
**Symptoms**: Can't hear audio even with volume up
**Cause**: iOS silent mode switch is on
**Solution**:
- Flip the silent mode switch on the side of your device
- Check that media volume is turned up
- Try using headphones

## Technical Solutions

### Audio Session Configuration
The app automatically configures iOS audio sessions with:
- **Category**: `playAndRecord` (allows both microphone and speaker)
- **Mode**: `voiceChat` (optimized for voice communication)
- **Options**: `defaultToSpeaker`, `allowBluetooth`, `allowBluetoothA2DP`

### User Interaction Requirement
iOS requires user interaction before audio can be activated. The app handles this by:
1. Detecting iOS devices automatically
2. Showing an audio activation overlay
3. Waiting for user tap/click before initializing audio
4. Creating a silent oscillator to activate the audio session

### Browser Compatibility
**Recommended**: Safari (full support)
**Limited**: Chrome, Firefox (may have audio issues)
**Not Supported**: In-app browsers (Facebook, Instagram, etc.)

## Debug Information

### Console Logs
When debugging iOS issues, check the browser console for these messages:
- `🍎 iOS device detected - initializing audio session`
- `✅ AudioContext available`
- `✅ iOS audio session configured`
- `✅ iOS audio session activated successfully`

### Error Messages
Common error messages and solutions:
- `Audio initialization failed`: Tap the screen to retry
- `Microphone access denied`: Check Safari permissions
- `Audio not supported`: Use Safari browser

## Manual Troubleshooting Steps

1. **Force Refresh**: Pull down on the page to refresh
2. **Clear Safari Data**: Settings > Safari > Clear History and Website Data
3. **Restart Safari**: Close Safari completely and reopen
4. **Restart Device**: Power cycle your iPhone/iPad
5. **Check Updates**: Ensure iOS is up to date

## Advanced Configuration

### Audio Session Settings
```javascript
{
  category: 'playAndRecord',
  mode: 'voiceChat', 
  options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
}
```

### Silent Mode Bypass
The app attempts to bypass silent mode using:
- Audio session configuration
- Silent oscillator activation
- User interaction detection

**Note**: This is a known iOS limitation with web apps. The physical silent mode switch is designed to block all audio, including web app audio. The solutions above are the best ways to work around this limitation.

## Support

If you continue experiencing issues:
1. Check the console logs for specific error messages
2. Try the troubleshooting steps above
3. Ensure you're using Safari on a supported iOS version
4. Contact support with specific error details 