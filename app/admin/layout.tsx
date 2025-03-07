import Navbar from '@/components/section/AdminNavbar';
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import { AppSidebar, SidebarProvider } from '@/components/shared/AppSidebar';
export const metadata = {
  title: 'Admin Dashboard',
  description: 'Manage events and users.',
};

const AdminLayout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex-1 bg-gray-200">
          <div className="h-screen w-full overflow-y-auto overflow-hidden">
            <div className="sticky top-0">
              <Navbar />
            </div>
            <main className="p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  );
};

export default AdminLayout;
