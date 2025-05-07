// app/admin/dashboard/page.tsx
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Overview } from '@/components/section/dashboard/Overview';
import { RecentOrders } from '@/components/section/dashboard/RecentOrders';
import { TopEvents } from '@/components/section/dashboard/TopEvent';
import { CalendarView } from '@/components/section/dashboard/CalenderView';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, Ticket, Calendar, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DatePickerWithRange } from '@/components/section/dashboard/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

export default function DashboardPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦45,231.89</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p>
                <Progress className="mt-2" value={75} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Events
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">124</div>
                <p className="text-xs text-muted-foreground">
                  +12 from last month
                </p>
                <Progress className="mt-2" value={62} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ticket Sales
                </CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,350</div>
                <p className="text-xs text-muted-foreground">
                  +18.7% from last week
                </p>
                <Progress className="mt-2" value={83} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">573</div>
                <p className="text-xs text-muted-foreground">
                  +9.3% from last month
                </p>
                <Progress className="mt-2" value={53} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>
                  Revenue and ticket sales for the past 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>
                  Most popular events by ticket sales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopEvents />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest ticket purchases across all events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentOrders />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>
                  Events scheduled in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarView />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <EventsOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersOverview />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventsOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events Overview</CardTitle>
        <CardDescription>
          Distribution of events by category and status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-green-500 mr-2">Live</Badge>
                    <span>Live Events</span>
                  </div>
                  <span className="font-bold">87</span>
                </div>
                <Progress value={87} className="h-2 bg-green-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-amber-500 mr-2">Draft</Badge>
                    <span>Draft Events</span>
                  </div>
                  <span className="font-bold">24</span>
                </div>
                <Progress value={24} className="h-2 bg-amber-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-blue-500 mr-2">Review</Badge>
                    <span>Under Review</span>
                  </div>
                  <span className="font-bold">13</span>
                </div>
                <Progress value={13} className="h-2 bg-blue-100" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Music</span>
                  <span className="font-bold">43</span>
                </div>
                <Progress value={43} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Business</span>
                  <span className="font-bold">31</span>
                </div>
                <Progress value={31} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Food & Drink</span>
                  <span className="font-bold">27</span>
                </div>
                <Progress value={27} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Arts</span>
                  <span className="font-bold">19</span>
                </div>
                <Progress value={19} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By City</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>New York</span>
                  <span className="font-bold">38</span>
                </div>
                <Progress value={38} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Los Angeles</span>
                  <span className="font-bold">29</span>
                </div>
                <Progress value={29} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Chicago</span>
                  <span className="font-bold">21</span>
                </div>
                <Progress value={21} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Miami</span>
                  <span className="font-bold">18</span>
                </div>
                <Progress value={18} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users Overview</CardTitle>
        <CardDescription>User statistics and distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-slate-500 mr-2">User</Badge>
                    <span>Regular Users</span>
                  </div>
                  <span className="font-bold">482</span>
                </div>
                <Progress value={82} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-purple-500 mr-2">Organizer</Badge>
                    <span>Event Organizers</span>
                  </div>
                  <span className="font-bold">87</span>
                </div>
                <Progress value={17} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-red-500 mr-2">Admin</Badge>
                    <span>Administrators</span>
                  </div>
                  <span className="font-bold">4</span>
                </div>
                <Progress value={1} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">+124</div>
                  <div className="text-xs text-muted-foreground">
                    New users this month
                  </div>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500 text-sm">+12.4%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-green-500 mr-2">Verified</Badge>
                    <span>Verified Users</span>
                  </div>
                  <span className="font-bold">412</span>
                </div>
                <Progress value={71} className="h-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Badge className="bg-slate-300 mr-2">Pending</Badge>
                    <span>Unverified Users</span>
                  </div>
                  <span className="font-bold">161</span>
                </div>
                <Progress value={29} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function SalesOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Revenue and sales statistics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦45,231.89</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦78.45</div>
              <p className="text-xs text-muted-foreground">
                +5.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Music</span>
                  <span>₦21,439</span>
                </div>
                <Progress value={48} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Business</span>
                  <span>₦12,651</span>
                </div>
                <Progress value={28} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>Other</span>
                  <span>₦11,142</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Sales by Age
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>18-24</span>
                  <span>21%</span>
                </div>
                <Progress value={21} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>25-34</span>
                  <span>43%</span>
                </div>
                <Progress value={43} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>35-44</span>
                  <span>27%</span>
                </div>
                <Progress value={27} className="h-2" />

                <div className="flex items-center justify-between">
                  <span>45+</span>
                  <span>9%</span>
                </div>
                <Progress value={9} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
