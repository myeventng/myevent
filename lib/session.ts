// Import from the correct location - use your auth helper
import { auth } from '@/auth';

// Gets the user from the session on the server
export async function getCurrentUser() {
  const session = await auth();

  // Return null if no session exists
  if (!session?.user?.email) {
    return null;
  }

  // Return user data from session
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

// Client-side version for components
export async function getSession() {
  return await auth();
}
