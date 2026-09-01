import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1c" },
  ],
  viewportFit: "cover",
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('d2Theme');
    var dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <noscript>
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#e6edf3",
              background: "#0a0f1c",
              minHeight: "100vh",
            }}
          >
            <h1>Destiny 2 Guessing Game</h1>
            <p>JavaScript is required to play this game. Please enable JavaScript in your browser.</p>
          </div>
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
