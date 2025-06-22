import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MSWProvider from "../components/MSWProvider";
import TopNavigation from "../components/Navigation/TopNavigation";
import FeedbackButton from "../components/Navigation/FeedbackButton";
import BetaAppWrapper from "../components/BetaAppWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuyerMap App",
  description: "Validate your ICP assumptions against customer interviews",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <MSWProvider />
        <BetaAppWrapper>
          <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
            <TopNavigation />
            <main>
              {children}
            </main>
            <FeedbackButton variant="floating" position="bottom-right" />
          </div>
        </BetaAppWrapper>
      </body>
    </html>
  );
}
