import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'GNI Myanmar | Global Nexus Insights',
  description: 'Global Nexus Insights - Myanmar Intelligence Dashboard',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{fontFamily: "'Noto Sans Myanmar', sans-serif"}} className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
