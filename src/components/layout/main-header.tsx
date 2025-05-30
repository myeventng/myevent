'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { Menu, X, ChevronDown, User } from 'lucide-react';
import Image from 'next/image';

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
    requiresAuth: true,
    roles: ['organizer', 'admin'],
  },
  { name: 'Dashboard', href: '/dashboard', requiresAuth: true },
];

const MainHeader: React.FC = () => {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const userRole = session?.user?.role || '';
  const userSubRole = session?.user?.subRole || '';
  const isAdmin = userRole === 'ADMIN';

  // Helper function to get dashboard URL based on user role
  const getDashboardUrl = () => {
    return isAdmin ? '/admin/dashboard' : '/dashboard';
  };

  // Helper function to get profile URL based on user role
  const getProfileUrl = () => {
    return isAdmin ? '/admin/dashboard/profile' : '/dashboard/profile';
  };

  // Handle scroll event to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = () => {
    signOut({
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },

        onSuccess: () => {
          toast.success("You've logged out. See you soon!");
          router.push('/auth/login');
        },
      },
    });
  };

  const updatedNavigation = navigation.map((item) => {
    if (item.name === 'Dashboard' && item.href === '/dashboard') {
      return { ...item, href: getDashboardUrl() };
    }
    return item;
  });

  const filteredNav = updatedNavigation.filter((item) => {
    if (!item.requiresAuth) return true;
    if (!session) return false;
    if (!item.roles) return true;
    return item.roles.includes(userSubRole) || item.roles.includes(userRole);
  });

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
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-12">
          {filteredNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-xl font-semibold leading-6 ${
                scrolled
                  ? 'text-white hover:text-indigo-300'
                  : 'text-white hover:text-indigo-600'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {session ? (
            <div className="relative group">
              <button className="flex items-center text-sm font-semibold leading-6 group text-white">
                <User className="h-5 w-5 mr-1" />
                {session.user?.name || 'User'}
                <ChevronDown className="h-4 w-4 ml-1" />
              </button>
              <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userSubRole
                      ? `${
                          userSubRole.charAt(0).toUpperCase() +
                          userSubRole.slice(1)
                        }`
                      : userRole}
                  </p>
                </div>
                <Link
                  href={getProfileUrl()}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </Link>
                <Link
                  href={getDashboardUrl()}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`text-sm font-semibold leading-6 ${
                  scrolled
                    ? 'text-white hover:text-indigo-300'
                    : 'text-gray-900 hover:text-indigo-600'
                }`}
              >
                Log in
              </Link>
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
                  {session ? (
                    <>
                      <Link
                        href={getProfileUrl()}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href={getDashboardUrl()}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      {(userSubRole === 'SUPER_ADMIN' ||
                        userRole === 'ADMIN') && (
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
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white hover:bg-white/10 w-full text-left"
                      >
                        Sign out
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
