'use client';
import { useSession } from 'next-auth/react';

const Settings = () => {
  const session = useSession();
  return (
    <div>
      {JSON.stringify(session)}
      <form>
        <button type="submit">Sign Out</button>
      </form>
    </div>
  );
};

export default Settings;
