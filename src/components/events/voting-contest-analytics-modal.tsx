'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Vote,
  Trophy,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
  Crown,
  Medal,
  Award,
  Star,
} from 'lucide-react';
import { getContestResults } from '@/actions/voting-contest.actions';
import { toast } from 'sonner';

interface VotingContestAnalyticsModalProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userSubRole: string;
}

interface ContestResult {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  contestNumber: string;
  status: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  voteCount: number;
  percentage: number;
  rank: number;
}

interface VotingStats {
  totalVotes: number;
  guestVotes: number;
  registeredVotes: number;
  totalContestants: number;
  totalRevenue: number;
  platformFee: number;
  netRevenue: number;
}

interface ContestData {
  contest: {
    id: string;
    votingType: string;
    votePackagesEnabled: boolean;
    defaultVotePrice?: number;
    allowGuestVoting: boolean;
    showLiveResults: boolean;
    showVoterNames: boolean;
    allowMultipleVotes: boolean;
    maxVotesPerUser?: number;
    votingStartDate?: string;
    votingEndDate?: string;
  };
  event: {
    id: string;
    title: string;
    slug?: string;
    startDateTime: string;
    endDateTime: string;
    publishedStatus: string;
  };
  results: ContestResult[];
  votePackages: any[];
  statistics: VotingStats;
  votingActivity: Record<string, number>;
  topVoters: any[];
  recentVotes: any[];
}

export function VotingContestAnalyticsModal({
  event,
  isOpen,
  onClose,
  userRole,
  userSubRole,
}: VotingContestAnalyticsModalProps) {
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Load contest analytics
  const loadContestAnalytics = async () => {
    if (!event?.votingContest?.id) return;

    setIsLoading(true);
    try {
      const response = await getContestResults(event.votingContest.id);

      if (response.success) {
        setContestData(response.data);
      } else {
        toast.error(response.message || 'Failed to load contest analytics');
      }
    } catch (error) {
      console.error('Error loading contest analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (isOpen && contestData) {
      const interval = setInterval(() => {
        if (!isLoading) {
          loadContestAnalytics();
        }
      }, 30000); // Refresh every 30 seconds

      setRefreshInterval(interval);
      return () => {
        clearInterval(interval);
        setRefreshInterval(null);
      };
    }
  }, [isOpen, contestData, isLoading]);

  useEffect(() => {
    if (isOpen) {
      loadContestAnalytics();
    }
  }, [isOpen, event?.votingContest?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'PPP p');
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP');
  };

  const getVotingStatusBadge = () => {
    if (!contestData?.contest) return null;

    const now = new Date();
    const startDate = contestData.contest.votingStartDate
      ? new Date(contestData.contest.votingStartDate)
      : null;
    const endDate = contestData.contest.votingEndDate
      ? new Date(contestData.contest.votingEndDate)
      : null;

    if (startDate && now < startDate) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Not Started
        </Badge>
      );
    } else if (endDate && now > endDate) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Ended
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-sm font-medium">#{rank}</span>;
    }
  };

  if (!event || !event.votingContest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Vote className="h-5 w-5" />
                {event.title} - Voting Analytics
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{formatDateTime(event.startDateTime)}</span>
                {getVotingStatusBadge()}
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800"
                >
                  Voting Contest
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadContestAnalytics}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Auto-refresh indicator */}
        {refreshInterval && contestData && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analytics refresh automatically every 30 seconds
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !contestData ? (
          <div className="flex items-center justify-center min-h-96">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading contest analytics...</span>
            </div>
          </div>
        ) : contestData ? (
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="voters">Voters</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Votes
                      </CardTitle>
                      <Vote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {contestData.statistics.totalVotes.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600">
                          {contestData.statistics.registeredVotes}
                        </span>{' '}
                        registered,
                        <span className="text-blue-600 ml-1">
                          {contestData.statistics.guestVotes}
                        </span>{' '}
                        guest
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Contestants
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {contestData.statistics.totalContestants}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active contestants
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Revenue
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(contestData.statistics.totalRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Gross revenue
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Your Earnings
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(contestData.statistics.netRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        After platform fee
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contest Settings Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Contest Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Voting Type</span>
                          <Badge
                            variant={
                              contestData.contest.votingType === 'FREE'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {contestData.contest.votingType === 'FREE'
                              ? 'Free Voting'
                              : 'Paid Voting'}
                          </Badge>
                        </div>

                        {contestData.contest.votingType === 'PAID' && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Vote Packages</span>
                              <span className="font-medium">
                                {contestData.contest.votePackagesEnabled
                                  ? 'Enabled'
                                  : 'Disabled'}
                              </span>
                            </div>

                            {contestData.contest.defaultVotePrice && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm">
                                  Default Vote Price
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(
                                    contestData.contest.defaultVotePrice
                                  )}
                                </span>
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Guest Voting</span>
                          <span className="font-medium">
                            {contestData.contest.allowGuestVoting
                              ? 'Allowed'
                              : 'Not Allowed'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Multiple Votes</span>
                          <span className="font-medium">
                            {contestData.contest.allowMultipleVotes
                              ? 'Allowed'
                              : 'Not Allowed'}
                          </span>
                        </div>

                        {contestData.contest.maxVotesPerUser && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Max Votes Per User</span>
                            <span className="font-medium">
                              {contestData.contest.maxVotesPerUser}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Live Results</span>
                          <span className="font-medium">
                            {contestData.contest.showLiveResults
                              ? 'Visible'
                              : 'Hidden'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm">Voter Names</span>
                          <span className="font-medium">
                            {contestData.contest.showVoterNames
                              ? 'Visible'
                              : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Voting Timeline */}
                {contestData.contest.votingStartDate &&
                  contestData.contest.votingEndDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Voting Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Voting Starts</span>
                            <span className="font-medium">
                              {formatDateTime(
                                contestData.contest.votingStartDate
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Voting Ends</span>
                            <span className="font-medium">
                              {formatDateTime(
                                contestData.contest.votingEndDate
                              )}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Contest Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {contestData.results.map((contestant, index) => (
                        <div
                          key={contestant.id}
                          className={`border rounded-lg p-4 ${
                            index < 3 ? 'border-yellow-200 bg-yellow-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getRankIcon(contestant.rank)}
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {contestant.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  #{contestant.contestNumber}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">
                                {contestant.voteCount.toLocaleString()} votes
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {contestant.percentage}%
                              </div>
                            </div>
                          </div>

                          <div className="mb-3">
                            <Progress
                              value={contestant.percentage}
                              className="h-2"
                            />
                          </div>

                          {contestant.bio && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {contestant.bio}
                            </p>
                          )}

                          {(contestant.socialLinks.instagram ||
                            contestant.socialLinks.twitter ||
                            contestant.socialLinks.facebook) && (
                            <div className="flex gap-2">
                              {contestant.socialLinks.instagram && (
                                <Badge variant="outline">Instagram</Badge>
                              )}
                              {contestant.socialLinks.twitter && (
                                <Badge variant="outline">Twitter</Badge>
                              )}
                              {contestant.socialLinks.facebook && (
                                <Badge variant="outline">Facebook</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Revenue Tab */}
              <TabsContent value="revenue" className="space-y-6">
                {contestData.contest.votingType === 'PAID' ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Total Revenue</span>
                            <span className="font-medium">
                              {formatCurrency(
                                contestData.statistics.totalRevenue
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-orange-600">
                            <span className="text-sm">Platform Fee</span>
                            <span className="font-medium">
                              -
                              {formatCurrency(
                                contestData.statistics.platformFee
                              )}
                            </span>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center font-bold text-green-600 text-lg">
                              <span>Your Earnings</span>
                              <span>
                                {formatCurrency(
                                  contestData.statistics.netRevenue
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Vote Packages Performance */}
                    {contestData.votePackages.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Vote Package Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {contestData.votePackages.map((pkg: any) => (
                              <div
                                key={pkg.id}
                                className="border rounded-lg p-4"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{pkg.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {pkg.voteCount} votes -{' '}
                                      {formatCurrency(pkg.price)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-muted-foreground">
                                      Sales data would go here
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Free Voting Contest</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium">
                          This is a free voting contest
                        </p>
                        <p className="text-muted-foreground">
                          No revenue is generated from this contest as voting is
                          free.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Voters Tab */}
              <TabsContent value="voters" className="space-y-6">
                {/* Top Voters */}
                {contestData.topVoters.length > 0 &&
                  contestData.contest.showVoterNames && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5" />
                          Top Voters
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Votes Cast</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contestData.topVoters.map((voter, index) => (
                              <TableRow key={voter.userId}>
                                <TableCell>#{index + 1}</TableCell>
                                <TableCell>{voter.name}</TableCell>
                                <TableCell>{voter.voteCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                {/* Recent Votes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Vote className="h-5 w-5" />
                      Recent Voting Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contestData.recentVotes.slice(0, 10).map((vote: any) => (
                        <div
                          key={vote.id}
                          className="flex justify-between items-center border-b pb-2"
                        >
                          <div>
                            <span className="font-medium">
                              {contestData.contest.showVoterNames && vote.user
                                ? vote.user.name
                                : vote.userId
                                  ? 'Registered User'
                                  : 'Guest Voter'}
                            </span>
                            <span className="text-muted-foreground text-sm ml-2">
                              voted for {vote.contestant.name}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(vote.createdAt), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                      ))}

                      {contestData.recentVotes.length === 0 && (
                        <div className="text-center py-8">
                          <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-lg font-medium">No votes yet</p>
                          <p className="text-muted-foreground">
                            Voting activity will appear here once users start
                            voting.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Contest Data Available</h3>
              <p className="text-muted-foreground">
                Contest analytics data is not available for this event yet.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
