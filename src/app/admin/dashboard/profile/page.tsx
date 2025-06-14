import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-server';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UpdateUserForm } from '@/components/auth/update-user-form';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { isSuperAdmin } from '@/lib/auth-utils';
// import { TwoFactorAuthForm } from '@/components/auth/two-factor-auth-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
// import { get2FAStatusAction } from '@/actions/two-factor-auth-actions';

export default async function AdminProfilePage() {
  const session = await getServerSideAuth({
    roles: ['ADMIN'], // Allow only ADMIN role
    subRoles: ['STAFF', 'SUPER_ADMIN'], // Allow only STAFF and SUPER_ADMIN subroles
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    return redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  const isUserSuperAdmin = isSuperAdmin(session.user);
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Fetch the 2FA status from the server
  // const has2FAStatusResponse = await get2FAStatusAction();
  // const has2FAEnabled = has2FAStatusResponse.success
  //   ? has2FAStatusResponse.data.isEnabled
  //   : false;

  // For admin accounts, 2FA should be required, so we'll show a warning if not enabled

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Profile</h1>
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
        </div>

        {isUserSuperAdmin && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Super Admin Account</AlertTitle>
            <AlertDescription>
              You have the highest level of access. Use your permissions
              responsibly.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={session.user.image || ''}
                  alt={session.user.name}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{session.user.name}</CardTitle>
                <CardDescription>{session.user.email}</CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {session.user.role}
                  </Badge>
                  <Badge
                    variant={isUserSuperAdmin ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {session.user.subRole}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Admin Access</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Update Account Information</CardTitle>
                <CardDescription>
                  Update your personal details and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UpdateUserForm
                  name={session.user.name}
                  image={session.user.image ?? ''}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Permissions</CardTitle>
                <CardDescription>
                  Your current admin permissions and access level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-gray-50 border border-gray-200">
                    <h3 className="font-medium mb-2">
                      Access Level: {session.user.subRole}
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-green-600">
                        <Shield className="h-4 w-4" />
                        <span>User Management</span>
                      </li>
                      <li className="flex items-center gap-2 text-green-600">
                        <Shield className="h-4 w-4" />
                        <span>Event Approval</span>
                      </li>
                      <li className="flex items-center gap-2 text-green-600">
                        <Shield className="h-4 w-4" />
                        <span>Content Moderation</span>
                      </li>
                      {isUserSuperAdmin && (
                        <>
                          <li className="flex items-center gap-2 text-red-600">
                            <Shield className="h-4 w-4" />
                            <span>System Configuration</span>
                          </li>
                          <li className="flex items-center gap-2 text-red-600">
                            <Shield className="h-4 w-4" />
                            <span>Admin Management</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>Last login: May 14, 2025 at 09:32 AM</p>
                    <p>Admin since: January 15, 2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TwoFactorAuthForm
                  isEnabled={has2FAEnabled}
                  user={{
                    id: session.user.id,
                    email: session.user.email,
                  }}
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Two-factor authentication is <strong>required</strong> for
                  admin accounts to protect sensitive platform operations.
                </p>
              </CardContent>
            </Card> */}

            <Card>
              <CardHeader>
                <CardTitle>Login History</CardTitle>
                <CardDescription>
                  Recent login activity for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Today, 09:32 AM</p>
                        <p className="text-sm text-muted-foreground">
                          Chrome on Windows
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-800">
                        Current
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Yesterday, 18:45 PM</p>
                        <p className="text-sm text-muted-foreground">
                          Safari on iPhone
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">May 12, 2025, 14:20 PM</p>
                        <p className="text-sm text-muted-foreground">
                          Firefox on MacOS
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">View Full History</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
