'use client';

import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';

export default function AuthDebugPage() {
  const { data: session, isPending, error } = useSession();
  const [cookies, setCookies] = useState('');
  const [localStorage, setLocalStorage] = useState('');
  const [sessionStorage, setSessionStorage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCookies(document.cookie);
      setLocalStorage(JSON.stringify(window.localStorage, null, 2));
      setSessionStorage(JSON.stringify(window.sessionStorage, null, 2));
    }
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleClearStorage = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
      document.cookie.split(';').forEach((c) => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie =
          name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Auth Debug Page</h1>

      <div className="space-y-6">
        {/* Session State */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Session State</h2>
          <div className="space-y-2">
            <div>
              <strong>isPending:</strong> {isPending.toString()}
            </div>
            <div>
              <strong>Error:</strong>{' '}
              {error ? JSON.stringify(error, null, 2) : 'None'}
            </div>
            <div>
              <strong>Session exists:</strong> {session ? 'Yes' : 'No'}
            </div>
            {session && (
              <div className="mt-4">
                <h3 className="font-semibold">Session Data:</h3>
                <pre className="bg-white p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        {session?.user && (
          <div className="bg-blue-100 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">User Info</h2>
            <div className="space-y-1">
              <div>
                <strong>ID:</strong> {session.user.id}
              </div>
              <div>
                <strong>Name:</strong> {session.user.name}
              </div>
              <div>
                <strong>Email:</strong> {session.user.email}
              </div>
              <div>
                <strong>Role:</strong> {session.user.role}
              </div>
              <div>
                <strong>SubRole:</strong> {session.user.subRole}
              </div>
              <div>
                <strong>Image:</strong> {session.user.image || 'None'}
              </div>
            </div>
          </div>
        )}

        {/* Storage Info */}
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Browser Storage</h2>

          <div className="mb-4">
            <h3 className="font-semibold">Cookies:</h3>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {cookies || 'No cookies found'}
            </pre>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">LocalStorage:</h3>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {localStorage || 'Empty'}
            </pre>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">SessionStorage:</h3>
            <pre className="bg-white p-2 rounded text-sm overflow-auto">
              {sessionStorage || 'Empty'}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-green-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Debug Actions</h2>
          <div className="space-x-4">
            <button
              onClick={handleRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
            <button
              onClick={handleClearStorage}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear All Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
