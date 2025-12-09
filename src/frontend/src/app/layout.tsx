import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PendingBookingsWrapper from "@/components/PendingBookingsWrapper";
import StripeProviderWrapper from "@/components/StripeProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "UniGO - Carsharing Universitario",
  description: "Plataforma de carsharing para estudiantes universitarios",
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
      >
        <StripeProviderWrapper>
          {children}
          <PendingBookingsWrapper />
        </StripeProviderWrapper>
      </body>
    </html>
  );
}
