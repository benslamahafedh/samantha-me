# 🔇 Mute Detection Feature

## Overview

The mute detection feature automatically detects when the user's microphone is muted and prevents Samantha from speaking when the user can't hear her. This ensures a better user experience by avoiding one-sided conversations.

## 🎯 How It Works

### **Automatic Mute Detection**
- **Audio Analysis**: Continuously monitors microphone audio levels
- **Threshold Detection**: Considers microphone muted when average volume < 5
- **Real-time Updates**: Checks mute status every 2 seconds
- **Visual Feedback**: Shows mute indicator when microphone is muted

### **Smart Speech Prevention**
- **Silent Samantha**: Automatically stops Samantha from speaking when muted
- **No Interruption**: Prevents speech from starting if mute is detected
- **Seamless Resume**: Automatically resumes normal behavior when unmuted
- **Status Display**: Shows "🔇 Microphone muted" in status area

## 🔧 Technical Implementation

### **Mute Detection Hook**
- **File**: `src/hooks/useMicrophoneMuteDetection.ts`
- **Features**:
  - Web Audio API integration
  - Frequency analysis for volume detection
  - Continuous monitoring with 2-second intervals
  - Automatic cleanup of audio resources

### **Audio Analysis**
```typescript
// Audio analysis settings
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.8;
analyser.minDecibels = -90;
analyser.maxDecibels = -10;

// Mute threshold
const muted = average < 5; // Volume threshold
```

### **Speech Prevention**
```typescript
// Don't speak if microphone is muted
if (muteDetection.isMuted) {
  console.log('🔇 Microphone is muted - skipping speech');
  return;
}
```

## 🎨 User Interface

### **Mute Indicator**
- **Location**: Top-right corner of screen
- **Design**: Floating notification with backdrop blur
- **Animation**: Smooth fade in/out with scale animation
- **Icon**: Red pulsing dot + 🔇 Muted text

### **Status Updates**
- **Visual**: Gray text color when muted
- **Message**: "🔇 Microphone muted" in status area
- **Behavior**: Overrides other status messages when muted

## 📱 Mobile Support

### **iOS Optimizations**
- **Audio Session**: Proper audio context initialization
- **Silent Mode**: Works even with silent switch on
- **Performance**: Optimized for mobile battery life
- **Touch**: No interference with touch interactions

### **Android Support**
- **Audio Permissions**: Respects microphone permissions
- **Background**: Continues detection in background
- **Battery**: Efficient audio analysis for longer battery life

## 🔍 Detection Accuracy

### **Volume Thresholds**
- **Muted**: Average volume < 5
- **Low Volume**: Average volume 5-15
- **Normal**: Average volume > 15
- **Adjustable**: Threshold can be modified in code

### **False Positive Prevention**
- **Stabilization**: 500ms delay before analysis
- **Smoothing**: 0.8 smoothing constant for stable readings
- **Multiple Samples**: Analyzes frequency data over time
- **Noise Filtering**: Ignores very low-level background noise

## 🛠️ Configuration

### **Detection Settings**
```typescript
// Detection interval (seconds)
const DETECTION_INTERVAL = 2;

// Volume threshold for mute detection
const MUTE_THRESHOLD = 5;

// Audio analysis settings
const FFT_SIZE = 256;
const SMOOTHING_TIME_CONSTANT = 0.8;
```

### **Customization Options**
- **Threshold Adjustment**: Modify mute detection sensitivity
- **Detection Frequency**: Change how often mute is checked
- **Visual Indicators**: Customize mute indicator appearance
- **Audio Settings**: Adjust audio analysis parameters

## 🚀 Benefits

### **User Experience**
- **No One-sided Conversations**: Samantha won't speak when you can't hear
- **Clear Status**: Always know when microphone is muted
- **Seamless Operation**: Automatic detection and prevention
- **Visual Feedback**: Clear indication of mute state

### **Technical Benefits**
- **Resource Efficient**: Minimal CPU usage for audio analysis
- **Battery Friendly**: Optimized for mobile devices
- **Reliable Detection**: Accurate mute state detection
- **Clean Integration**: Works seamlessly with existing voice system

## 🔧 Troubleshooting

### **Common Issues**

1. **Mute Not Detected**
   - Check microphone permissions
   - Ensure microphone is actually muted
   - Try refreshing the page
   - Check browser console for errors

2. **False Mute Detection**
   - Speak louder to increase volume
   - Check microphone settings
   - Ensure microphone is working
   - Try different microphone if available

3. **Performance Issues**
   - Close other audio applications
   - Check browser audio settings
   - Restart browser if needed
   - Clear browser cache

### **Debug Information**
```javascript
// Check mute detection in browser console
console.log('Mute detection status:', muteDetection.isMuted);
console.log('Audio levels:', audioLevels);
console.log('Detection errors:', muteDetection.error);
```

## 🔮 Future Enhancements

### **Planned Features**
- **Manual Override**: Allow users to force speech even when muted
- **Custom Thresholds**: User-adjustable mute sensitivity
- **Audio Visualization**: Show real-time audio levels
- **Mute History**: Track mute/unmute patterns

### **Advanced Detection**
- **Pattern Recognition**: Learn user's normal audio patterns
- **Environmental Adaptation**: Adjust to different environments
- **Multi-device Support**: Detect mute across multiple devices
- **Smart Notifications**: Intelligent mute state notifications

---

**🎉 The mute detection feature ensures Samantha only speaks when you can hear her!** 