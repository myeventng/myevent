'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Vote,
  Users,
  Crown,
  Medal,
  TrendingUp,
  Zap,
  Clock,
  Star,
  Heart,
  PartyPopper,
  Gift,
  ChevronRight,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ComprehensiveVotingInterface } from '@/components/voting/comprehensive-voting-interface';
import { motion, AnimatePresence } from 'framer-motion';

interface Contestant {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  contestNumber: string;
  status: 'ACTIVE' | 'DISQUALIFIED' | 'WITHDRAWN';
  instagramUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  voteCount?: number;
  rank?: number;
  _count?: {
    votes: number;
  };
}

interface VotePackage {
  id: string;
  name: string;
  description?: string;
  voteCount: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
}

interface VotingContest {
  id: string;
  eventId: string;
  votingType: 'FREE' | 'PAID';
  votePackagesEnabled: boolean;
  allowGuestVoting: boolean;
  defaultVotePrice?: number;
  maxVotesPerUser?: number;
  allowMultipleVotes: boolean;
  votingStartDate?: string;
  votingEndDate?: string;
  showLiveResults: boolean;
  showVoterNames: boolean;
  contestants: Contestant[];
  votePackages: VotePackage[];
  _count?: {
    votes: number;
    contestants: number;
  };
}

interface VotingContestComponentProps {
  event: {
    id: string;
    title: string;
    slug: string;
  };
  votingContest: VotingContest;
  isVotingActive: boolean;
}

export function VotingContestComponent({
  event,
  votingContest,
  isVotingActive,
}: VotingContestComponentProps) {
  const [showFullInterface, setShowFullInterface] = useState(false);
  const [animatedCounts, setAnimatedCounts] = useState<{
    [key: string]: number;
  }>({});

  // Sort contestants by vote count for leaderboard
  const sortedContestants = [...votingContest.contestants]
    .filter((c) => c.status === 'ACTIVE')
    .sort(
      (a, b) =>
        (b.voteCount || b._count?.votes || 0) -
        (a.voteCount || a._count?.votes || 0)
    )
    .slice(0, 3); // Top 3 for preview

  const totalVotes = votingContest._count?.votes || 0;
  const maxVotes = Math.max(
    ...sortedContestants.map((c) => c.voteCount || c._count?.votes || 0)
  );

  // Animate vote counts
  useEffect(() => {
    const timer = setTimeout(() => {
      const newCounts: { [key: string]: number } = {};
      sortedContestants.forEach((contestant) => {
        newCounts[contestant.id] =
          contestant.voteCount || contestant._count?.votes || 0;
      });
      setAnimatedCounts(newCounts);
    }, 100);

    return () => clearTimeout(timer);
  }, [sortedContestants]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getContestantVoteCount = (contestant: Contestant) => {
    return contestant.voteCount || contestant._count?.votes || 0;
  };

  const getContestantPercentage = (contestant: Contestant) => {
    const voteCount = getContestantVoteCount(contestant);
    return totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  if (showFullInterface) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-purple-600" />
            Voting Contest
          </h2>
          <Button variant="outline" onClick={() => setShowFullInterface(false)}>
            Show Preview
          </Button>
        </div>
        <ComprehensiveVotingInterface
          event={event}
          votingContest={votingContest}
          isVotingActive={isVotingActive}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contest Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-purple-900">
                  {isVotingActive ? 'Voting is Live!' : 'Voting Contest'}
                </h2>
                <p className="text-purple-700">
                  {votingContest.contestants.length} contestants competing •
                  {totalVotes.toLocaleString()} votes cast
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isVotingActive && (
                <Badge className="bg-green-500 text-white animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              )}
              <Badge variant="outline" className="bg-white">
                {votingContest.votingType === 'FREE' ? (
                  <>
                    <Heart className="h-3 w-3 mr-1" />
                    Free Voting
                  </>
                ) : (
                  <>
                    <Gift className="h-3 w-3 mr-1" />
                    Paid Voting
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contest Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalVotes.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Vote className="h-4 w-4" />
              Total Votes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {votingContest.contestants.length}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              Contestants
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {votingContest.votingType === 'FREE'
                ? 'FREE'
                : formatPrice(votingContest.defaultVotePrice || 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              {votingContest.votingType === 'FREE' ? 'Voting' : 'Per Vote'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {isVotingActive ? 'ACTIVE' : 'ENDED'}
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              Status
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Contestants Preview */}
      {votingContest.showLiveResults && sortedContestants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Current Leaders
              </div>
              {totalVotes > 0 && (
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Live Results
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedContestants.map((contestant, index) => {
                const voteCount = getContestantVoteCount(contestant);
                const percentage = getContestantPercentage(contestant);
                const rank = index + 1;

                return (
                  <motion.div
                    key={contestant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      rank === 1
                        ? 'bg-yellow-50 border-yellow-200'
                        : rank === 2
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(rank)}
                        <div className="text-center">
                          <Badge
                            className={`text-xs ${
                              rank === 1
                                ? 'bg-yellow-500'
                                : rank === 2
                                  ? 'bg-gray-400'
                                  : 'bg-amber-500'
                            } text-white`}
                          >
                            #{rank}
                          </Badge>
                          <div className="text-lg font-bold text-primary mt-1">
                            {contestant.contestNumber}
                          </div>
                        </div>
                      </div>

                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={contestant.imageUrl}
                          alt={contestant.name}
                        />
                        <AvatarFallback>
                          {contestant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">{contestant.name}</h3>
                        {contestant.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {contestant.bio}
                          </p>
                        )}

                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <Vote className="h-3 w-3" />
                              {animatedCounts[
                                contestant.id
                              ]?.toLocaleString() ||
                                voteCount.toLocaleString()}{' '}
                              votes
                            </span>
                            <span className="text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={
                              maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0
                            }
                            className="h-2"
                          />
                        </div>
                      </div>

                      {rank === 1 && totalVotes > 0 && (
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs font-medium">LEADING</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {votingContest.contestants.length > 3 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowFullInterface(true)}
                  className="w-full"
                >
                  View All {votingContest.contestants.length} Contestants & Vote
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vote Now Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <div className="max-w-md mx-auto">
            <PartyPopper className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <h3 className="text-xl font-bold mb-2">
              {isVotingActive ? 'Cast Your Vote Now!' : 'Voting Has Ended'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isVotingActive
                ? `Support your favorite contestant in this ${votingContest.votingType.toLowerCase()} voting contest`
                : 'Thank you to everyone who participated in this voting contest'}
            </p>

            {isVotingActive && (
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  onClick={() => setShowFullInterface(true)}
                >
                  <Vote className="h-5 w-5 mr-2" />
                  {votingContest.votingType === 'FREE'
                    ? 'Vote for Free'
                    : 'Purchase Votes & Vote'}
                </Button>

                {votingContest.allowGuestVoting && (
                  <p className="text-xs text-muted-foreground">
                    No account required • Vote as guest
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Contest Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contest Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Voting Type:</span>
              <Badge variant="outline">
                {votingContest.votingType === 'FREE' ? 'Free' : 'Paid'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Multiple Votes:</span>
              <span>
                {votingContest.allowMultipleVotes ? 'Allowed' : 'Not Allowed'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Guest Voting:</span>
              <span>
                {votingContest.allowGuestVoting ? 'Allowed' : 'Login Required'}
              </span>
            </div>
            {votingContest.maxVotesPerUser && (
              <div className="flex justify-between text-sm">
                <span>Max Votes per User:</span>
                <span>{votingContest.maxVotesPerUser}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {votingContest.votingType === 'PAID' &&
          votingContest.votePackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vote Packages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {votingContest.votePackages
                  .filter((pkg) => pkg.isActive)
                  .slice(0, 3)
                  .map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{pkg.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{pkg.voteCount} votes</Badge>
                        <span className="font-medium">
                          {formatPrice(pkg.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                {votingContest.votePackages.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{votingContest.votePackages.length - 3} more packages
                  </p>
                )}
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}
