// app/admin/dashboard/reviews/page.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
import { ReviewsTable } from '@/components/review/reviews-table';
import {
  getAdminReviews,
  getReviewsStats,
} from '@/actions/admin-review-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewsAnalytics } from '@/components/review/review-analytics';

export default async function AdminReviewsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  // Fetch initial reviews data
  const [reviewsResponse, statsResponse] = await Promise.all([
    getAdminReviews({ page: 1, limit: 10 }),
    getReviewsStats(),
  ]);

  const reviews = reviewsResponse.success ? reviewsResponse.data : null;
  const stats =
    statsResponse.success && statsResponse.data !== undefined
      ? statsResponse.data
      : null;

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reviews Management</h1>
            <p className="text-muted-foreground">
              Monitor and manage event reviews and ratings across the platform.
            </p>
          </div>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard">Reviews Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ReviewsTable
              initialData={reviews}
              initialStats={stats}
              userCanModerate={
                isUserSuperAdmin || session.user.subRole === 'STAFF'
              }
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <ReviewsAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
