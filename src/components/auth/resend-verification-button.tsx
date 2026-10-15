'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendVerificationEmail } from '@/lib/auth-client';

const COOLDOWN_SECONDS = 60;

export const ResendVerificationButton = ({ email }: { email: string }) => {
  const [isPending, setIsPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);

  // The verification email was just sent at sign-up, so start on cooldown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleResend() {
    await sendVerificationEmail({
      email,
      callbackURL: '/auth/verify',
      fetchOptions: {
        onRequest: () => setIsPending(true),
        onResponse: () => setIsPending(false),
        onError: (ctx) => toast.error(ctx.error.message),
        onSuccess: () => {
          toast.success('Verification email sent again.');
          setSecondsLeft(COOLDOWN_SECONDS);
        },
      },
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleResend}
      disabled={isPending || secondsLeft > 0}
      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
    >
      <RefreshCwIcon className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending
        ? 'Sending...'
        : secondsLeft > 0
          ? `Resend email in ${secondsLeft}s`
          : 'Resend verification email'}
    </Button>
  );
};
