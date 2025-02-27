import { UserCircle } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="w-full bg-gray-300 p-4 flex justify-end border-b border-gray-500/30 h-[10vh]">
      <div className="flex items-center gap-4">
        <span>Welcome, Admin</span>
        {/* <SignedIn>
          <UserButton />
        </SignedIn> */}
      </div>
    </header>
  );
};

export default Navbar;
