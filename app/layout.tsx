import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'GNI Myanmar | Global Nexus Insights',
  description: 'Global Nexus Insights - Myanmar Intelligence Dashboard',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my">
      <body className="bg-gray-950 text-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
