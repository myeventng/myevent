import Link from 'next/link';
import { FaInstagram, FaFacebook, FaTwitter } from 'react-icons/fa';

const Socials = ({ className }: { className: string }) => {
  interface Social {
    icon: React.ReactNode;
    link: string;
    label: string;
  }

  const socials: Social[] = [
    {
      icon: <FaInstagram />,
      link: 'https://www.instagram.com/myeventtng/',
      label: 'LinkedIn',
    },
    { icon: <FaFacebook />, link: '/', label: 'Facebook' },
    { icon: <FaTwitter />, link: '/', label: 'Twitter' },
  ];
  return (
    <div className="flex items-center justify-center gap-[20px]">
      {socials.map((social, index) => (
        <Link
          key={index}
          href={social.link}
          aria-label={social.label}
          className={className}
        >
          {social.icon}
        </Link>
      ))}
    </div>
  );
};

export default Socials;
