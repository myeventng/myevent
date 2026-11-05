'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { acceptStaffInviteAction } from '@/actions/staff.actions';

export function AcceptInviteCard({ token, email }: { token: string; email: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(null);

  const accept = () =>
    start(async () => {
      setError(null);
      const res = await acceptStaffInviteAction(token);
      if (res.success) {
        setJoined(res.data.organizerName);
        toast.success(res.message ?? 'Joined');
      } else {
        setError(res.message);
      }
    });

  if (joined) {
    return (
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
          <CardTitle>You're on the team</CardTitle>
          <CardDescription>You can now work on {joined}'s events with the access they gave you.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team invitation</CardTitle>
        <CardDescription>Signed in as <strong>{email}</strong>. Accepting gives you access to the events the organizer chose. It does not change your own account type.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={accept} disabled={pending} className="w-full">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept invitation
        </Button>
      </CardContent>
    </Card>
  );
}
