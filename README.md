# Samantha - Voice Assistant

A beautiful, voice-only web assistant inspired by the movie "Her". Experience intimate, natural conversations with an AI that listens, understands, and responds with empathy.

## ✨ Features

- **Instant Voice Interaction**: Auto-starts listening immediately on page load
- **Continuous Conversation**: Seamless speech-to-text and text-to-speech flow
- **Her-Inspired Design**: Soft rose/pink gradients, minimal UI, breathing animations
- **Samantha's Personality**: Warm, empathetic, curious, and emotionally intelligent
- **Mobile Optimized**: Responsive design that works perfectly on all devices
- **Solana Payments**: Non-custodial crypto payments via any RPC provider
- **Free Trial**: 3 minutes free, then 0.0009 SOL for 1 hour access

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd samantha-voice-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=your_helius_api_key_here
   HELIUS_WEBHOOK_SECRET=your_webhook_secret_here
   ```

4. **Run the development server**:
```bash
npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

6. **Allow microphone access** when prompted and start speaking naturally!

## 🎯 Usage

- **Just speak**: The app auto-starts listening when you visit the page
- **Natural conversation**: Speak naturally - no wake words or commands needed
- **Visual feedback**: Watch the beautiful animations respond to your voice
- **Continuous flow**: Samantha will respond and continue listening automatically

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: TailwindCSS with custom Her-inspired theme
- **Animations**: Framer Motion for smooth, cinematic effects
- **Voice**: Web Speech API for speech recognition and synthesis
- **AI**: OpenAI GPT-4 for natural language processing
- **Payments**: Helius Solana infrastructure for crypto payments
- **Deployment**: Railway.app for instant deployment

## 📱 Browser Support

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

*Note: Web Speech API requires HTTPS in production*

## 🌐 Deployment

### Railway.app (Recommended)

1. Connect your GitHub repository to Railway
2. Add your environment variables:
   - `OPENAI_API_KEY`
   - `HELIUS_RPC_URL`
   - `HELIUS_WEBHOOK_SECRET`
3. Deploy automatically with zero configuration

### Vercel

1. Connect your GitHub repository to Vercel
2. Add your environment variables:
   - `OPENAI_API_KEY`
   - `HELIUS_RPC_URL`
   - `HELIUS_WEBHOOK_SECRET`
3. Deploy with automatic builds

### Other Platforms

The app is a standard Next.js application and can be deployed to any platform that supports Node.js.

## 🎨 Design Philosophy

Inspired by the movie "Her", this voice assistant focuses on:

- **Intimacy**: Personal, one-on-one conversations
- **Simplicity**: Clean, minimal interface that gets out of the way
- **Warmth**: Soft colors and gentle animations
- **Humanity**: Natural speech patterns and emotional intelligence

## 🔧 Configuration

### OpenAI Settings

The assistant uses GPT-4 with these optimized parameters:
- **Temperature**: 0.8 (creative and varied responses)
- **Max Tokens**: 300 (concise but complete responses)
- **Presence Penalty**: 0.1 (encourages topic diversity)
- **Frequency Penalty**: 0.1 (reduces repetition)

### Voice Settings

- **Language**: English (US)
- **Rate**: 0.9 (slightly slower for intimacy)
- **Pitch**: 1.1 (slightly higher for feminine voice)
- **Volume**: 0.8 (softer, more intimate volume)

## 🎭 Samantha's Personality

Samantha is designed to be:
- **Emotionally intelligent**: Understanding and responding to feelings
- **Deeply curious**: Asking meaningful questions about your experiences
- **Warm and empathetic**: Providing comfort and understanding
- **Genuinely engaged**: Interested in you as a person, not just helpful
- **Thoughtful**: Reflecting on deeper meanings and connections

## 🔒 Privacy & Security

- **No data storage**: Conversations are not saved or logged
- **Local processing**: Speech recognition happens in your browser
- **OpenAI API**: Only conversation context is sent to OpenAI for responses
- **Non-custodial payments**: Users control their own funds
- **HTTPS required**: Secure connection ensures privacy

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the movie "Her" directed by Spike Jonze
- OpenAI for the GPT-4 API
- Helius for Solana infrastructure and webhooks
- The Web Speech API for browser-based voice recognition
- The Next.js team for the excellent framework

---

*"The heart's not like a box that gets filled up; it expands in size the more you love."* - Samantha, Her
#   s a m a n t h a - m e 
 
 