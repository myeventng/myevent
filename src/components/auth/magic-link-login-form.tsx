'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailIcon, SparklesIcon } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import { toast } from 'sonner';

export const MagicLinkLoginForm = () => {
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    const email = emailRef.current?.value;

    if (!email) {
      return toast.error('Please enter your email.');
    }

    await signIn.magicLink({
      email,
      name: email.split('@')[0],
      callbackURL: '/auth-redirect',
      fetchOptions: {
        onRequest: () => {
          setIsPending(true);
        },
        onResponse: () => {
          setIsPending(false);
        },
        onError: (ctx) => {
          toast.error(ctx.error.message);
        },
        onSuccess: () => {
          toast.success('Check your email for the magic link!');
          setIsOpen(false);
        },
      },
    });
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
      >
        <SparklesIcon className="h-4 w-4" />
        {isOpen ? 'Hide Magic Link Option' : 'Use Magic Link Instead'}
      </Button>

      {isOpen && (
        <div className="mt-4 p-4 rounded-md border border-purple-700 bg-gray-800/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email" className="text-gray-300">
                Email for Magic Link
              </Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  ref={emailRef}
                  type="email"
                  id="magic-email"
                  placeholder="you@example.com"
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isPending ? 'Sending...' : 'Send Magic Link'}
            </Button>

            <p className="text-xs text-gray-400">
              We&apos;ll send a secure login link to your email. No password
              needed!
            </p>
          </form>
        </div>
      )}
    </div>
  );
};
