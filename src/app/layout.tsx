import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Personal AI Knowledge Base",
  description: "Your personal digital memory system",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --font-serif: ${instrumentSerif.style.fontFamily};
            --font-mono: ${ibmPlexMono.style.fontFamily};
            --color-bg: #0D0D0D;
            --color-surface: #111111;
            --color-border: #2A2A2A;
            --color-text: #F2F0EB;
            --color-muted: #8B8B8B;
            --color-accent: #C8922A;
          }
        `}</style>
      </head>
      <body
        className={`${instrumentSerif.variable} ${ibmPlexMono.variable} antialiased`}
        style={{
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
