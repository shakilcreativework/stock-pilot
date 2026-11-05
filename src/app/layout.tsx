import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockPilot — Operations Hub",
  description: "Production-grade inventory, product, and order management hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="en" suppressHydrationWarning>
          <body
            suppressHydrationWarning
            className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white"
          >
            {children}
          </body>
        </html>
        );
}

