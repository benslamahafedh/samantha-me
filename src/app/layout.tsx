import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-optimizations.css";
import "@/lib/polyfills";
import ErrorBoundary from "@/components/ErrorBoundary";

// Server initialization moved to runtime to prevent build issues

// Auto-transfer initialization moved to runtime only
// No build-time initialization to prevent deployment issues

export const metadata: Metadata = {
  metadataBase: new URL('https://samantha-voice-assistant.vercel.app'),
  title: "Samantha - Voice Assistant",
  description: "A beautiful voice-only assistant Powered by OMNIAOS. Speak naturally to begin an intimate conversation.",
  keywords: ["voice assistant", "AI", "conversation", "Her", "Samantha"],
  authors: [{ name: "Voice Assistant" }],
  manifest: "/manifest.json",
  // iOS-specific meta tags for audio
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Samantha",
    // Audio session configuration
    "audio-session-category": "playAndRecord",
    "audio-session-mode": "voiceChat",
    "audio-session-options": "defaultToSpeaker,allowBluetooth,allowBluetoothA2DP"
  },
  openGraph: {
    title: "Samantha - Voice Assistant",
    description: "A beautiful voice-only assistant Powered by OMNIAOS",
    type: "website",
    url: "https://samantha-voice-assistant.vercel.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Samantha Voice Assistant"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Samantha - Voice Assistant",
    description: "A beautiful voice-only assistant Powered by OMNIAOS",
    images: ["/og-image.png"]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f43f5e'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning={true}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
