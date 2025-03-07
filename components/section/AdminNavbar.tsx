import { UserBtn } from '../shared/UserBtn';

const AdminNavbar = () => {
  return (
    <header className="w-full bg-gray-300 p-4 flex justify-end border-b border-gray-500/30 h-[10vh] z-50">
      <div className="flex items-center gap-4">
        <span>Welcome, Admin</span>
        <UserBtn />
      </div>
    </header>
  );
};

export default AdminNavbar;
