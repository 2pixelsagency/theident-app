import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import NativeAuthBridge from "@/components/NativeAuthBridge";
// The Ident brand: Bricolage Grotesque for display, Inter for body/UI
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], display: "swap", variable: "--font-bricolage" });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "swap", variable: "--font-inter" });
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f4ee" };

export const metadata: Metadata = {
  metadataBase: new URL("https://theident.me"),
  title: "The Ident — castings, auditions & paid work for performers",
  description: "Find castings, auditions and paid work. Apply with your reel, track every recall, and get found by casting directors.",
  openGraph: { siteName: "The Ident", type: "website", locale: "en_GB" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "The Ident",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0 }}>
    <head>
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="The Ident" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <link rel="manifest" href="/manifest.json" />
</head>
      <body
        style={{ margin: 0, padding: 0 }}
        className={bricolage.variable + " " + inter.variable}
      >
        {children}
        <NativeAuthBridge />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
          }
        `}} />
      </body>
    </html>
  );
}
