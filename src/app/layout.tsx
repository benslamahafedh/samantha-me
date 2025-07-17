import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import WalletProvider from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "Samantha - Voice Assistant",
  description: "A beautiful voice-only assistant Powered by OMNIAOS. Speak naturally to begin an intimate conversation.",
  keywords: ["voice assistant", "AI", "conversation", "Her", "Samantha"],
  authors: [{ name: "Voice Assistant" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  themeColor: "#f43f5e",
  manifest: "/manifest.json",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning={true}>
        <ErrorBoundary>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
