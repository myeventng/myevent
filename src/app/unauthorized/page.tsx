import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-red-500/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white">Access Denied</h1>

        <p className="text-gray-400">
          You don&apos;t have permission to access this page. This area is
          restricted to users with the required role.
        </p>

        <div className="space-y-4 pt-6">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
