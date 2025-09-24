// components/voting/comprehensive-voting-interface.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Vote,
  Heart,
  Users,
  Crown,
  TrendingUp,
  Instagram,
  Twitter,
  Facebook,
  Medal,
  Star,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  DollarSign,
  Zap,
  Info,
  ShoppingCart,
  Gift,
  PartyPopper,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthModal } from '@/components/auth/auth-modal';
import { PaidVoteInterface } from '@/components/voting/paid-vote-interface';
import { VotingContestDashboard } from '@/components/voting/voting-contest-dashboard';
import { useSession } from '@/lib/auth-client';
import { toast } from 'sonner';
import {
  castFreeVote,
  purchaseVotePackage,
  getUserVoteOrders,
  checkVotingEligibility,
} from '@/actions/voting-contest.actions';

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

interface ComprehensiveVotingInterfaceProps {
  event: {
    id: string;
    title: string;
    slug: string;
  };
  votingContest: VotingContest;
  isVotingActive: boolean;
}

export function ComprehensiveVotingInterface({
  event,
  votingContest,
  isVotingActive,
}: ComprehensiveVotingInterfaceProps) {
  const [selectedContestant, setSelectedContestant] = useState<string | null>(
    null
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [contestants, setContestants] = useState<Contestant[]>(
    votingContest.contestants
  );
  const [userVoteOrders, setUserVoteOrders] = useState<any[]>([]);
  const [totalVotesRemaining, setTotalVotesRemaining] = useState(0);
  const [votingEligibility, setVotingEligibility] = useState<any>(null);
  const [showPaidVoteModal, setShowPaidVoteModal] = useState(false);
  const [selectedContestantForVoting, setSelectedContestantForVoting] =
    useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Check for payment success from URL params
  useEffect(() => {
    const votePayment = searchParams.get('vote_payment');
    const orderId = searchParams.get('orderId');

    if (votePayment === 'success') {
      toast.success('Payment successful! Your votes are now available.');
      // Trigger refresh of vote orders
      setRefreshKey((prev) => prev + 1);
    }
  }, [searchParams]);

  // Sort contestants by vote count for ranking
  const sortedContestants = [...contestants]
    .filter((c) => c.status === 'ACTIVE')
    .sort(
      (a, b) =>
        (b.voteCount || b._count?.votes || 0) -
        (a.voteCount || a._count?.votes || 0)
    )
    .map((contestant, index) => ({ ...contestant, rank: index + 1 }));

  const totalVotes = votingContest._count?.votes || 0;
  const maxVotes = Math.max(
    ...sortedContestants.map((c) => c.voteCount || c._count?.votes || 0)
  );

  // Load user data and voting eligibility
  useEffect(() => {
    if (session?.user && votingContest.votingType === 'PAID') {
      loadUserVoteOrders();
    }
    loadVotingEligibility();
  }, [session, votingContest.id, refreshKey]);

  const loadUserVoteOrders = async () => {
    try {
      const response = await getUserVoteOrders(votingContest.id);
      if (response.success && response.data) {
        setUserVoteOrders(response.data.voteOrders || []);
        setTotalVotesRemaining(response.data.totalVotesRemaining || 0);
      }
    } catch (error) {
      console.error('Error loading user vote orders:', error);
    }
  };

  const loadVotingEligibility = async () => {
    try {
      const response = await checkVotingEligibility(votingContest.id);
      if (response.success || response.data) {
        setVotingEligibility(response.data);
      }
    } catch (error) {
      console.error('Error checking voting eligibility:', error);
    }
  };

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
        return <span className="font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const handleFreeVote = async (contestantId: string) => {
    if (!session?.user && !votingContest.allowGuestVoting) {
      setShowAuthModal(true);
      return;
    }

    if (!isVotingActive) {
      toast.error('Voting is not currently active');
      return;
    }

    startTransition(async () => {
      try {
        const result = await castFreeVote(
          contestantId,
          session?.user ? undefined : 'guest'
        );

        if (result.success) {
          toast.success(result.message || 'Vote cast successfully!', {
            icon: <PartyPopper className="h-4 w-4" />,
          });

          // Update local contestant vote count
          setContestants((prev) =>
            prev.map((c) =>
              c.id === contestantId
                ? { ...c, voteCount: (c.voteCount || c._count?.votes || 0) + 1 }
                : c
            )
          );

          // Trigger refresh
          setRefreshKey((prev) => prev + 1);
        } else {
          toast.error(result.message || 'Failed to cast vote');
        }
      } catch (error) {
        console.error('Error casting free vote:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handlePurchaseVotes = async (votePackageId: string) => {
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }

    startTransition(async () => {
      try {
        const result = await purchaseVotePackage({
          votePackageId,
          contestId: votingContest.id,
        });

        if (result.success && result.data) {
          toast.success('Redirecting to payment...');
          // Use the Paystack payment URL returned from the server action
          if (result.data.paymentUrl) {
            window.location.href = result.data.paymentUrl;
          }
        } else {
          toast.error(result.message || 'Failed to initialize payment');
        }
      } catch (error) {
        console.error('Error purchasing votes:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handleSelectForVoting = (contestantId: string) => {
    setSelectedContestantForVoting(contestantId);
    setShowPaidVoteModal(true);
  };

  const ContestantCard = ({ contestant }: { contestant: Contestant }) => {
    const voteCount = getContestantVoteCount(contestant);
    const percentage = getContestantPercentage(contestant);
    const isSelected = selectedContestant === contestant.id;

    return (
      <Card
        className={`transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
        } ${contestant.status !== 'ACTIVE' ? 'opacity-60' : ''}`}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Rank Badge */}
            <div className="flex flex-col items-center gap-2">
              <Badge
                className={`${getRankBadgeColor(contestant.rank || 0)} flex items-center gap-1`}
              >
                {getRankIcon(contestant.rank || 0)}
                {contestant.rank === 1 ? 'Leader' : `#${contestant.rank}`}
              </Badge>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {contestant.contestNumber}
                </div>
              </div>
            </div>

            {/* Contestant Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={contestant.imageUrl}
                    alt={contestant.name}
                  />
                  <AvatarFallback className="text-lg font-semibold">
                    {contestant.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{contestant.name}</h3>
                  {contestant.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {contestant.bio}
                    </p>
                  )}

                  {/* Social Links */}
                  {(contestant.instagramUrl ||
                    contestant.twitterUrl ||
                    contestant.facebookUrl) && (
                    <div className="flex gap-2 mt-2">
                      {contestant.instagramUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a
                            href={contestant.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Instagram className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {contestant.twitterUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a
                            href={contestant.twitterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Twitter className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {contestant.facebookUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a
                            href={contestant.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Facebook className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Vote Progress */}
              {votingContest.showLiveResults && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Vote className="h-4 w-4" />
                      {voteCount.toLocaleString()} votes
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0}
                    className="h-2"
                  />
                </div>
              )}

              {/* Status */}
              {contestant.status !== 'ACTIVE' && (
                <Badge variant="secondary" className="mt-2">
                  {contestant.status === 'DISQUALIFIED'
                    ? 'Disqualified'
                    : 'Withdrawn'}
                </Badge>
              )}
            </div>
          </div>

          {/* Voting Actions */}
          {isVotingActive && contestant.status === 'ACTIVE' && (
            <div className="mt-4 pt-4 border-t">
              {votingContest.votingType === 'FREE' ? (
                <Button
                  className="w-full"
                  onClick={() => handleFreeVote(contestant.id)}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Voting...
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4 mr-2" />
                      Vote for {contestant.name}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  {session?.user && totalVotesRemaining > 0 ? (
                    <Button
                      className="w-full"
                      onClick={() => handleSelectForVoting(contestant.id)}
                    >
                      <Vote className="h-4 w-4 mr-2" />
                      Use Purchased Vote
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setSelectedContestant(isSelected ? null : contestant.id)
                      }
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Selected for Voting
                        </>
                      ) : (
                        <>
                          <Vote className="h-4 w-4 mr-2" />
                          Select to Vote
                        </>
                      )}
                    </Button>
                  )}

                  {/* Show remaining votes for paid voting */}
                  {session?.user && totalVotesRemaining > 0 && (
                    <div className="text-sm text-center text-muted-foreground">
                      You have {totalVotesRemaining} votes remaining
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Contest Dashboard */}
      <VotingContestDashboard
        contestId={votingContest.id}
        showLiveResults={votingContest.showLiveResults}
      />

      {/* User Vote Status - Paid Voting */}
      {session?.user && votingContest.votingType === 'PAID' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-600" />
              Your Vote Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userVoteOrders.length > 0 ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {totalVotesRemaining}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Votes Remaining
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {userVoteOrders.reduce(
                        (sum, order) =>
                          sum + (order.voteCount - order.votesRemaining),
                        0
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Votes Used
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPrice(
                        userVoteOrders.reduce(
                          (sum, order) => sum + order.totalAmount,
                          0
                        )
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Spent
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Your Vote Packages:</h4>
                  {userVoteOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <span className="text-sm">
                        {order.votePackage?.name || `${order.voteCount} votes`}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.votesRemaining}/{order.voteCount} remaining
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  You haven't purchased any votes yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vote Packages - Paid Voting */}
      {votingContest.votingType === 'PAID' &&
        votingContest.votePackages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-green-600" />
                Vote Packages
                {selectedContestant && (
                  <Badge variant="secondary">
                    Selected:{' '}
                    {contestants.find((c) => c.id === selectedContestant)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {votingContest.votePackages
                  .filter((pkg) => pkg.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((votePackage) => {
                    const pricePerVote =
                      votePackage.price / votePackage.voteCount;
                    const isPopular = votePackage.voteCount >= 10;

                    return (
                      <Card
                        key={votePackage.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isPopular ? 'ring-2 ring-yellow-300 relative' : ''
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-yellow-500 text-yellow-900">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          </div>
                        )}
                        <CardContent className="p-4 text-center">
                          <div className="text-3xl font-bold text-primary mb-2">
                            {votePackage.voteCount}
                          </div>
                          <div className="font-semibold mb-1">
                            {votePackage.name}
                          </div>
                          {votePackage.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {votePackage.description}
                            </p>
                          )}
                          <div className="space-y-1 mb-3">
                            <div className="text-2xl font-bold text-green-600">
                              {formatPrice(votePackage.price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(pricePerVote)} per vote
                            </div>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => handlePurchaseVotes(votePackage.id)}
                            disabled={isPending}
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Purchase Votes
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {!session?.user && (
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You need to log in to purchase votes and participate in this
                    contest.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

      {/* Contestants Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Contestants</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {sortedContestants.length} Active
          </Badge>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedContestants.map((contestant) => (
            <ContestantCard key={contestant.id} contestant={contestant} />
          ))}
        </div>

        {sortedContestants.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Active Contestants
              </h3>
              <p className="text-muted-foreground">
                There are currently no active contestants in this voting
                contest.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          setShowAuthModal(false);
          toast.success(
            'Welcome! You can now participate in the voting contest.'
          );
        }}
        eventTitle={`Vote in ${event.title}`}
        defaultTab="login"
      />

      {/* Paid Vote Modal */}
      {showPaidVoteModal && selectedContestantForVoting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <PaidVoteInterface
              contestId={votingContest.id}
              contestantId={selectedContestantForVoting}
              contestantName={
                contestants.find((c) => c.id === selectedContestantForVoting)
                  ?.name || ''
              }
              onVoteSuccess={() => {
                setShowPaidVoteModal(false);
                setSelectedContestantForVoting(null);
                setRefreshKey((prev) => prev + 1);
                // Update local contestant vote count
                setContestants((prev) =>
                  prev.map((c) =>
                    c.id === selectedContestantForVoting
                      ? {
                          ...c,
                          voteCount: (c.voteCount || c._count?.votes || 0) + 1,
                        }
                      : c
                  )
                );
              }}
            />
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowPaidVoteModal(false);
                  setSelectedContestantForVoting(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
