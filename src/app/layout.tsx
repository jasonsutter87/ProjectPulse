import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProjectPulse",
  description: "Scrum board with AI agent for managing multiple projects",
};

// Check if auth is disabled OR if Clerk keys are not configured
const isAuthDisabled = process.env.DISABLE_AUTH === "true";
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <body
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {children}
    </body>
  );

  // Only wrap with ClerkProvider if auth is enabled AND Clerk keys are configured
  if (isAuthDisabled || !hasClerkKeys) {
    return <html lang="en">{body}</html>;
  }

  return (
    <ClerkProvider>
      <html lang="en">{body}</html>
    </ClerkProvider>
  );
}
