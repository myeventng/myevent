'use client';

import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export const SignOutButton = ({ className }: { className?: string }) => {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setIsPending(true);

    try {
      await signOut({
        fetchOptions: {
          onError: (ctx) => {
            toast.error(ctx.error.message);
            setIsPending(false);
          },
          onSuccess: () => {
            // Clear all storage
            if (typeof window !== 'undefined') {
              localStorage.clear();
              sessionStorage.clear();

              // Clear all cookies by setting them to expire
              document.cookie.split(';').forEach((c) => {
                const eqPos = c.indexOf('=');
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                document.cookie =
                  name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
                document.cookie =
                  name +
                  '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' +
                  window.location.hostname;
              });
            }

            toast.success("You've logged out. See you soon!");
            setIsPending(false);
            router.push('/auth/login');
            // Force a hard refresh to ensure all state is cleared
            window.location.reload();
          },
        },
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please try again.');
      setIsPending(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="destructive"
      disabled={isPending}
      className={twMerge('', className)}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
};
