'use client';

import React, { useState, useEffect, memo, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter, usePathname } from 'next/navigation';
import {
  useSession,
  signOut,
  filterNavigation,
  getDashboardUrl,
  getProfileUrl,
  isAdmin,
  isSuperAdmin,
  isOrganizer,
  convertSessionUser,
  type AuthUser,
} from '@/lib/auth-client';
import { Menu, X, ChevronDown, User, Plus, Instagram, LogOut, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/social';

interface NavLink {
  name: string;
  href: string;
  requiresAuth?: boolean;
  roles?: string[];
}

// Memoized components for better performance
const Logo = memo(() => (
  <Link
    href="/"
    className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    aria-label="MyEvent home"
  >
    <Image
      src="/assets/icons/logo-myevent.png"
      alt="MyEvent"
      width={150}
      height={71}
      className="h-12 w-auto sm:h-14"
      priority
    />
  </Link>
));

Logo.displayName = 'Logo';

const InstagramLink = ({ className = '' }: { className?: string }) => (
  <a
    href={INSTAGRAM_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`MyEvent on Instagram, ${INSTAGRAM_HANDLE}`}
    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--me-line)] text-white transition-colors hover:border-[var(--me-magenta)] hover:bg-[var(--me-magenta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
  >
    <Instagram className="h-5 w-5" aria-hidden="true" />
  </a>
);

// Helper functions
const getCreateEventUrl = (authUser: AuthUser | undefined): string => {
  if (!authUser) return '/events/create';
  if (isAdmin(authUser) || isSuperAdmin(authUser)) {
    return '/admin/dashboard/events/create';
  } else if (isOrganizer(authUser)) {
    return '/dashboard/events/create';
  }
  return '/events/create';
};

const getCreateEventText = (authUser: AuthUser | undefined): string => {
  if (!authUser) return ' Host Your Event';
  if (isAdmin(authUser) || isSuperAdmin(authUser)) {
    return ' Create Event';
  } else if (isOrganizer(authUser)) {
    return ' New Event';
  }
  return ' Become Host';
};

const navigation: NavLink[] = [
  { name: 'Home', href: '/' },
  { name: 'Events', href: '/events' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
];

const MainHeader: React.FC = () => {
  const { data: session, isPending } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const authUser: AuthUser | undefined = useMemo(
    () => (session?.user ? convertSessionUser(session.user) : undefined),
    [session?.user]
  );

  const filteredNav = useMemo(
    () =>
      authUser
        ? filterNavigation(navigation, authUser)
        : navigation.filter((item) => !item.requiresAuth),
    [authUser]
  );

  const createEventUrl = useMemo(() => getCreateEventUrl(authUser), [authUser]);
  const createEventText = useMemo(
    () => getCreateEventText(authUser).trim(),
    [authUser]
  );

  // Border appears once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Lock page scroll while the mobile menu is open, close on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

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
            if (typeof window !== 'undefined') {
              localStorage.clear();
              sessionStorage.clear();
            }
            toast.success("You've logged out. See you soon!");
            setIsSigningOut(false);
            router.push('/auth/login');
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  // On the home page the header floats over the full-screen hero: transparent at the top of
  // the page, solid as soon as the visitor scrolls (or opens the mobile menu).
  const overHero = pathname === '/' && !scrolled && !mobileMenuOpen;
  const shell = `fixed inset-x-0 top-0 z-50 border-b-2 transition-[background-color,border-color] duration-300 ${
    overHero
      ? 'border-transparent bg-transparent'
      : `bg-[var(--me-bg)] ${scrolled ? 'border-[var(--me-line)]' : 'border-transparent'}`
  }`;

  if (isPending) {
    return (
      <header className={shell}>
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 lg:px-8">
          <Logo />
          <div className="h-9 w-24 animate-pulse rounded-full bg-[var(--me-raised)]" />
        </nav>
      </header>
    );
  }

  const navLinkClass = (href: string) =>
    `relative px-1 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm ${
      isActive(href) ? 'text-white' : 'text-[var(--me-muted)] hover:text-white'
    }`;

  return (
    <>
      <header className={shell}>
        <nav
          className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 lg:px-8"
          aria-label="Main"
        >
          <Logo />

          {/* Desktop navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {filteredNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={navLinkClass(item.href)}
              >
                {item.name}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-[var(--me-red)] transition-transform duration-200 origin-left ${
                    isActive(item.href) ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <InstagramLink />
            <Link
              href={createEventUrl}
              className="me-slide-right inline-flex items-center gap-1.5 rounded-full bg-[var(--me-red)] px-5 py-2.5 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--me-violet)] hover:shadow-[3px_3px_0_0_var(--me-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {createEventText}
            </Link>

            {authUser ? (
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setAccountOpen(false);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--me-line)] py-1.5 pl-2 pr-3 text-sm font-semibold text-white transition-colors hover:border-[var(--me-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--me-violet)]">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="max-w-[9rem] truncate">
                    {authUser.name || 'Account'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-60 overflow-hidden rounded-xl border-2 border-[var(--me-line)] bg-[var(--me-surface)] shadow-[6px_6px_0_0_var(--me-violet)]"
                  >
                    <div className="border-b border-[var(--me-line)] px-4 py-3">
                      <p className="truncate text-sm font-bold text-white">
                        {authUser.name}
                      </p>
                      <p className="text-xs text-[var(--me-muted)]">
                        {authUser.subRole
                          ? authUser.subRole.charAt(0).toUpperCase() +
                            authUser.subRole.slice(1)
                          : authUser.role}
                      </p>
                    </div>
                    <Link
                      role="menuitem"
                      href={getProfileUrl(authUser)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-[var(--me-raised)]"
                    >
                      <User className="h-4 w-4" aria-hidden="true" /> Profile
                    </Link>
                    <Link
                      role="menuitem"
                      href={getDashboardUrl(authUser)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-[var(--me-raised)]"
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={handleLogout}
                      disabled={isSigningOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-[var(--me-raised)] disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--me-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full border-2 border-[var(--me-violet)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--me-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 lg:hidden">
            <InstagramLink />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--me-red)] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu: full-screen panel */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[var(--me-bg-deep)] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b-2 border-[var(--me-line)] px-4">
            <Logo />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--me-line)] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {filteredNav.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={`font-display flex items-center justify-between rounded-xl px-4 py-4 text-3xl font-extrabold transition-colors ${
                      isActive(item.href)
                        ? 'bg-[var(--me-surface)] text-white'
                        : 'text-[var(--me-muted)] hover:bg-[var(--me-surface)] hover:text-white'
                    }`}
                  >
                    {item.name}
                    {isActive(item.href) && (
                      <span className="h-3 w-3 rounded-full bg-[var(--me-red)]" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={createEventUrl}
              onClick={() => setMobileMenuOpen(false)}
              className="me-slide-right mt-6 flex items-center justify-center gap-2 rounded-full bg-[var(--me-red)] px-6 py-4 text-base font-bold text-white shadow-[4px_4px_0_0_var(--me-violet)] hover:shadow-[4px_4px_0_0_var(--me-red)]"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              {createEventText}
            </Link>

            <div className="mt-8 space-y-1 border-t-2 border-[var(--me-line)] pt-6">
              {authUser ? (
                <>
                  <p className="px-4 pb-2 text-sm text-[var(--me-muted)]">
                    Signed in as{' '}
                    <span className="font-semibold text-white">{authUser.name}</span>
                  </p>
                  <Link href={getProfileUrl(authUser)} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-lg font-semibold text-white hover:bg-[var(--me-surface)]">
                    Profile
                  </Link>
                  <Link href={getDashboardUrl(authUser)} onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-lg font-semibold text-white hover:bg-[var(--me-surface)]">
                    Dashboard
                  </Link>
                  {(isSuperAdmin(authUser) || isAdmin(authUser)) && (
                    <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block rounded-xl px-4 py-3 text-lg font-semibold text-white hover:bg-[var(--me-surface)]">
                      Admin panel
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isSigningOut}
                    className="block w-full rounded-xl px-4 py-3 text-left text-lg font-semibold text-white hover:bg-[var(--me-surface)] disabled:opacity-50"
                  >
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="rounded-full border-2 border-[var(--me-line)] px-4 py-3 text-center text-base font-semibold text-white">
                    Log in
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)} className="rounded-full border-2 border-[var(--me-violet)] bg-[var(--me-violet)] px-4 py-3 text-center text-base font-semibold text-white">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center gap-2 border-t-2 border-[var(--me-line)] py-4 text-sm font-semibold text-white"
          >
            <Instagram className="h-5 w-5 text-[var(--me-magenta)]" aria-hidden="true" />
            Follow {INSTAGRAM_HANDLE} on Instagram
          </a>
        </div>
      )}
    </>
  );
};

export default memo(MainHeader);
