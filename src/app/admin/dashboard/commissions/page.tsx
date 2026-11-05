import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommissionRulesManager } from '@/components/admin/commission/commission-rules-manager';

export const metadata = { title: 'Commission management' };

export default async function CommissionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== 'ADMIN') redirect('/auth/login');

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Commission management</h1>
          <p className="text-sm text-muted-foreground">
            Precedence: <strong>event rule</strong> → <strong>organizer rule</strong> → <strong>default commission</strong> (set under Settings → Commission).
            Rules apply to new orders only.
          </p>
        </div>
        <Tabs defaultValue="organizer">
          <TabsList>
            <TabsTrigger value="organizer">Organizer rules</TabsTrigger>
            <TabsTrigger value="event">Event rules</TabsTrigger>
          </TabsList>
          <TabsContent value="organizer"><CommissionRulesManager scope="ORGANIZER" /></TabsContent>
          <TabsContent value="event"><CommissionRulesManager scope="EVENT" /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
