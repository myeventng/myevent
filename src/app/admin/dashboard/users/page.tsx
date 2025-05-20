// app/admin/dashboard/users/page.tsx - Admin User Management
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { isSuperAdmin } from '@/lib/client-auth-utils';
import { getServerSideAuth } from '@/lib/auth-utils';
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

// Example user data
const users = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    role: 'USER',
    subRole: 'ORDINARY',
    image: null,
    createdAt: '2024-12-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'USER',
    subRole: 'ORGANIZER',
    image: null,
    createdAt: '2025-01-05',
    status: 'active',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    role: 'ADMIN',
    subRole: 'STAFF',
    image: null,
    createdAt: '2025-01-10',
    status: 'active',
  },
  {
    id: '4',
    name: 'Lisa Williams',
    email: 'lisa.williams@example.com',
    role: 'USER',
    subRole: 'ORGANIZER',
    image: null,
    createdAt: '2025-02-20',
    status: 'active',
  },
  {
    id: '5',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    role: 'USER',
    subRole: 'ORDINARY',
    image: null,
    createdAt: '2025-03-15',
    status: 'banned',
    banReason: 'Violation of terms',
  },
  {
    id: '6',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    role: 'ADMIN',
    subRole: 'SUPER_ADMIN',
    image: null,
    createdAt: '2024-11-05',
    status: 'active',
  },
];

export default async function AdminUsersPage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  const isUserSuperAdmin = isSuperAdmin(session.user);

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage and monitor user accounts
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button>
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
                <Input placeholder="Search users..." className="pl-8" />
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue="all-roles">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-roles">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="user">Regular User</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="all-status">
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
                  {users.map((user) => {
                    const initials = user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();
                    const isAdmin = user.role === 'ADMIN';
                    const isSuperAdmin = user.subRole === 'SUPER_ADMIN';
                    const isOrganizer = user.subRole === 'ORGANIZER';
                    const isBanned = user.status === 'banned';

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
                          {user.createdAt}
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
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>View Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit User</span>
                              </DropdownMenuItem>

                              {/* Conditionally show options based on user permissions */}
                              {isUserSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />

                                  {isAdmin && !isSuperAdmin && (
                                    <DropdownMenuItem>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      <span>Manage Permissions</span>
                                    </DropdownMenuItem>
                                  )}

                                  {!isAdmin && !isOrganizer && (
                                    <DropdownMenuItem>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      <span>Make Organizer</span>
                                    </DropdownMenuItem>
                                  )}

                                  {!isAdmin && (
                                    <DropdownMenuItem>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      <span>Make Admin</span>
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {isBanned ? (
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>Unban User</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-red-600">
                                  <Ban className="mr-2 h-4 w-4" />
                                  <span>Ban User</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing <strong>1-{users.length}</strong> of{' '}
                <strong>{users.length}</strong> users
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
