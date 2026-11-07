import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vine',
  description: 'Learn with your Vine community',
  // The name and full-screen launch for "Add to Home Screen" on iPhones. The icon itself comes from
  // app/apple-icon.png, and Android reads app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: 'Vine',
    statusBarStyle: 'default',
  },
  // Phone browsers set to Spanish auto-translate the site, which turns the English students are
  // learning into Spanish. The app has its own Spanish mode, so opt out of browser translation
  // entirely (Chrome reads this meta tag; Safari and Edge read translate="no" below).
  other: {
    google: 'notranslate',
  },
}

export const viewport: Viewport = {
  themeColor: '#15803d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className="h-full">
      <body className="min-h-full bg-amber-50">{children}</body>
    </html>
  )
}
