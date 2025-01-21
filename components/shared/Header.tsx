'use client';

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import NavItems from './NavItems';
import MobileNav from './MobileNav';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Check if the scroll position is greater than 50px
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={`w-full fixed top-0 z-50 transition-colors duration-300 ${
        isScrolled ? 'bg-black/90' : 'bg-transparent'
      }`}
    >
      <div className="wrapper flex items-center justify-between">
        <Link href="/" className="w-44">
          <Image
            src="/assets/images/logo.png"
            width={256}
            height={76}
            alt="MyEvent logo"
          />
        </Link>

        <SignedIn>
          <nav className="md:flex-between hidden w-full max-w-xs">
            <NavItems />
          </nav>
        </SignedIn>

        <div className="flex w-44 justify-end gap-3">
          <SignedIn>
            <UserButton />
            <MobileNav />
          </SignedIn>
          <div>
            <SignedOut>
              <Link
                href="/sign-in"
                className="uppercase text-xl font-semibold text-white"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
