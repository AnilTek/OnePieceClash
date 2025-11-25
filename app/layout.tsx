import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Onepiecedle Clash",
  description: "One Piece Wordle-style game",
  robots: {
    index: false, // Arama motorları indexlemesin
    follow: false, // Linkleri takip etmesin
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Suspense fallback={
              <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-4">
                  <div className="flex items-center justify-between h-16">
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      Onepiecedle Clash
                    </div>
                  </div>
                </div>
              </nav>
            }>
              <Navbar />
            </Suspense>
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
