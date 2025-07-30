'use client';

import { AuthUser } from '@/lib/auth-client';
import { isOrganizer } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  LayoutDashboard,
  MapPin,
  Plus,
  Settings,
  Ticket,
  UserCog,
  Users,
  Building2,
  Menu,
  Blocks,
  Eye,
  Edit,
  List,
  Tags,
  Star,
  ScanQrCode,
  Bell, // Added Bell icon
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SidebarProps {
  user: AuthUser;
  isOpen?: boolean;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  onMobileClose?: () => void;
}

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

export function Sidebar({
  user,
  isOpen = false,
  collapsed = false,
  onCollapseToggle,
  onMobileClose,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const pathname = usePathname();
  const isAdminDashboard = pathname.startsWith('/admin');

  // Close sidebar on ESC key
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose?.();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onMobileClose]);

  // Auto-expand sections based on current path
  useEffect(() => {
    const pathSegments = pathname.split('/');
    const newExpanded: string[] = [];

    if (isAdminDashboard) {
      if (pathname.includes('/events')) newExpanded.push('admin-events');
      if (pathname.includes('/venues')) newExpanded.push('admin-venues');
      if (pathname.includes('/tickets')) newExpanded.push('admin-tickets');
      if (pathname.includes('/users')) newExpanded.push('admin-users');
      if (pathname.includes('/notifications'))
        newExpanded.push('admin-notifications');
    } else {
      if (pathname.includes('/events') || pathname.includes('/create-event')) {
        newExpanded.push('organizer-events');
      }
      if (pathname.includes('/venues') || pathname.includes('/my-venues')) {
        newExpanded.push('organizer-venues');
      }
      if (pathname.includes('/tickets')) newExpanded.push('user-tickets');
      if (pathname.includes('/notifications'))
        newExpanded.push('user-notifications');
    }

    setExpandedSections(newExpanded);
  }, [pathname, isAdminDashboard]);

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  const toggleSection = (sectionId: string) => {
    if (collapsed) return; // Don't allow toggle when collapsed

    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const adminNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      title: 'Notifications',
      href: '/admin/dashboard/notifications',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      title: 'Reviews',
      href: '/admin/dashboard/reviews',
      icon: <Star className="w-5 h-5" />,
    },
    {
      title: 'Users',
      icon: <Users className="w-5 h-5" />,
      children: [
        {
          title: 'All Users',
          href: '/admin/dashboard/users',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Organizers',
          href: '/admin/dashboard/users/organizers',
          icon: <UserCog className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Events',
      icon: <Calendar className="w-5 h-5" />,
      children: [
        {
          title: 'All Events',
          href: '/admin/dashboard/events',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Pending Review',
          href: '/admin/dashboard/events/pending',
          icon: <Eye className="w-4 h-4" />,
        },
        {
          title: 'Featured Events',
          href: '/admin/dashboard/events/featured',
          icon: <Star className="w-4 h-4" />,
        },
        {
          title: 'Categories',
          href: '/admin/dashboard/categories',
          icon: <Blocks className="w-4 h-4" />,
        },
        {
          title: 'Tags',
          href: '/admin/dashboard/tags',
          icon: <Tags className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Venues',
      icon: <MapPin className="w-5 h-5" />,
      children: [
        {
          title: 'All Venues',
          href: '/admin/dashboard/venues',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Cities',
          href: '/admin/dashboard/cities',
          icon: <Building2 className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Scanner',
      href: '/admin/dashboard/scanner',
      icon: <ScanQrCode className="w-5 h-5" />,
    },
    {
      title: 'Tickets',
      icon: <Ticket className="w-5 h-5" />,
      children: [
        {
          title: 'All Tickets',
          href: '/admin/dashboard/tickets',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Refunds',
          href: '/admin/dashboard/tickets/refunds',
          icon: <Edit className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Blog',
      icon: <Edit className="w-5 h-5" />,
      children: [
        {
          title: 'All Posts',
          href: '/admin/dashboard/blogs',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Create Post',
          href: '/admin/dashboard/blogs/create',
          icon: <Plus className="w-4 h-4" />,
        },
        {
          title: 'Categories',
          href: '/admin/dashboard/blog-categories',
          icon: <Blocks className="w-4 h-4" />,
        },
      ],
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

  const userNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      title: 'Create Event',
      href: '/dashboard/create-event',
      icon: <Plus className="w-4 h-4" />,
    },
    {
      title: 'Notifications',
      href: '/dashboard/notifications',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      title: 'My Events',
      href: '/dashboard/events',
      icon: <List className="w-4 h-4" />,
    },
    {
      title: 'My Tickets',
      icon: <Ticket className="w-5 h-5" />,
      children: [
        {
          title: 'All Tickets',
          href: '/dashboard/tickets',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Upcoming',
          href: '/dashboard/tickets/upcoming',
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          title: 'Past Events',
          href: '/dashboard/tickets/past',
          icon: <Eye className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Profile',
      href: '/dashboard/profile',
      icon: <UserCog className="w-5 h-5" />,
    },
  ];

  const organizerNavItems: NavItem[] = [
    {
      title: 'Events',
      icon: <Calendar className="w-5 h-5" />,
      children: [
        {
          title: 'My Events',
          href: '/dashboard/events',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Create Event',
          href: '/dashboard/create-event',
          icon: <Plus className="w-4 h-4" />,
        },
        {
          title: 'Drafts',
          href: '/dashboard/events/drafts',
          icon: <Edit className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Scanner',
      href: '/dashboard/scanner',
      icon: <ScanQrCode className="w-5 h-5" />,
    },
    {
      title: 'Venues',
      icon: <MapPin className="w-5 h-5" />,
      children: [
        {
          title: 'My Venues',
          href: '/dashboard/my-venues',
          icon: <List className="w-4 h-4" />,
        },
        {
          title: 'Create Venue',
          href: '/dashboard/venues/create',
          icon: <Plus className="w-4 h-4" />,
        },
      ],
    },
  ];

  const userIsOrganizer = isOrganizer(user);
  const isAdmin = user.role === 'ADMIN';

  // FIXED: Admin users should NOT see organizer items
  const navItems = isAdminDashboard
    ? adminNavItems
    : [
        ...userNavItems,
        ...(userIsOrganizer && !isAdmin ? organizerNavItems : []),
      ];

  const getSectionId = (item: NavItem) => {
    if (isAdminDashboard) {
      if (item.title === 'Events') return 'admin-events';
      if (item.title === 'Venues') return 'admin-venues';
      if (item.title === 'Tickets') return 'admin-tickets';
      if (item.title === 'Users') return 'admin-users';
      if (item.title === 'Notifications') return 'admin-notifications';
    } else {
      if (item.title === 'Events') return 'organizer-events';
      if (item.title === 'Venues') return 'organizer-venues';
      if (item.title === 'My Tickets') return 'user-tickets';
      if (item.title === 'Notifications') return 'user-notifications';
    }
    return item.title.toLowerCase().replace(/\s+/g, '-');
  };

  // Updated function to only highlight exact matches
  const isPathActive = (href: string) => {
    return pathname === href;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const sectionId = getSectionId(item);
    const isExpanded = expandedSections.includes(sectionId);
    const isActive = item.href ? isPathActive(item.href) : false;
    const hasActiveChild =
      hasChildren &&
      item.children!.some((child) =>
        child.href ? isPathActive(child.href) : false
      );

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleSection(sectionId)}
            className={cn(
              'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
              hasActiveChild || isActive
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100',
              collapsed ? 'justify-center px-2' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {!collapsed && <span>{item.title}</span>}
            </div>
            {!collapsed && (
              <div className="ml-auto">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            )}
          </button>

          {!collapsed && isExpanded && (
            <div className="ml-6 space-y-1">
              {item.children!.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Regular nav item (leaf node)
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-white'
            : 'text-gray-700 hover:bg-gray-100',
          collapsed ? 'justify-center px-2' : '',
          depth > 0 ? 'text-xs' : ''
        )}
      >
        {item.icon}
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );
  };

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
            {collapsed ? 'ME' : 'MyEvent.com.ng'}
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
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {/* User info at bottom */}
        {!collapsed && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                {/* Show user role for debugging */}
                <p className="text-xs text-blue-500">
                  {user.role} - {user.subRole}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
