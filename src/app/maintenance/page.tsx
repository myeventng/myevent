import { Suspense } from 'react';
import MaintenancePage from '@/components/admin/maintenance-page';

function MaintenancePageContent() {
  return <MaintenancePage />;
}

function MaintenancePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full mb-4">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-white text-xl">Loading...</p>
      </div>
    </div>
  );
}

export default function Maintenance() {
  return (
    <Suspense fallback={<MaintenancePageLoading />}>
      <MaintenancePageContent />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
