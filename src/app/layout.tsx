import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@fontsource-variable/bricolage-grotesque';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/components/providers/query-provider';
//project



const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Myevent.com.ng | Nigerian Event Ticketing Platform',
  description:
    'Myevent.com.ng is Nigeria’s trusted platform to create, promote, and manage event tickets. Discover events, sell tickets online, and simplify event check-ins.',
  keywords: [
    'event ticketing Nigeria',
    'buy event tickets Nigeria',
    'host event Nigeria',
    'sell event tickets',
    'Myevent.com.ng',
    'Nigerian events',
    'online ticketing platform',
  ],
  metadataBase: new URL('https://myevent.com.ng'),
  openGraph: {
    title: 'Myevent.com.ng | Host & Manage Your Nigerian Events Easily',
    description:
      'Post your events, sell tickets, and manage attendee check-ins with ease on Myevent.com.ng — Nigeria’s one-stop event solution.',
    url: 'https://myevent.com.ng',
    siteName: 'Myevent.com.ng',
    images: [
      {
        url: '/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Myevent.com.ng - Nigerian Event Ticketing Platform',
      },
    ],
    locale: 'en_NG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Myevent.com.ng | Nigerian Event Ticketing Platform',
    description:
      'Buy and sell event tickets in Nigeria with Myevent.com.ng. Manage RSVPs, check-ins, and more.',
    images: ['/og-default.jpg'],
    site: '@myeventng',
  },
  authors: [
    {
      name: 'Myevent.com.ng',
      url: 'https://myevent.com.ng',
    },
  ],
  icons: {
    icon: '/favicon-32x32.png',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning: browser extensions (Grammarly, ColorZilla, password managers...)
  // add attributes to <html>/<body> before React loads. Without it React logs a
  // "tree hydrated but some attributes didn't match" error on every page load.
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
