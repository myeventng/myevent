'use client';
import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AuthSession } from '@/lib/auth-utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  session: AuthSession;
}

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        user={session.user}
        isOpen={sidebarOpen}
        collapsed={collapsed}
        onCollapseToggle={() => setCollapsed(!collapsed)}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          user={session.user}
          onMobileToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
