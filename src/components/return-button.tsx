// components/auth/return-button.tsx
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface ReturnButtonProps {
  href: string;
  label: string;
}

export const ReturnButton = ({ href, label }: ReturnButtonProps) => {
  return (
    <Link
      href={href}
      className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
};
