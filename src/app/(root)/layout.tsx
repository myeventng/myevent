import Footer from '@/components/layout/footer';
import MainHeader from '@/components/layout/main-header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <MainHeader />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
