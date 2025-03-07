'use client';
import React, { useState, createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { LuPartyPopper } from 'react-icons/lu';
import {
  Package,
  Home,
  User2,
  ChevronDown,
  ChevronUp,
  Menu,
  LogOut,
  Users,
  MapPin,
  Building2,
} from 'lucide-react';
import { BiCategory } from 'react-icons/bi';
import { Role } from '@prisma/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useCurrentRole } from '@/hooks/use-current-role';

// Create context for sidebar state
const SidebarContext = createContext({
  isOpen: true,
  toggle: () => {},
});

export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className="flex">{children}</div>
    </SidebarContext.Provider>
  );
};

const MenuItem = ({
  item,
}: {
  item: {
    title: string;
    icon: any;
    submenu?: { title: string; url: string }[];
  };
}) => {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
        className="flex items-center w-full px-4 py-2 text-white hover:bg-primary
         rounded-lg transition-colors"
      >
        <item.icon className="w-5 h-5 mr-3" />
        <span className="flex-1 text-left">{item.title}</span>
        {item.submenu && (
          <span className="ml-auto">
            {isSubmenuOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        )}
      </button>

      {item.submenu && isSubmenuOpen && (
        <div className="ml-6 mt-2 space-y-1">
          {item.submenu.map((subItem) => (
            <Link
              key={subItem.title}
              href={subItem.url}
              className="block px-4 py-2 text-sm text-white hover:bg-primary
               rounded-lg transition-colors"
            >
              {subItem.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const AppSidebar = () => {
  const user = useCurrentUser();
  const role = useCurrentRole();
  const { isOpen, toggle } = useContext(SidebarContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const username = user?.name || 'User';
  const userRole = role || Role.USER;

  const isAdmin = userRole === Role.ADMIN;
  const isOrganizer = userRole === Role.ORGANIZER || userRole === Role.ADMIN;

  const items = [
    {
      title: 'Events',
      icon: LuPartyPopper,
      submenu: [
        { title: 'List', url: '/admin/events' },
        { title: 'Create', url: '/admin/events/add' },
      ],
    },
    {
      title: 'Categories',
      icon: BiCategory,
      submenu: [
        { title: 'List', url: '/admin/categories' },
        { title: 'Create', url: '/admin/categories/add' },
      ],
    },
    ...(isOrganizer
      ? [
          {
            title: 'Venues',
            icon: Building2,
            submenu: [
              { title: 'List', url: '/admin/venues' },
              { title: 'Add New', url: '/admin/venues/add' },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Users',
            icon: Users,
            submenu: [
              { title: 'List', url: '/admin/users' },
              { title: 'Edit', url: '/admin/users/add' },
            ],
          },
          {
            title: 'Cities',
            icon: MapPin,
            submenu: [
              { title: 'List', url: '/admin/cities' },
              { title: 'Add New', url: '/admin/cities/add' },
            ],
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2  bg-[#0f172a] border border-gray-200 rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 h-screen
          w-64 bg-[#0f172a] border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">MYEVENT</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link
            href="/admin"
            className="flex items-center px-4 py-2 text-white hover:bg-primary rounded-lg transition-colors"
          >
            <Home size={24} className="mr-3" />
            <span className="flex-1 text-left">Dashboard</span>
          </Link>
          {items.map((item) => (
            <MenuItem key={item.title} item={item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center w-full px-4 py-2 text-white hover:bg-primary rounded-lg transition-colors"
            >
              <User2 className="w-5 h-5 mr-3" />
              <span className="flex-1 text-left">{username}</span>
              {isProfileOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {isProfileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg- border border-gray-200 rounded-lg shadow-lg bg-[#0f172a]">
                <Link
                  href="/admin/settings"
                  className="flex items-center px-4 py-2 text-sm text-white hover:bg-primary
                  "
                >
                  <Users className="w-4 h-4 mr-2" />
                  Profile Settings
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center w-full px-4 py-2 text-left text-sm text-white hover:bg-primary
                  "
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
