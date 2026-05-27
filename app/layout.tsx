import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vine — English Learning',
  description: 'Learn English with your Vine community',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-amber-50">{children}</body>
    </html>
  )
}
