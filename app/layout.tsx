import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Destiny 2 Guessing Game",
  description:
    "A Wordle-style guessing game for Destiny 2 exotic weapons, armor, and perks. Test your Destiny knowledge!",
  keywords: [
    "destiny 2",
    "wordle",
    "guessing game",
    "exotic weapons",
    "bungie",
    "destiny",
  ],
  authors: [{ name: "Destiny 2 Guessing Game" }],
  openGraph: {
    title: "Destiny 2 Guessing Game",
    description:
      "Can you guess the exotic weapon, armor, or perk? A Wordle-style game with Destiny 2 data.",
    type: "website",
    siteName: "Destiny 2 Guessing Game",
    locale: "en_US",
    alternateLocale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny 2 Guessing Game",
    description:
      "Can you guess the exotic weapon, armor, or perk? A Wordle-style game with Destiny 2 data.",
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1c",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <noscript>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#e6edf3', background: '#0a0f1c', minHeight: '100vh' }}>
            <h1>Destiny 2 Guessing Game</h1>
            <p>JavaScript is required to play this game. Please enable JavaScript in your browser.</p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
