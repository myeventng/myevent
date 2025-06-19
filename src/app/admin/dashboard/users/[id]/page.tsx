'use client';

import { useState, useEffect } from 'react';
import { getUserById, getUserActivity } from '@/actions/user.actions';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

import UserHeader from '@/components/user/user-header';
import UserStats from '@/components/user/user-stats';
import UserTabs from '@/components/user/user-tabs';
import UserActionDialogs from '@/components/user/user-action-dialogs';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  role: string;
  subRole: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  organizerProfile?: {
    organizationName: string;
    organizationType?: string;
    bio?: string;
    website?: string;
    businessRegistrationNumber?: string;
    taxIdentificationNumber?: string;
  };
  stats: {
    totalEvents: number;
    activeEvents: number;
    totalTicketsSold: number;
    totalRevenue: number;
    totalVenues: number;
    averageRating: number;
    totalReviews: number;
    totalTicketsPurchased: number;
    totalOrders: number;
  };
  eventsHosted: any[];
  tickets: any[];
  Notification: any[];
}

interface AdminUserViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AdminUserViewPage({ params }: AdminUserViewPageProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  // Check authentication and authorization
  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      router.push('/unauthorized');
      return;
    }

    // Check if user has required permissions (ADMIN role with STAFF or SUPER_ADMIN subRole)
    const hasPermission =
      session.user.role === 'ADMIN' &&
      (session.user.subRole === 'STAFF' ||
        session.user.subRole === 'SUPER_ADMIN');

    if (!hasPermission) {
      router.push('/unauthorized');
      return;
    }

    setAuthLoading(false);
  }, [session, sessionLoading, router]);

  // Extract id from params
  useEffect(() => {
    const resolveParams = async () => {
      const { id } = await params;
      setUserId(id);
    };
    resolveParams();
  }, [params]);

  // Fetch user data
  useEffect(() => {
    if (!userId || authLoading) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await getUserById(userId);

        if (response.success && response.data) {
          setUser(response.data);

          // Fetch user activity
          const activityResponse = await getUserActivity(userId);
          if (activityResponse.success && activityResponse.data) {
            setActivity(activityResponse.data);
          }
        } else {
          setError(response.error || 'Failed to fetch user');
        }
      } catch (err) {
        setError('An error occurred while fetching user data');
        console.error('Error fetching user:', err);
        toast.error('Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, authLoading]);

  const refreshUser = async () => {
    if (!userId) return;
    try {
      const response = await getUserById(userId);
      if (response.success && response.data) {
        setUser(response.data);
        toast.success('User data refreshed');
      }
    } catch (err) {
      toast.error('Failed to refresh user data');
    }
  };

  // Show loading while checking authentication or session is loading
  // if (sessionLoading || authLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="flex items-center space-x-2">
  //         <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
  //         <span className="text-gray-600">Authenticating...</span>
  //       </div>
  //     </div>
  //   );
  // }

  // If no session after loading, this will be handled by the useEffect redirect
  if (!session) {
    return null;
  }

  // Show loading while fetching user data
  if (loading) {
    return (
      <DashboardLayout session={session}>
        <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading user data...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (error || !user) {
    return (
      <DashboardLayout session={session}>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Main content
  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
            <p className="text-gray-600">
              View and manage user information, events, and activity
            </p>
          </div>
          <Button onClick={refreshUser} variant="outline">
            Refresh Data
          </Button>
        </div>

        {/* User Components */}
        <UserHeader user={user} onRefresh={refreshUser} />
        <UserStats stats={user.stats} />
        <UserTabs user={user} activity={activity} />
        <UserActionDialogs user={user} onRefresh={refreshUser} />
      </div>
    </DashboardLayout>
  );
}
