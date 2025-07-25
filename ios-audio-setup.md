# 🍎 iOS Audio Setup Guide

This guide helps resolve common iOS audio issues that can cause black screens or audio problems.

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