import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Pramaan — Issue & verify certificates', template: '%s · Pramaan' },
  description:
    'Pramaan is the trust layer for academic and professional credentials. Institutions issue certificates with a unique QR; anyone can verify in one tap.',
  applicationName: 'Pramaan',
  keywords: ['certificate', 'verification', 'institutions', 'India', 'credential', 'pramaan'],
  authors: [{ name: 'Pramaan' }],
  openGraph: {
    title: 'Pramaan',
    description: 'Har certificate ka Pramaan — issue, verify, and prove credentials in seconds.',
    type: 'website',
    locale: 'en_IN',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
