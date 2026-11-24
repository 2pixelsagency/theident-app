import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NativeAuthBridge from "@/components/NativeAuthBridge";
// The Ident brand: Bricolage Grotesque for display, Inter for body/UI
// Bricolage is self-hosted (OFL, app/fonts): fetching it from Google during the Vercel build was failing
const bricolage = localFont({
  src: [
    { path: "./fonts/bricolage-grotesque-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/bricolage-grotesque-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/bricolage-grotesque-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-bricolage",
  fallback: ["system-ui", "sans-serif"],
});
// Inter loads from Google Fonts in the browser (see <head>), not at build time: the build-time fetch kept failing on Vercel.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f4ee" };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.theident.me"),
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  {/* eslint-disable-next-line @next/next/no-page-custom-font */}
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" />
</head>
      <body
        style={{ margin: 0, padding: 0 }}
        className={bricolage.variable}
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
