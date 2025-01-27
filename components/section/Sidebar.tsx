'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RiMenuUnfoldLine } from 'react-icons/ri';
import { RiMenuFoldLine } from 'react-icons/ri';

import { Home, List, Users } from 'lucide-react';
import Link from 'next/link';
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={cn(
        'h-screen bg-gray-800 text-white',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex justify-between items-center p-4">
        <span className="font-bold text-xl mr-4">
          {isOpen ? 'MyEvent' : 'ME'}
        </span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white"
        >
          {isOpen ? <RiMenuFoldLine /> : <RiMenuUnfoldLine />}
        </button>
      </div>
      <nav className="flex flex-col gap-4 mt-8">
        <Link
          href="/admin"
          className="flex items-center gap-4 p-4 hover:bg-gray-700"
        >
          <Home size={24} /> {isOpen && 'Dashboard'}
        </Link>
        <Link
          href="/admin/list"
          className="flex items-center gap-4 p-4 hover:bg-gray-700"
        >
          <List size={24} /> {isOpen && 'List'}
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-4 p-4 hover:bg-gray-700"
        >
          <Users size={24} /> {isOpen && 'Users'}
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
