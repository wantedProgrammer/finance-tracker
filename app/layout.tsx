import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css" with { type: "css" };
import { QueryProvider } from "@/providers/query-provider";
import { SheetProvider } from "@/providers/sheet-provider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for greetings and big numbers; Geist stays the UI font.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Horizon",
  description: "Track where your money goes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
        >
          <QueryProvider>
            <SheetProvider />
            <Toaster />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
