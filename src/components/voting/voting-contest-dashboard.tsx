// components/voting/voting-contest-dashboard.tsx - A comprehensive dashboard for contestants to see their votes
'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Vote, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getContestStatistics } from '@/actions/voting-contest.actions';

interface ContestDashboardProps {
  contestId: string;
  showLiveResults: boolean;
}

export function VotingContestDashboard({
  contestId,
  showLiveResults,
}: ContestDashboardProps) {
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStatistics();

    // Auto-refresh every 30 seconds if live results are enabled
    let interval: NodeJS.Timeout;
    if (showLiveResults) {
      interval = setInterval(() => {
        loadStatistics();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [contestId, showLiveResults, refreshKey]);

  const loadStatistics = async () => {
    try {
      const response = await getContestStatistics(contestId);
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading contest statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !statistics) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Votes
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {statistics.totalVotes?.toLocaleString() || 0}
                </p>
              </div>
              <Vote className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Contestants
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {statistics.activeContestants}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {statistics.votingType === 'PAID' && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Revenue
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(statistics.totalRevenue || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Orders
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      {statistics.totalOrders}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Top Contestants */}
      {showLiveResults &&
        statistics.topContestants &&
        statistics.topContestants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Top Contestants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.topContestants.map(
                  (contestant: any, index: number) => (
                    <div
                      key={contestant.id}
                      className="flex items-center gap-4"
                    >
                      <Badge
                        variant={index === 0 ? 'default' : 'secondary'}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0
                            ? 'bg-yellow-500'
                            : index === 1
                              ? 'bg-gray-400'
                              : 'bg-amber-600'
                        }`}
                      >
                        #{contestant.rank}
                      </Badge>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-semibold">
                              #{contestant.contestNumber}
                            </span>
                            <span className="ml-2">{contestant.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {contestant.voteCount.toLocaleString()} votes
                            </span>
                            <Badge variant="outline">
                              {contestant.percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={contestant.percentage}
                          className="h-2"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Auto-refresh indicator */}
      {showLiveResults && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Live results • Updates every 30 seconds
          </Badge>
        </div>
      )}
    </div>
  );
}
