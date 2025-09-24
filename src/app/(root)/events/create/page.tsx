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
  Trophy,
  Vote,
  Crown,
  Medal,
  DollarSign,
  Gift,
  PartyPopper,
  Flame,
  BarChart3,
  CreditCard,
  Coins,
  Users2,
  Lightbulb,
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
                  From intimate gatherings to massive festivals and exciting
                  voting contests, we provide all the tools you need to bring
                  your vision to life.
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

        {/* Event Type Showcase */}
        <div className="bg-black/20 backdrop-blur-sm border-y border-white/10">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Create Any Type of Event
              </h2>
              <p className="text-gray-300">
                From traditional events to modern voting contests
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EventTypeCard
                icon={<Calendar className="w-8 h-8" />}
                title="Standard Events"
                description="Concerts, workshops, conferences, and traditional gatherings"
                gradient="from-blue-500 to-indigo-600"
                badge="Popular"
              />
              <EventTypeCard
                icon={<Trophy className="w-8 h-8" />}
                title="Voting Contests"
                description="Beauty pageants, talent shows, competitions with audience voting"
                gradient="from-purple-500 to-pink-600"
                badge="Hot"
                highlight
              />
              <EventTypeCard
                icon={<Users2 className="w-8 h-8" />}
                title="Invite-Only Events"
                description="Private gatherings, exclusive meetups, VIP experiences"
                gradient="from-green-500 to-teal-600"
                badge="Premium"
              />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-black/30 backdrop-blur-sm border-y border-white/10">
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
                <div className="text-3xl font-bold text-white">500K+</div>
                <div className="text-gray-400">Votes Cast</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">4.9★</div>
                <div className="text-gray-400">Host Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Contest Features Section */}
        <div className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <div className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 p-3 rounded-full mb-6">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Revolutionary Voting Contest Platform
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                Create engaging competitions where your audience decides the
                winner. Perfect for beauty pageants, talent shows, and community
                contests.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <VotingFeatureCard
                icon={<Vote className="w-6 h-6" />}
                title="Flexible Voting System"
                description="Support both free and paid voting with customizable rules and limits."
                gradient="from-blue-500 to-purple-600"
              />
              <VotingFeatureCard
                icon={<CreditCard className="w-6 h-6" />}
                title="Monetize Your Contest"
                description="Create vote packages, set pricing, and generate revenue from voting."
                gradient="from-green-500 to-blue-600"
              />
              <VotingFeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Live Results & Analytics"
                description="Real-time vote tracking, leaderboards, and detailed analytics."
                gradient="from-purple-500 to-pink-600"
              />
              <VotingFeatureCard
                icon={<Crown className="w-6 h-6" />}
                title="Contestant Management"
                description="Easy contestant registration, profiles, and social media integration."
                gradient="from-yellow-500 to-orange-600"
              />
              <VotingFeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Guest Voting Support"
                description="Allow voting without registration to maximize participation."
                gradient="from-pink-500 to-red-600"
              />
              <VotingFeatureCard
                icon={<Gift className="w-6 h-6" />}
                title="Vote Packages"
                description="Create different voting packages with bulk discounts and special offers."
                gradient="from-indigo-500 to-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Standard Features Section */}
        <div className="bg-black/20 backdrop-blur-sm py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                Professional tools designed to help you create, promote, and
                manage successful events of any type
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

        {/* How It Works Section - Enhanced for Voting Contests */}
        <div id="how-it-works" className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Launch Your Voting Contest in Minutes
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                Our streamlined process gets you from idea to live voting
                contest quickly
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <StepCard
                step="1"
                icon={<UserPlus className="w-6 h-6" />}
                title="Create Account"
                description="Sign up and complete your host profile with verification for contest hosting."
                time="2 minutes"
              />
              <StepCard
                step="2"
                icon={<Trophy className="w-6 h-6" />}
                title="Setup Contest"
                description="Choose voting contest type, add contestants, and configure voting rules."
                time="15 minutes"
              />
              <StepCard
                step="3"
                icon={<Coins className="w-6 h-6" />}
                title="Configure Voting"
                description="Set up free/paid voting, create vote packages, and pricing options."
                time="10 minutes"
              />
              <StepCard
                step="4"
                icon={<Flame className="w-6 h-6" />}
                title="Go Live"
                description="Launch your contest, promote it, and watch the votes pour in!"
                time="Instant"
              />
            </div>
          </div>
        </div>

        {/* Success Stories Section - Updated for Voting Contests */}
        <div className="bg-black/20 backdrop-blur-sm py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Join Successful Event Hosts
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                See how creators are building thriving businesses with our
                platform
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <TestimonialCard
                name="Queen Beauty Pageant"
                role="Beauty Contest Organizer"
                image="/api/placeholder/64/64"
                quote="Our annual beauty pageant generated ₦2.5M in voting revenue alone! The platform made it so easy to manage contestants and votes."
                metric="₦2.5M revenue"
                type="voting"
              />
              <TestimonialCard
                name="David Chen"
                role="Conference Organizer"
                image="/api/placeholder/64/64"
                quote="The analytics and marketing tools are incredible. Our annual tech conference grew by 200% this year."
                metric="200% growth"
                type="standard"
              />
              <TestimonialCard
                name="Lagos Talent Show"
                role="Entertainment Producer"
                image="/api/placeholder/64/64"
                quote="From 5,000 to 50,000 votes in our talent competition. The voting contest features are game-changing!"
                metric="50K+ votes"
                type="voting"
              />
            </div>
          </div>
        </div>

        {/* Voting Contest Revenue Highlight */}
        <div className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center bg-white/20 px-4 py-2 rounded-full mb-4">
                    <DollarSign className="w-5 h-5 text-white mr-2" />
                    <span className="text-white font-semibold">
                      Revenue Opportunity
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Monetize Your Voting Contests
                  </h3>
                  <p className="text-green-100 text-lg mb-6">
                    Create multiple revenue streams with paid voting, vote
                    packages, and ticket sales. Some hosts generate 6-figure
                    revenues from a single contest.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-green-100">
                      <PartyPopper className="w-4 h-4 mr-2" />
                      Vote packages from ₦100 to ₦50,000
                    </div>
                    <div className="flex items-center text-green-100">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Average contest generates ₦500K+ in votes
                    </div>
                    <div className="flex items-center text-green-100">
                      <Crown className="w-4 h-4 mr-2" />
                      Keep 85% of voting revenue (15% platform fee)
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div className="text-4xl font-bold text-white mb-2">
                      ₦500K+
                    </div>
                    <div className="text-green-200 mb-4">
                      Average Contest Revenue
                    </div>
                    <div className="text-6xl font-bold text-white mb-2">
                      85%
                    </div>
                    <div className="text-green-200">You Keep</div>
                  </div>
                </div>
              </div>
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
                your event business today with voting contests and more.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                {session?.user ? (
                  <Button
                    asChild
                    size="lg"
                    className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
                  >
                    <Link href="/dashboard/events/create">
                      <Trophy className="w-5 h-5 mr-2" />
                      Create Voting Contest
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

  return <PageContent />;
}

function EventTypeCard({
  icon,
  title,
  description,
  gradient,
  badge,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  badge: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group relative ${
        highlight ? 'ring-2 ring-purple-400' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}
          >
            {icon}
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              highlight ? 'bg-purple-500 text-white' : 'bg-white/20 text-white'
            }`}
          >
            {badge}
          </div>
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

function VotingFeatureCard({
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
  type = 'standard',
}: {
  name: string;
  role: string;
  image: string;
  quote: string;
  metric: string;
  type?: 'standard' | 'voting';
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
            <div className="text-gray-400 text-sm flex items-center gap-1">
              {type === 'voting' && <Trophy className="w-3 h-3" />}
              {role}
            </div>
          </div>
        </div>
        <blockquote className="text-gray-300 mb-4">
          &quot;{quote}&quot;
        </blockquote>
        <div
          className={`flex items-center font-semibold ${
            type === 'voting' ? 'text-purple-400' : 'text-blue-400'
          }`}
        >
          {type === 'voting' ? (
            <Vote className="w-4 h-4 mr-1" />
          ) : (
            <TrendingUp className="w-4 h-4 mr-1" />
          )}
          {metric}
        </div>
      </CardContent>
    </Card>
  );
}
