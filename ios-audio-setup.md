# 🍎 iOS Audio Setup Guide

## 🚨 **iPhone Silent Mode Issue**

Samantha requires audio input/output to work, but iPhone's silent mode (physical switch) blocks web app audio. Here's how to fix it:

## ✅ **Quick Fix Steps**

### **1. Turn Off Silent Mode**
- **Locate the switch** on the left side of your iPhone
- **Flip it up** (away from the screen) to turn off silent mode
- **You should see** "Silent Mode Off" on screen

### **2. Allow Microphone Access**
- **When prompted**, tap "Allow" for microphone access
- **If not prompted**, go to Settings → Safari → Microphone → Allow

### **3. Check Volume**
- **Press volume buttons** to ensure volume is up
- **Check ringer volume** in Settings → Sounds & Haptics

## 🔧 **Advanced Solutions**

### **Option 1: Add to Home Screen**
1. **Open Safari** and go to Samantha
2. **Tap Share button** (square with arrow)
3. **Tap "Add to Home Screen"**
4. **Launch from home screen** - this often bypasses silent mode

### **Option 2: Use Different Browser**
- **Try Chrome** or **Firefox** from App Store
- **Some browsers** handle audio differently

### **Option 3: Audio Session Configuration**
The app now includes iOS-specific audio session configuration:
- **Automatic speaker routing**
- **Silent mode bypass attempts**
- **Enhanced audio permissions**

## 🎯 **Technical Details**

### **What We've Implemented:**
- **Audio Session Configuration**: `playAndRecord` mode with `voiceChat`
- **Speaker Routing**: Forces audio to speaker output
- **Silent Mode Detection**: Automatic detection and user guidance
- **Enhanced Permissions**: iOS-specific microphone constraints

### **Audio Session Settings:**
```javascript
{
  category: 'playAndRecord',
  mode: 'voiceChat', 
  options: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP']
}
```

## 🚨 **Common Issues & Solutions**

### **"No Audio Input" Error**
- **Check silent mode** is OFF
- **Allow microphone** in browser settings
- **Try refreshing** the page
- **Restart browser** completely

### **"No Audio Output" Error**
- **Check volume** is turned up
- **Try speaker mode** (app should auto-route)
- **Check Bluetooth** if using headphones

### **"Permission Denied" Error**
- **Go to Settings** → Safari → Microphone
- **Set to "Allow"**
- **Refresh page** and try again

## 📱 **iPhone Model Specific**

### **iPhone 14/15 Series**
- **Dynamic Island** may show audio indicator
- **Silent mode switch** on left side
- **Volume buttons** on left side

### **iPhone SE/13/12**
- **Silent mode switch** on left side
- **Volume buttons** on left side
- **Home button** models work the same

### **iPad**
- **No silent mode switch** - should work normally
- **Check volume** in Control Center
- **Allow microphone** in Settings

## 🔄 **Troubleshooting Steps**

1. **Turn off silent mode** (physical switch)
2. **Allow microphone** when prompted
3. **Check volume** is up
4. **Refresh page** completely
5. **Try different browser** (Chrome/Firefox)
6. **Add to home screen** and launch from there
7. **Restart iPhone** if still not working

## 📞 **Still Having Issues?**

If you're still experiencing audio problems:

1. **Check iOS version** (iOS 14+ recommended)
2. **Update Safari** to latest version
3. **Clear browser cache** and cookies
4. **Try incognito/private mode**
5. **Contact support** with your iOS version and iPhone model

## 🎉 **Success Indicators**

When working correctly, you should:
- **See microphone indicator** in status bar
- **Hear Samantha's voice** clearly
- **See voice visualization** responding to your speech
- **No "silent mode" warnings**

---

**Note**: This is a known iOS limitation with web apps. The physical silent mode switch is designed to block all audio, including web app audio. The solutions above are the best ways to work around this limitation. 