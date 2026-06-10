import type { Metadata, Viewport } from 'next'
import './globals.css'

const SITE_NAME  = 'VUSRC Awards'
const SITE_DESC  = 'Vote for your favourite students at the Vision University Student Representative Council Student Week Awards.'
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vusrc-awards.vercel.app'

export const viewport: Viewport = {
  themeColor: '#03110D',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ['VUSRC', 'Vision University', 'Student Week', 'Awards', 'Voting'],
  authors: [{ name: 'VUSRC' }],
  creator: 'VUSRC',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: SITE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VUSRC Student Week Awards',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Jost:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
