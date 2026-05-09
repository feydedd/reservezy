import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Reservezy — Bookings that run themselves",
  description:
    "The all-in-one scheduling platform for salons, trainers, consultants and more. Take bookings 24/7 on your own branded page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${jakartaSans.variable} ${geistMono.variable} min-h-screen bg-rz-bg font-sans text-rz-text antialiased selection:bg-[#8b86f9]/30 selection:text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
