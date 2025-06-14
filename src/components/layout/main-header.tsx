'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  useSession,
  signOut,
  filterNavigation,
  getDashboardUrl,
  getProfileUrl,
  isAdmin,
  isSuperAdmin,
  convertSessionUser,
  type AuthUser,
} from '@/lib/auth-client';
import { Menu, X, ChevronDown, User } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';

interface NavLink {
  name: string;
  href: string;
  requiresAuth?: boolean;
  roles?: string[];
}

const navigation: NavLink[] = [
  { name: 'Home', href: '/' },
  { name: 'Events', href: '/events' },
  { name: 'Blog', href: '/blog' },
  {
    name: 'Create Event',
    href: '/events/create',
    // requiresAuth: true,
    // roles: ['ORGANIZER', 'ADMIN'],
  },
];

const MainHeader: React.FC = () => {
  const { data: session, isPending, error } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  // Convert session user to AuthUser for type safety
  const authUser: AuthUser | undefined = session?.user
    ? convertSessionUser(session.user)
    : undefined;

  // Debug logging
  useEffect(() => {
    console.log('=== HEADER DEBUG ===');
    console.log('Session:', session);
    console.log('AuthUser:', authUser);
    console.log('isPending:', isPending);
    console.log('Error:', error);
    console.log('User Role:', authUser?.role);
    console.log('User SubRole:', authUser?.subRole);
    console.log('===================');
  }, [session, authUser, isPending, error]);

  // Handle scroll event to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      await signOut({
        fetchOptions: {
          onError: (ctx) => {
            console.error('Logout error:', ctx.error);
            toast.error(ctx.error.message);
            setIsSigningOut(false);
          },
          onSuccess: () => {
            console.log('Logout successful');
            // Clear all storage
            if (typeof window !== 'undefined') {
              localStorage.clear();
              sessionStorage.clear();

              // Clear all cookies by setting them to expire
              document.cookie.split(';').forEach((c) => {
                const eqPos = c.indexOf('=');
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                document.cookie =
                  name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                document.cookie =
                  name +
                  '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' +
                  window.location.hostname;
              });
            }

            toast.success("You've logged out. See you soon!");
            setIsSigningOut(false);
            router.push('/auth/login');
            // Force a hard refresh to ensure all state is cleared
            window.location.reload();
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  // Update navigation with dynamic dashboard URL
  const updatedNavigation = navigation.map((item) => {
    if (item.name === 'Dashboard' && item.href === '/dashboard' && authUser) {
      return {
        ...item,
        href: getDashboardUrl(authUser),
      };
    }
    return item;
  });

  // Filter navigation based on user session and roles
  const filteredNav = authUser
    ? filterNavigation(updatedNavigation, authUser)
    : updatedNavigation.filter((item) => !item.requiresAuth);

  // Show loading state during pending
  if (isPending) {
    return (
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-black/50 backdrop-blur-lg shadow-lg' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <Image
                src="/assets/icons/logo-myevent.png"
                alt="myevent.com.ng Logo"
                width={200}
                height={80}
              />
            </Link>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <div className="text-white">Loading...</div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/50 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <Image
              src="/assets/icons/logo-myevent.png"
              alt="myevent.com.ng Logo"
              width={200}
              height={80}
            />
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className={`-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 ${
              scrolled ? 'text-white' : 'text-gray-700'
            }`}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6 text-white" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-12">
          {filteredNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-lg font-semibold leading-6 ${
                scrolled
                  ? 'text-white hover:text-indigo-300'
                  : 'text-white hover:text-indigo-600'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Debug info - Remove in production */}
        {process.env.NODE_ENV === 'development' && authUser && (
          <div className="hidden lg:flex text-xs text-white bg-red-500 px-2 py-1 rounded">
            {authUser.role}:{authUser.subRole}
          </div>
        )}

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {authUser ? (
            <div className="relative group">
              <button className="flex items-center text-sm font-semibold leading-6 group text-white">
                <User className="h-5 w-5 mr-1" />
                {authUser.name || 'User'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900">
                    {authUser.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {authUser.subRole
                      ? `${
                          authUser.subRole.charAt(0).toUpperCase() +
                          authUser.subRole.slice(1)
                        }`
                      : authUser.role}
                  </p>
                </div>
                <Link
                  href={getProfileUrl(authUser)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <Link
                  href={getDashboardUrl(authUser)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isSigningOut}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => router.push('/auth/login')}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 bg-transparent backdrop-blur-sm transition-all duration-300"
              >
                Log in
              </Button>
              <Link
                href="/auth/register"
                className={`rounded-md px-3.5 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  scrolled
                    ? 'bg-indigo-500 hover:bg-indigo-400'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-black/90 backdrop-blur-lg px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="text-xl font-bold text-white">EventHub</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/30">
                <div className="space-y-2 py-6">
                  {filteredNav.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-white/10"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  {authUser ? (
                    <>
                      <Link
                        href={getProfileUrl(authUser)}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href={getDashboardUrl(authUser)}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      {(isSuperAdmin(authUser) || isAdmin(authUser)) && (
                        <Link
                          href="/admin/dashboard"
                          className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        disabled={isSigningOut}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10 w-full text-left disabled:opacity-50"
                      >
                        {isSigningOut ? 'Signing out...' : 'Sign out'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/login"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Log in
                      </Link>
                      <Link
                        href="/auth/register"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 bg-indigo-600 text-white hover:bg-indigo-500"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MainHeader;
