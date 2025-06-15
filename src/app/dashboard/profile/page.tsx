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
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UpdateUserForm } from '@/components/auth/update-user-form';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { OrganizerProfileForm } from '@/components/auth/organizer-profile-form';
// import { TwoFactorAuthForm } from '@/components/auth/two-factor-auth-form';
import { ApplyOrganizerForm } from '@/components/auth/apply-organizer-form';
// import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
// import { AlertCircle, Shield, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
// import { get2FAStatusAction } from '@/actions/two-factor-auth-actions';

export default async function UserProfilePage() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });

  if (!session) {
    console.log('No session found, redirecting to unauthorized');
    redirect('/unauthorized'); // Redirect to unauthorized page if no session
  }

  const isUserOrganizer =
    session.user.role === 'USER' && session.user.subRole === 'ORGANIZER';
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Fetch organizer profile if user is an organizer
  let organizerProfile = null;
  if (isUserOrganizer) {
    organizerProfile = await prisma.organizerProfile.findUnique({
      where: { userId: session.user.id },
    });
  }

  // Fetch the 2FA status (you could implement this in getServerSideProps)
  // const has2FAStatusResponse = await get2FAStatusAction();
  // const has2FAEnabled = has2FAStatusResponse.success
  //   ? has2FAStatusResponse.data.isEnabled
  //   : false;

  return (
    <DashboardLayout session={session}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <Badge>{isUserOrganizer ? 'ORGANIZER' : 'USER'}</Badge>
        </div>

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
                    {session.user.subRole}
                  </Badge>
                  {isUserOrganizer && (
                    <Badge variant="secondary" className="text-xs">
                      Organizer
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="account">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            {isUserOrganizer && (
              <TabsTrigger value="organizer">Organizer Profile</TabsTrigger>
            )}
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

            {!isUserOrganizer && (
              <Card>
                <CardHeader>
                  <CardTitle>Become an Organizer</CardTitle>
                  <CardDescription>
                    Apply to host and manage your own events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    As an organizer, you can create and manage events, sell
                    tickets, and build your brand. Our team will review your
                    application and get back to you soon.
                  </p>
                </CardContent>
                <CardFooter>
                  <ApplyOrganizerForm />
                </CardFooter>
              </Card>
            )}
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
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline">View Full History</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {isUserOrganizer && (
            <TabsContent value="organizer" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Organizer Profile</CardTitle>
                  <CardDescription>
                    Manage your public organizer profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizerProfileForm
                    profile={
                      organizerProfile
                        ? {
                            ...organizerProfile,
                            website: organizerProfile.website ?? undefined,
                            bio: organizerProfile.bio ?? undefined,
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
