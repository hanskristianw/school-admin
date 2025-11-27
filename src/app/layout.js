import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "School Admin Dashboard",
  description: "School Administration System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased overflow-hidden">
        <Providers>
          <div className="flex h-screen flex-col">
            {/* Global language switcher bar */}
            <div className="shrink-0 z-50 bg-white/70 backdrop-blur border-b">
              <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-end">
                {/* Render LanguageSwitcher here */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Language:</span>
                  <div id="global-language-switcher" />
                </div>
              </div>
            </div>
            {/* Content area fills the remaining height */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
