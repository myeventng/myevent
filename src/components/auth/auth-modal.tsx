//src/components/auth/auth-modal.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Lock, Mail, User, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { signIn, useSession } from '@/lib/auth-client';
import { signInEmailAction } from '@/actions/sign-in-email.action';
import { signUpEmailAction } from '@/actions/sign-up-email.action';
import { SignInOauthButton } from '@/components/auth/sign-in-oauth-button';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultTab?: 'login' | 'register';
  eventTitle?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  defaultTab = 'login',
  eventTitle,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleLoginSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setIsPending(true);

    const formData = new FormData(evt.currentTarget);

    try {
      const { error } = await signInEmailAction(formData);

      if (error) {
        toast.error(error);
      } else {
        toast.success('Login successful! Welcome back.');

        // Close modal first
        onOpenChange(false);

        // Wait a bit for the auth state to settle, then call success
        setTimeout(() => {
          onSuccess?.();
        }, 500);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  const handleRegisterSubmit = async (
    evt: React.FormEvent<HTMLFormElement>
  ) => {
    evt.preventDefault();
    setIsPending(true);

    const formData = new FormData(evt.currentTarget);

    try {
      const { error } = await signUpEmailAction(formData);

      if (error) {
        toast.error(error);
      } else {
        toast.success("Registration complete. You're all set.");

        // Close modal first
        onOpenChange(false);

        // Wait a bit for the auth state to settle, then call success
        setTimeout(() => {
          onSuccess?.();
        }, 500);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  const handleMagicLinkSubmit = async (
    evt: React.FormEvent<HTMLFormElement>
  ) => {
    evt.preventDefault();
    setIsPending(true);

    const formData = new FormData(evt.currentTarget);
    const email = String(formData.get('magicEmail'));

    if (!email) {
      toast.error('Please enter your email.');
      setIsPending(false);
      return;
    }

    try {
      await signIn.magicLink({
        email,
        name: email.split('@')[0],
        callbackURL: '/events',
        fetchOptions: {
          onError: (ctx) => {
            toast.error(ctx.error.message);
          },
          onSuccess: () => {
            toast.success('Check your email for the magic link!');
            setShowMagicLink(false);
            onOpenChange(false);
          },
        },
      });
    } catch (error) {
      toast.error('Failed to send magic link');
    } finally {
      setIsPending(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === 'login' || value === 'register') {
      setActiveTab(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader className="relative">
          <DialogTitle className="text-center text-white">
            {eventTitle
              ? `Join to book "${eventTitle}"`
              : 'Sign in to continue'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 p-0 h-6 w-6 text-gray-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {eventTitle && (
            <div className="text-center text-sm text-purple-300 bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
              <p>Sign in or create an account to purchase tickets</p>
            </div>
          )}

          {/* Social Sign In Buttons */}
          <div className="space-y-2">
            <SignInOauthButton provider="google" />
            <SignInOauthButton provider="facebook" />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                      required
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                      required
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                      disabled={isPending}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  disabled={isPending}
                >
                  {isPending ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMagicLink(!showMagicLink)}
                  className="text-purple-400 hover:text-purple-300"
                  disabled={isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {showMagicLink ? 'Hide Magic Link' : 'Use Magic Link Instead'}
                </Button>
              </div>

              {showMagicLink && (
                <div className="mt-4 p-4 rounded-md border border-purple-700 bg-gray-800/50">
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magicEmail" className="text-gray-300">
                        Email for Magic Link
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                          id="magicEmail"
                          name="magicEmail"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                          required
                          disabled={isPending}
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    >
                      {isPending ? 'Sending...' : 'Send Magic Link'}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      We&quot;ll send a secure login link to your email. No
                      password needed!
                    </p>
                  </form>
                </div>
              )}
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="eg Chioma Ade"
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                      required
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerEmail" className="text-gray-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="registerEmail"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                      required
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerPassword" className="text-gray-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="registerPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-purple-500 focus:border-purple-500"
                      required
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400"
                      disabled={isPending}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  disabled={isPending}
                >
                  {isPending ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center">
                By creating an account, you agree to our{' '}
                <a
                  href="/terms"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Privacy Policy
                </a>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
