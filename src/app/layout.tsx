import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/atoms/ProviderWrapper'

const inter = Inter({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Undian Online',
  description: 'Undian Online',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body cz-shortcut-listen="true">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
