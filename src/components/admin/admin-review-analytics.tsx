'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  Star,
  Calendar,
  Users,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RatingDisplay, CompactRating } from '@/components/ui/ratings-display';
import { getReviewAnalytics } from '@/actions/admin-review-actions';
import { toast } from 'sonner';

interface AnalyticsData {
  monthlyReviews: { month: string; count: number; averageRating: number }[];
  topRatedEvents: {
    id: string;
    title: string;
    slug: string;
    startDateTime: string;
    ratingsCount: number;
    averageRating: number;
  }[];
  recentActivity: {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user: { id: string; name: string; image?: string };
    event: { id: string; title: string; slug: string };
  }[];
}

export function AdminReviewsAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12months');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await getReviewAnalytics();
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        toast.error(response.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-muted rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load analytics data</p>
        <Button onClick={loadAnalytics} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  // Calculate trending metrics
  const currentMonth =
    analytics.monthlyReviews[analytics.monthlyReviews.length - 1];
  const previousMonth =
    analytics.monthlyReviews[analytics.monthlyReviews.length - 2];
  const reviewsTrend =
    currentMonth && previousMonth
      ? ((currentMonth.count - previousMonth.count) /
          (previousMonth.count || 1)) *
        100
      : 0;
  const ratingTrend =
    currentMonth && previousMonth
      ? ((currentMonth.averageRating - previousMonth.averageRating) /
          (previousMonth.averageRating || 1)) *
        100
      : 0;

  const totalReviews = analytics.monthlyReviews.reduce(
    (sum, month) => sum + month.count,
    0
  );
  const averageRating =
    analytics.monthlyReviews.length > 0
      ? analytics.monthlyReviews.reduce(
          (sum, month) => sum + month.averageRating * month.count,
          0
        ) / totalReviews
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews Analytics</h1>
          <p className="text-muted-foreground">
            Insights and trends from your event reviews
          </p>
        </div>
        <Button onClick={loadAnalytics} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">
                  {totalReviews.toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            {reviewsTrend !== 0 && (
              <div className="flex items-center mt-2">
                {reviewsTrend > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={`text-sm ${
                    reviewsTrend > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.abs(reviewsTrend).toFixed(1)}% vs last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {averageRating.toFixed(1)}
                  </p>
                  <RatingDisplay rating={averageRating} size="sm" readonly />
                </div>
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            {ratingTrend !== 0 && (
              <div className="flex items-center mt-2">
                {ratingTrend > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={`text-sm ${
                    ratingTrend > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.abs(ratingTrend).toFixed(1)}% vs last month
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{currentMonth?.count || 0}</p>
              </div>
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Avg: {currentMonth?.averageRating.toFixed(1) || '0.0'} stars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Top Rated Events
                </p>
                <p className="text-2xl font-bold">
                  {analytics.topRatedEvents.length}
                </p>
              </div>
              <Award className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              4.5+ star rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Review Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.monthlyReviews.slice(-6).map((month, index) => (
                <div
                  key={month.month}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-sm text-muted-foreground">
                      {month.month}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.max(
                              10,
                              (month.count /
                                Math.max(
                                  ...analytics.monthlyReviews.map(
                                    (m) => m.count
                                  )
                                )) *
                                100
                            )}px`,
                          }}
                        />
                        <span className="text-sm font-medium">
                          {month.count}
                        </span>
                      </div>
                    </div>
                  </div>
                  <CompactRating rating={month.averageRating} size="xs" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Rated Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Rated Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topRatedEvents.slice(0, 5).map((event, index) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {event.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.startDateTime), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <CompactRating
                          rating={event.averageRating}
                          count={event.ratingsCount}
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {analytics.topRatedEvents.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No events with sufficient reviews yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Review Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
              >
                {activity.user.image ? (
                  <img
                    src={activity.user.image}
                    alt={activity.user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {activity.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.user.name}
                        </span>{' '}
                        reviewed{' '}
                        <span className="font-medium">
                          {activity.event.title}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <RatingDisplay
                          rating={activity.rating}
                          size="xs"
                          readonly
                        />
                        <span className="text-xs text-muted-foreground">
                          {format(
                            new Date(activity.createdAt),
                            'MMM d, h:mm a'
                          )}
                        </span>
                      </div>
                      {activity.comment && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          "{activity.comment}"
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(`/events/${activity.event.slug}`, '_blank')
                      }
                    >
                      View Event
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {analytics.recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recent review activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
