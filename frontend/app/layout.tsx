import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Influencer Campaign Manager",
  description:
    "Manage influencer campaigns, track negotiations, and run bulk WhatsApp outreach — all from one dashboard.",
  keywords: ["influencer", "campaign", "manager", "marketing", "dashboard"],
  openGraph: {
    title: "Influencer Campaign Manager",
    description: "End-to-end influencer campaign management dashboard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
