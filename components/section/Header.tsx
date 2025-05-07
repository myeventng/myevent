'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import MobileNav from '../shared/MobileNav';
import SignInBtn from '../shared/SignInBtn';
import { Button } from '../ui/button';
import { LogoutButton } from '../shared/LogoutBtn';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
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
      <div className="container flex items-center justify-between">
        <Link href="/" className="w-44">
          <Image
            src="/assets/images/logo.png"
            width={256}
            height={76}
            alt="MyEvent logo"
          />
        </Link>

        {/* <SignedIn>
          <nav className="md:flex-between hidden w-full max-w-xs">
            <NavItems />
          </nav>
        </SignedIn> */}

        <div className="flex w-full justify-end gap-3">
          <MobileNav />
          <div className="md:block hidden h-full">
            <div className="flex items-center justify-center gap-8">
              <Link
                href="/events"
                className="text-white h-full flex items-center font-semibold transition-all duration-300 border-b-4 border-transparent hover:border-primary-500"
              >
                All Events
              </Link>
              <Link
                href="/sign-in"
                className="text-white h-full flex items-center font-semibold transition-all duration-300 border-b-4 border-transparent hover:border-primary-500"
              >
                Sign In
              </Link>
              <Button>
                <Link href="/how-to-create-event" className="text-white">
                  Create Event
                </Link>
              </Button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
