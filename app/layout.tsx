import type { Metadata, Viewport } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'GNI Myanmar | Global Nexus Insights',
  description: 'Global Nexus Insights - Myanmar Intelligence | $0.00/month | L7 Autonomous',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GNI Myanmar',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1D4ED8',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my">
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="GNI Myanmar" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1D4ED8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{fontFamily: "'Noto Sans Myanmar', sans-serif"}} className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
