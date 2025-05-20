import { getServerSideAuth } from '@/lib/auth-utils';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Award,
  Calendar,
  ChartBarIcon,
  Landmark,
  LucideCheckCircle,
  MapPin,
  Megaphone,
  Ticket,
  Users,
} from 'lucide-react';

export default async function BecomeOrganizerPage() {
  const session = await getServerSideAuth();

  return (
    <DashboardLayout session={session}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-full">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Become an Organizer</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Create, manage, and promote your own events on MyEvent.com.ng.
            Unlock powerful tools to grow your audience and track your success.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature Cards */}
          <FeatureCard
            icon={<Calendar className="w-5 h-5" />}
            title="Create Events"
            description="Design and publish your own events with our easy-to-use tools."
          />
          <FeatureCard
            icon={<Ticket className="w-5 h-5" />}
            title="Sell Tickets"
            description="Set up ticketing with custom options and pricing tiers."
          />
          <FeatureCard
            icon={<Users className="w-5 h-5" />}
            title="Grow Audience"
            description="Build a following and engage with your attendees."
          />
          <FeatureCard
            icon={<MapPin className="w-5 h-5" />}
            title="Manage Venues"
            description="Add and manage venues for your events."
          />
          <FeatureCard
            icon={<ChartBarIcon className="w-5 h-5" />}
            title="Analytics"
            description="Track sales, attendance, and engagement metrics."
          />
          <FeatureCard
            icon={<Megaphone className="w-5 h-5" />}
            title="Promotion"
            description="Promote your events with built-in marketing tools."
          />
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mt-12">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <ol className="space-y-4">
            <li className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Submit your application</p>
                <p className="text-gray-400 text-sm mt-1">
                  Tell us about your event experience and what types of events
                  you plan to host.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Application review</p>
                <p className="text-gray-400 text-sm mt-1">
                  Our team will review your application, typically within 1-2
                  business days.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Set up your organizer profile</p>
                <p className="text-gray-400 text-sm mt-1">
                  Complete your organizer profile with your organization
                  details, logo, and bio.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-sm font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Start creating events</p>
                <p className="text-gray-400 text-sm mt-1">
                  Begin creating and publishing your events to the
                  MyEvent.com.ng community.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 pt-6">
          <Button className="w-full max-w-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            Apply to Become an Organizer
          </Button>
          <Button asChild variant="link" className="text-gray-400">
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 flex flex-col">
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-gray-400 text-sm mt-2">{description}</p>
    </div>
  );
}
