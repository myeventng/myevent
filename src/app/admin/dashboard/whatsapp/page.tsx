import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { WhatsappSettingsForm } from '@/components/admin/whatsapp-settings-form';
import { getServerSideAuth } from '@/lib/auth-server';
import { getWhatsappSettings } from '@/actions/whatsapp-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default async function WhatsappSettingsPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'],
    subRoles: ['STAFF', 'SUPER_ADMIN'],
  });
  if (!session) redirect('/unauthorized');

  const result = await getWhatsappSettings();

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp chat</h1>
          <p className="text-muted-foreground">
            The green chat button shown at the bottom right of the public site. Visitors who tap it
            open a WhatsApp chat with this number.
          </p>
        </div>

        {!result.success ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : (
          <WhatsappSettingsForm initial={result.data!} />
        )}
      </div>
    </DashboardLayout>
  );
}
