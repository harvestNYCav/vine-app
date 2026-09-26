import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vine',
  description: 'Learn with your Vine community',
  // Phone browsers set to Spanish auto-translate the site, which turns the English students are
  // learning into Spanish. The app has its own Spanish mode, so opt out of browser translation
  // entirely (Chrome reads this meta tag; Safari and Edge read translate="no" below).
  other: {
    google: 'notranslate',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className="h-full">
      <body className="min-h-full bg-amber-50">{children}</body>
    </html>
  )
}
