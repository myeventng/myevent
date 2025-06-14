// Shared types for both client and server
export type RoleType = 'ADMIN' | 'USER';
export type SubRoleType = 'ORDINARY' | 'ORGANIZER' | 'STAFF' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null; // Allow null to match actual data
  createdAt: Date;
  role: RoleType;
  subRole: SubRoleType;
  giraffeFact?: string; // Add this if it's in your actual data
}

export interface AuthSession {
  user: AuthUser;
  session: {
    expiresAt: Date;
    token: string;
    userAgent?: string | null;
  };
}
