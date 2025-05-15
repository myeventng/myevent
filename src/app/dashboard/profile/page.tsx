import { DashboardLayout } from '@/components/dashboard-layout';
import { getServerSideAuth } from '@/lib/auth-utils';
import { isOrganizer } from '@/lib/client-auth-utils';
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
import { UpdateUserForm } from '@/components/update-user-form';
import { ChangePasswordForm } from '@/components/change-password-form';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Shield, User } from 'lucide-react';

export default async function UserProfilePage() {
  const session = await getServerSideAuth({
    roles: ['USER'], // Allow only USER role
  });

  const isUserOrganizer = isOrganizer(session.user);
  const initials = session.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

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
                  <Button>Apply to be an Organizer</Button>
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

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Two-factor authentication adds an additional layer of security
                  to your account by requiring more than just a password to sign
                  in.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline">Enable 2FA</Button>
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Organization Name
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Your organization name"
                          defaultValue="EventMaster Productions"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Website
                        </label>
                        <input
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="https://example.com"
                          defaultValue="https://eventmaster.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Bio
                      </label>
                      <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Tell attendees about your organization"
                        defaultValue="EventMaster Productions specializes in tech conferences and networking events for industry professionals. Our events feature top speakers and cutting-edge topics."
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Changes</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Event Branding</CardTitle>
                  <CardDescription>
                    Customize how your events appear to attendees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">
                        Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-md border border-dashed border-gray-300 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                        <Button variant="outline" size="sm">
                          Upload Logo
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">
                        Brand Colors
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          className="h-10 w-10 rounded cursor-pointer"
                          defaultValue="#3b82f6"
                        />
                        <span className="text-sm text-muted-foreground">
                          Primary Color
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Save Branding</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
