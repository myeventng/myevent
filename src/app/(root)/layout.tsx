import Footer from '@/components/layout/footer';
import MainHeader from '@/components/layout/main-header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="me-theme flex min-h-screen flex-col">
      <MainHeader />
      <main className="flex-1 pt-[72px]">{children}</main>
      <Footer />
    </div>
  );
}
