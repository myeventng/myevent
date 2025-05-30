'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Github,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Accordion component for mobile view
interface AccordionProps {
  title: string;
  children: React.ReactNode;
  initialExpanded?: boolean;
}

const MobileAccordion: React.FC<AccordionProps> = ({
  title,
  children,
  initialExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  return (
    <div className="border-b border-white/20 py-3 md:border-none">
      <button
        className="flex w-full justify-between items-center text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-bold">{title}</h3>
        <span className="md:hidden">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      <div
        className={`mt-3 md:mt-4 overflow-hidden transition-all duration-300 md:block ${
          isExpanded ? 'max-h-96' : 'max-h-0 md:max-h-none'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative">
      {/* Gradient background */}
      {/* <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600" /> */}
      <div className="absolute inset-0 bg-purple-900" />
      {/* Decorative swoosh */}
      {/* <div
        className="absolute top-0 left-0 right-0 h-8 bg-white"
        style={{
          clipPath: 'ellipse(50% 60% at 50% 0%)',
        }}
      /> */}

      {/* Bubble decorations */}
      <div className="absolute animate top-1/4 left-10 w-16 h-16 rounded-full bg-white/30 opacity-20" />
      <div className="absolute bottom-1/3 right-10 w-24 h-24 rounded-full bg-white/10 opacity-20" />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/10 opacity-20" />
      <div className="absolute bottom-1/4 right-1/4 w-20 h-20 rounded-full bg-white/10 opacity-10" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-white z-10 mt-7">
        <div className="md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {/* Column 1: About */}
          <MobileAccordion title="Myevent.com.ng" initialExpanded={true}>
            <div className="pb-4 md:pb-0">
              <p className="mb-4 text-white/80">
                Your one-stop platform for discovering, creating, and managing
                events. Join us to connect with organizers and attendees in
                Nigeria.
              </p>
              <div className="flex space-x-4 mt-4">
                <a
                  href="https://twitter.com"
                  className="text-white/80 hover:text-white transition"
                >
                  <Twitter size={20} />
                </a>
                <a
                  href="https://facebook.com"
                  className="text-white/80 hover:text-white transition"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="https://instagram.com"
                  className="text-white/80 hover:text-white transition"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://linkedin.com"
                  className="text-white/80 hover:text-white transition"
                >
                  <Linkedin size={20} />
                </a>
                <a
                  href="https://github.com"
                  className="text-white/80 hover:text-white transition"
                >
                  <Github size={20} />
                </a>
              </div>
            </div>
          </MobileAccordion>

          {/* Column 2: Quick Links */}
          <MobileAccordion title="Quick Links">
            <ul className="space-y-2 text-white/80 pb-4 md:pb-0">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-white transition">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faqs" className="hover:text-white transition">
                  FAQs
                </Link>
              </li>
            </ul>
          </MobileAccordion>

          {/* Column 3: Legal */}
          <MobileAccordion title="Legal">
            <ul className="space-y-2 text-white/80 pb-4 md:pb-0">
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-white transition">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/accessibility"
                  className="hover:text-white transition"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </MobileAccordion>

          {/* Column 4: Contact */}
          <MobileAccordion title="Contact Us">
            <div className="pb-4 md:pb-0">
              <ul className="space-y-3 text-white/80">
                <li className="flex items-start">
                  <MapPin size={20} className="mr-2 mt-1 flex-shrink-0" />
                  <span>
                    49B Thuja Ville, NNPC ESTATE,
                    <br />
                    Utako, Abuja, Nigeria
                  </span>
                </li>
                <li className="flex items-center">
                  <Phone size={20} className="mr-2 flex-shrink-0" />
                  <span>+234 (906) 635-5861</span>
                </li>
                <li className="flex items-center">
                  <Mail size={20} className="mr-2 flex-shrink-0" />
                  <Link href="mailto:info@myevent.com.ng">
                    info@myevent.com.ng
                  </Link>
                </li>
              </ul>
            </div>
          </MobileAccordion>
        </div>

        {/* Separator */}
        <div className="h-px bg-white/20 my-8" />

        {/* Copyright and bottom links */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-white/70">
          <p>© {currentYear} Myevent.com.ng. All rights reserved.</p>

          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="/sitemap" className="hover:text-white transition">
              Sitemap
            </Link>
            <Link href="/help" className="hover:text-white transition">
              Help Center
            </Link>
            <Link href="/careers" className="hover:text-white transition">
              Careers
            </Link>
          </div>
        </div>
      </div>

      {/* Wave pattern at bottom */}
      {/* <div
        className="relative h-12 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600"
        style={{
          maskImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 1200 120' xmlns='http://www.w3.org/2000/svg'><path d='M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z' fill='%23FFFFFF'></path></svg>\")",
          maskSize: 'cover',
          maskRepeat: 'no-repeat',
        }}
      /> */}
    </footer>
  );
};

export default Footer;
