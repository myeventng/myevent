'use client';
import { AuthUser } from '@/lib/auth-utils';
import { isAdmin, isOrganizer } from '@/lib/client-auth-utils';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  LayoutDashboard,
  MapPin,
  Plus,
  Settings,
  Ticket,
  UserCog,
  Users,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface SidebarProps {
  user: AuthUser;
  isOpen?: boolean;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onMobileClose?: () => void;
}

export function Sidebar({
  user,
  isOpen = false,
  collapsed = false,
  onCollapseToggle,
  onMobileClose,
}: SidebarProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Add this to close sidebar on outside click or ESC (optional)
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose?.();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onMobileClose]);

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  const pathname = usePathname();

  const isAdminDashboard = pathname.startsWith('/admin');
  const baseUrl = isAdminDashboard ? '/admin/dashboard' : '/dashboard';

  const adminNavItems = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      title: 'Users',
      href: '/admin/dashboard/users',
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: 'Events',
      href: '/admin/dashboard/events',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      title: 'Venues',
      href: '/admin/dashboard/venues',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      title: 'Reports',
      href: '/admin/dashboard/reports',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      title: 'Settings',
      href: '/admin/dashboard/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const userNavItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      title: 'My Tickets',
      href: '/dashboard/tickets',
      icon: <Ticket className="w-5 h-5" />,
    },
    {
      title: 'Profile',
      href: '/dashboard/profile',
      icon: <UserCog className="w-5 h-5" />,
    },
  ];

  const organizerNavItems = [
    {
      title: 'My Events',
      href: '/dashboard/events',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      title: 'My Venues',
      href: '/dashboard/my-venues',
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      title: 'Create Event',
      href: '/dashboard/create-event',
      icon: <Plus className="w-5 h-5" />,
    },
    {
      title: 'Analytics',
      href: '/dashboard/analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ];

  const userIsOrganizer = isOrganizer(user);
  const userIsAdmin = isAdmin(user);
  const navItems = isAdminDashboard
    ? adminNavItems
    : [...userNavItems, ...(userIsOrganizer ? organizerNavItems : [])];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden',
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          'z-40 h-screen bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out',
          sidebarWidth,
          'flex flex-col fixed md:static top-0 left-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-primary">
            {collapsed ? 'E' : 'EventHub'}
          </Link>

          {/* Mobile Close */}
          <button onClick={onMobileClose} className="md:hidden">
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          <button onClick={onCollapseToggle} className="hidden md:block">
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                  collapsed ? 'justify-center px-2' : ''
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
