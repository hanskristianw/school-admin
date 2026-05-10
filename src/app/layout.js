import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import ThemedNavbar from "@/components/ThemedNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Chung Chung School",
  description: "Chung Chung School Administration System",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Blocking script: apply dark-theme class before React hydrates to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('ui_theme')==='dark')document.documentElement.classList.add('dark-theme')}catch(e){}` }} />
      </head>
      <body className="antialiased overflow-hidden">
        <Providers>
          <div className="flex h-screen flex-col">
            {/* Global navbar with theme support */}
            <ThemedNavbar />
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
