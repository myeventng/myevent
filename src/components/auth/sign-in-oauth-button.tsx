'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';

interface SignInOauthButtonProps {
  provider: 'google' | 'facebook';
  signUp?: boolean;
}

export const SignInOauthButton = ({
  provider,
  signUp,
}: SignInOauthButtonProps) => {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    await signIn.social({
      provider,
      callbackURL: '/events',
      errorCallbackURL: '/auth/login/error',
    });
    setIsPending(false);
  }

  const action = signUp ? 'Up' : 'In';

  // Set provider-specific colors
  const getBrandColors = () => {
    switch (provider) {
      case 'facebook':
        return 'hover:bg-blue-800 border-blue-700 bg-blue-700';
      case 'google':
        return 'hover:bg-white hover:text-gray-800 border-gray-300 bg-white text-gray-800';
      default:
        return 'hover:bg-gray-700 border-gray-700 bg-gray-800';
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className={`w-full gap-2 ${
        provider === 'google' ? 'text-gray-800' : 'text-white'
      } ${getBrandColors()} ${
        isPending ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      variant="outline"
    >
      {provider === 'google' ? (
        <GoogleIcon className="h-5 w-5" />
      ) : (
        <FacebookIcon className="h-5 w-5" />
      )}
      Sign {action} with {provider === 'google' ? 'Google' : 'Facebook'}
    </Button>
  );
};

// Custom Google icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// Facebook icon
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      fill="currentColor"
    >
      <path d="M25.638 48H2.65A2.65 2.65 0 0 1 0 45.35V2.65A2.649 2.649 0 0 1 2.65 0h42.7A2.649 2.649 0 0 1 48 2.65v42.7A2.65 2.65 0 0 1 45.35 48H33.119V29.412h6.24l.934-7.244h-7.174v-4.625c0-2.098.583-3.527 3.59-3.527l3.836-.002V7.535c-.663-.088-2.94-.285-5.59-.285-5.53 0-9.317 3.376-9.317 9.575v5.343h-6.255v7.244h6.255V48Z" />
    </svg>
  );
}
