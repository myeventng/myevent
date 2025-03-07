const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex-center min-h-screen w-full bg-gradient-to-tr from-pink-400 via-red-400 to-blue-300">
      {children}
    </div>
  );
};

export default Layout;
