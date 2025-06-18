import { getServerSideAuth } from '@/lib/auth-server';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import {
  Calendar,
  ChartBar,
  MapPin,
  Megaphone,
  Ticket,
  Users,
  TrendingUp,
  Heart,
  Zap,
  Target,
  Sparkles,
  Clock,
  UserPlus,
  Award,
  Globe,
  Star,
} from 'lucide-react';
import Image from 'next/image';

export default async function BecomeEventHostPage() {
  const session = await getServerSideAuth({ skipRedirect: true });

  // If user is logged in, wrap in DashboardLayout, otherwise use standalone layout
  const PageContent = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <div className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                  Turn Your Ideas Into
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    {' '}
                    Epic Events
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-300 max-w-2xl mx-auto">
                  Join thousands of successful event creators on MyEvent.com.ng.
                  From intimate gatherings to massive festivals, we provide all
                  the tools you need to bring your vision to life.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {session?.user ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
                  >
                    <Link href="/dashboard/events/create">
                      <Award className="w-5 h-5 mr-2" />
                      Upgrade to Event Host
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
                  >
                    <Link href="/auth/register?intent=organizer">
                      <Star className="w-5 h-5 mr-2" />
                      Start Creating Events
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 bg-transparent px-8 py-3 text-lg font-semibold"
                >
                  <Link href="#how-it-works">
                    <Heart className="w-5 h-5 mr-2" />
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-black/20 backdrop-blur-sm border-y border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-gray-400">Events Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">2M+</div>
                <div className="text-gray-400">Tickets Sold</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">15K+</div>
                <div className="text-gray-400">Event Hosts</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">4.9★</div>
                <div className="text-gray-400">Host Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                Professional tools designed to help you create, promote, and
                manage successful events
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Calendar className="w-6 h-6" />}
                title="Easy Event Creation"
                description="Intuitive event builder with templates, custom branding, and rich media support."
                gradient="from-blue-500 to-purple-600"
              />
              <FeatureCard
                icon={<Ticket className="w-6 h-6" />}
                title="Smart Ticketing"
                description="Flexible pricing, early bird discounts, group rates, and instant digital delivery."
                gradient="from-purple-500 to-pink-600"
              />
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Audience Growth"
                description="Built-in marketing tools, social sharing, and audience insights to grow your reach."
                gradient="from-pink-500 to-red-600"
              />
              <FeatureCard
                icon={<ChartBar className="w-6 h-6" />}
                title="Real-time Analytics"
                description="Track sales, attendance, engagement, and revenue with detailed dashboards."
                gradient="from-green-500 to-blue-600"
              />
              <FeatureCard
                icon={<MapPin className="w-6 h-6" />}
                title="Venue Management"
                description="Manage multiple venues, seating charts, and capacity with our venue tools."
                gradient="from-yellow-500 to-orange-600"
              />
              <FeatureCard
                icon={<Megaphone className="w-6 h-6" />}
                title="Marketing Suite"
                description="Email campaigns, social media integration, and promotional codes built-in."
                gradient="from-indigo-500 to-purple-600"
              />
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div
          id="how-it-works"
          className="bg-black/20 backdrop-blur-sm py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Start Hosting in Minutes
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                Our streamlined process gets you from idea to live event quickly
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <StepCard
                step="1"
                icon={<UserPlus className="w-6 h-6" />}
                title="Sign Up"
                description="Create your account and complete your host profile with verification."
                time="2 minutes"
              />
              <StepCard
                step="2"
                icon={<Target className="w-6 h-6" />}
                title="Create Event"
                description="Use our intuitive builder to create your event with all the details."
                time="10 minutes"
              />
              <StepCard
                step="3"
                icon={<Zap className="w-6 h-6" />}
                title="Launch & Promote"
                description="Publish your event and start promoting with our marketing tools."
                time="5 minutes"
              />
              <StepCard
                step="4"
                icon={<TrendingUp className="w-6 h-6" />}
                title="Manage & Grow"
                description="Track performance, engage attendees, and grow your audience."
                time="Ongoing"
              />
            </div>
          </div>
        </div>

        {/* Success Stories Section */}
        <div className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Join Successful Event Hosts
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                See how other creators are building thriving event businesses
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <TestimonialCard
                name="Sarah Johnson"
                role="Workshop Host"
                image="/api/placeholder/64/64"
                quote="MyEvent helped me turn my weekend workshops into a full-time business. I've sold over 500 tickets in 6 months!"
                metric="500+ tickets sold"
              />
              <TestimonialCard
                name="David Chen"
                role="Conference Organizer"
                image="/api/placeholder/64/64"
                quote="The analytics and marketing tools are incredible. Our annual tech conference grew by 200% this year."
                metric="200% growth"
              />
              <TestimonialCard
                name="Maria Rodriguez"
                role="Community Builder"
                image="/api/placeholder/64/64"
                quote="From 20 people to 2000+ in our community events. The platform scales perfectly with your growth."
                metric="2000+ attendees"
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Create Amazing Events?
              </h2>
              <p className="mt-4 text-lg text-purple-100">
                Join thousands of successful event creators and start building
                your event business today.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                {session?.user ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
                  >
                    <Link href="/dashboard/events/create">
                      <Award className="w-5 h-5 mr-2" />
                      Upgrade to Event Host
                    </Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
                  >
                    <Link href="/auth/register?intent=organizer">
                      <Star className="w-5 h-5 mr-2" />
                      Get Started Free
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 bg-transparent px-8 py-3 text-lg font-semibold"
                >
                  <Link href="/events">
                    <Globe className="w-5 h-5 mr-2" />
                    Browse Events
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap in DashboardLayout if user is logged in, otherwise standalone
  //   if (session?.user && isOrdinaryUser(session.user)) {
  //     return (
  //       <DashboardLayout session={session}>
  //         <PageContent />
  //       </DashboardLayout>
  //     );
  //   }

  return <PageContent />;
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group">
      <CardHeader>
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
        <CardTitle className="text-white text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-300 text-base">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
  time,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="relative">
      <div className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm mr-3">
            {step}
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
            {icon}
          </div>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-300 text-sm mb-3">{description}</p>
        <div className="flex items-center text-purple-400 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          {time}
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({
  name,
  role,
  image,
  quote,
  metric,
}: {
  name: string;
  role: string;
  image: string;
  quote: string;
  metric: string;
}) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <Image
            src={image}
            alt={name}
            width={48}
            height={48}
            className="rounded-full mr-3"
          />
          <div>
            <div className="text-white font-semibold">{name}</div>
            <div className="text-gray-400 text-sm">{role}</div>
          </div>
        </div>
        <blockquote className="text-gray-300 mb-4">
          &quot;{quote}&quot;
        </blockquote>
        <div className="flex items-center text-purple-400 font-semibold">
          <TrendingUp className="w-4 h-4 mr-1" />
          {metric}
        </div>
      </CardContent>
    </Card>
  );
}
