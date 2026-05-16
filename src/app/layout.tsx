import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "SwarmSell — List everywhere in 60 seconds",
  description:
    "A swarm of AI agents + live Browserbase market intelligence generates optimized listings, pricing, and marketing across every major platform. Simultaneously.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
