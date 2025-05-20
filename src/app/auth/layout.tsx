// app/auth/layout.tsx
import React from 'react';
import { IBM_Plex_Sans } from 'next/font/google';

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Image Section - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 xl:w-3/5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: 'url(/images/event-bg.jpg)',
            backgroundBlendMode: 'overlay',
            opacity: 0.8,
          }}
        />
        <div className="relative z-10 p-12 text-white flex flex-col h-full justify-between">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-2">MyEventNg</h1>
            <p className="text-xl lg:text-2xl opacity-90">
              Experience the extraordinary
            </p>
          </div>
          <div className="max-w-md">
            <p className="text-lg opacity-80 mb-6">
              Join our community and discover amazing events happening around
              you. Create, share, and connect with like-minded individuals.
            </p>
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-3xl font-bold">10K+</p>
                <p className="text-sm">Events</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-3xl font-bold">50K+</p>
                <p className="text-sm">Users</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg">
                <p className="text-3xl font-bold">100+</p>
                <p className="text-sm">Cities</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Forms Section */}
      <div className="flex-1 md:w-1/2 xl:w-2/5 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="flex flex-col min-h-screen">
          {/* Mobile Header - Visible only on mobile */}
          <div className="md:hidden p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
            <h1 className="text-3xl font-bold">MyEventNg</h1>
            <p className="text-sm opacity-80">Experience the extraordinary</p>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-md">
              <div className={`space-y-6 ${ibmPlexSans.className}`}>
                {children}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 text-center text-gray-400 text-sm">
            <p>
              &copy; {new Date().getFullYear()} MyEventNg. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
