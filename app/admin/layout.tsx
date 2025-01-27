import Sidebar from '@/components/section/Sidebar';
import Navbar from '@/components/section/Navbar';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Manage events and users.',
};

const AdminLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-6 bg-gray-200 h-full">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
