import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

const nunito = Nunito({
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MyEvents',
  description: 'Ticket Booking And Management System',
  // icons: {
  //   icon: [
  //     '/favicon.svg',
  //     { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
  //   ],
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en">
        <body className={`${nunito.variable} antialiased font-nunito`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
