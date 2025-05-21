'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { AuthUser } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Ban,
  CheckCircle,
  Edit,
  Eye,
  MoreHorizontal,
  Search,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { UserRole, UserSubRole } from '@/generated/prisma';
import { BanUserDialog } from '@/components/admin/ban-user-dialog';
import { UnbanUserDialog } from '@/components/admin/unban-user-dialog';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { UserRoleDialog } from '@/components/admin/user-role-dialog';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subRole: UserSubRole;
  image?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: string;
}

interface UsersPageProps {
  initialUsers: User[];
  session: {
    user: AuthUser;
  };
}

export default function UsersPage({ initialUsers, session }: UsersPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all-roles');
  const [statusFilter, setStatusFilter] = useState('all-status');

  // States for user actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [banUserOpen, setBanUserOpen] = useState(false);
  const [unbanUserOpen, setUnbanUserOpen] = useState(false);
  const [userRoleOpen, setUserRoleOpen] = useState(false);

  const isUserSuperAdmin = isSuperAdmin(session.user);
  const isUserStaff = session.user.subRole === 'STAFF';

  // Apply filters when filter states change
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all-roles') {
      if (roleFilter === 'admin') {
        result = result.filter((user) => user.role === 'ADMIN');
      } else if (roleFilter === 'staff') {
        result = result.filter((user) => user.subRole === 'STAFF');
      } else if (roleFilter === 'organizer') {
        result = result.filter((user) => user.subRole === 'ORGANIZER');
      } else if (roleFilter === 'user') {
        result = result.filter(
          (user) => user.role === 'USER' && user.subRole === 'ORDINARY'
        );
      }
    }

    // Apply status filter
    if (statusFilter !== 'all-status') {
      result = result.filter((user) =>
        statusFilter === 'banned' ? user.banned : !user.banned
      );
    }

    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = (newUser: User) => {
    setUsers((prevUsers) => [...prevUsers, newUser]);
  };

  // Workaround to show correct initials
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor user accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Total of {users.length} users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Select
                defaultValue="all-roles"
                value={roleFilter}
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-roles">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="user">Regular User</SelectItem>
                </SelectContent>
              </Select>

              <Select
                defaultValue="all-status"
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Created
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = getUserInitials(user.name);
                    const isAdmin = user.role === 'ADMIN';
                    const isSuperAdmin = user.subRole === 'SUPER_ADMIN';
                    const isOrganizer = user.subRole === 'ORGANIZER';
                    const isBanned = user.banned;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.image || ''}
                                alt={user.name}
                              />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge
                              variant={isAdmin ? 'destructive' : 'default'}
                              className="w-fit"
                            >
                              {user.role}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {user.subRole}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isBanned ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  // View profile functionality
                                  router.push(
                                    `/admin/dashboard/users/${user.id}`
                                  );
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Profile</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setUserRoleOpen(true);
                                }}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                <span>Manage Roles</span>
                              </DropdownMenuItem>

                              {/* Super Admin Only Actions */}
                              {isUserSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />

                                  {/* Ban/Unban only for Super Admins */}
                                  {isBanned ? (
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setUnbanUserOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      <span>Unban User</span>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setBanUserOpen(true);
                                      }}
                                      disabled={
                                        isSuperAdmin ||
                                        session.user.id === user.id
                                      }
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      <span>Ban User</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing <strong>1-{filteredUsers.length}</strong> of{' '}
              <strong>{users.length}</strong> users
            </div>
            {/* Pagination would go here */}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedUser && (
        <>
          <BanUserDialog
            isOpen={banUserOpen}
            onClose={() => {
              setBanUserOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />

          <UnbanUserDialog
            isOpen={unbanUserOpen}
            onClose={() => {
              setUnbanUserOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />

          <UserRoleDialog
            isOpen={userRoleOpen}
            onClose={() => {
              setUserRoleOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            currentUser={session.user}
          />
        </>
      )}

      <CreateUserDialog
        isOpen={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        currentUser={session.user}
      />
    </div>
  );
}
