import Image from 'next/image';
import Link from 'next/link';
import BtnSlideEffect from '../shared/BtnSlideEffect';
import Socials from '../shared/Socials';

const Footer = () => {
  interface FooterLink {
    name: string;
    link: string;
  }

  const links: FooterLink[] = [
    { name: 'About Us', link: '/' },
    { name: 'How it works', link: '/' },
    { name: 'FAQs', link: '/' },
    { name: 'Contact', link: '/' },
    { name: 'Privacy & Policy', link: '/' },
    { name: 'Terms and Conditions', link: '/' },
  ];

  const currentYear = new Date().getFullYear();
  return (
    <footer className=" bg-secondary-500 text-white py-16">
      <div className="wrapper flex md:flex-row items-center justify-between flex-col gap-4 p-5 text-center sm:flex-row">
        <div className="flex items-center justify-center gap-4">
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.link}
              className="text-white p-medium-16 no-underline hover:text-primary-500 transition-all duration-300"
            >
              {link.name}
            </Link>
          ))}
        </div>
        <BtnSlideEffect text="Create Event" path="/events/create" />
      </div>
      <div className="border-t-2 border-t-pink-500 flex-center wrapper flex-between flex flex-col gap-4  text-center sm:flex-row">
        <div className="flex gap-2">
          <Link href="/">
            <Image
              src="/assets/images/logo.png"
              alt="logo"
              width={128 * 1.3}
              height={38 * 1.3}
            />
          </Link>
          <Socials className="text-white text-2xl transition-transform duration-300 hover:scale-110 hover:text-primary-500" />
        </div>

        <p className="text-base">
          ©{currentYear} MyEvents. All Rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
