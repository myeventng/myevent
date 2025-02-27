import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <div className="flex h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
