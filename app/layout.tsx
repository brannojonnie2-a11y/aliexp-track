import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AliExpress Login',
  description: 'AliExpress secure login with advanced security features',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
