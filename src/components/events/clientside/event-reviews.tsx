'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Star,
  MessageSquare,
  Edit2,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  deleteRating,
  getEventRatings,
  getUserEventRating,
  canUserReviewEvent,
} from '@/actions/rating.actions';
import { ReviewModal } from '@/components/events/clientside/review-modal';

interface Rating {
  id: string;
  rating: number;
  comment?: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: string;
}

interface EventReviewsProps {
  eventId: string;
  eventTitle: string;
  initialRatings?: Rating[];
  isPastEvent: boolean;
}

export function EventReviews({
  eventId,
  eventTitle,
  initialRatings = [],
  isPastEvent,
}: EventReviewsProps) {
  const [ratings, setRatings] = useState<Rating[]>(initialRatings);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState<Rating | null>(null);
  const [reviewPermission, setReviewPermission] = useState<{
    canReview: boolean;
    reason?: string;
    hasExistingReview: boolean;
  } | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(initialRatings.length);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<
    { rating: number; count: number }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Check review permissions on component mount
  useEffect(() => {
    checkReviewPermissions();
    if (initialRatings.length === 0) {
      loadEventRatings();
    }
  }, [eventId]);

  // Calculate statistics when ratings change
  useEffect(() => {
    calculateStatistics();
  }, [ratings]);

  const checkReviewPermissions = async () => {
    try {
      const [permissionResponse, userRatingResponse] = await Promise.all([
        canUserReviewEvent(eventId),
        getUserEventRating(eventId),
      ]);

      if (permissionResponse.success && permissionResponse.data) {
        setReviewPermission(permissionResponse.data);
        setCanReview(permissionResponse.data.canReview);
      }

      if (userRatingResponse.success && userRatingResponse.data) {
        setUserReview(userRatingResponse.data);
      }
    } catch (error) {
      console.error('Error checking review permissions:', error);
    }
  };

  const loadEventRatings = async (page = 1, append = false) => {
    setLoading(true);
    try {
      const response = await getEventRatings(eventId, page, 10);

      if (response.success && response.data) {
        const {
          ratings: newRatings,
          totalCount,
          averageRating,
          ratingDistribution,
          hasMore,
        } = response.data;

        if (append) {
          setRatings((prev) => [...prev, ...newRatings]);
        } else {
          setRatings(newRatings);
        }

        setTotalCount(totalCount);
        setAverageRating(averageRating);
        setRatingDistribution(ratingDistribution);
        setHasMore(hasMore);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = () => {
    if (ratings.length === 0) {
      setAverageRating(0);
      setRatingDistribution([]);
      return;
    }

    const avg =
      ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length;
    setAverageRating(Math.round(avg * 10) / 10);

    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      rating: star,
      count: ratings.filter((r) => Math.floor(Number(r.rating)) === star)
        .length,
    }));
    setRatingDistribution(distribution);
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await deleteRating(reviewId);

      if (response.success) {
        toast.success('Review deleted successfully');
        setDeleteReviewId(null);

        // Refresh data
        await Promise.all([
          checkReviewPermissions(),
          loadEventRatings(1, false),
        ]);
      } else {
        toast.error(response.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const loadMoreReviews = () => {
    if (hasMore && !loading) {
      loadEventRatings(currentPage + 1, true);
    }
  };

  const handleReviewSubmitted = async () => {
    // Refresh all data after review submission
    await Promise.all([checkReviewPermissions(), loadEventRatings(1, false)]);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-muted stroke-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  const canWriteReview =
    isPastEvent && canReview && !reviewPermission?.hasExistingReview;
  const canEditReview = userReview && isPastEvent;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Reviews & Ratings
              {totalCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              {canWriteReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Write Review
                </Button>
              )}
              {canEditReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit Review
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Review Permission Message */}
          {isPastEvent && reviewPermission && !reviewPermission.canReview && (
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="text-sm text-muted-foreground">
                {reviewPermission.reason}
              </p>
            </div>
          )}

          {/* Overall Rating Summary */}
          {totalCount > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {averageRating.toFixed(1)}
                </div>
                {renderStars(Math.round(averageRating))}
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {totalCount} review{totalCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-2">
                {ratingDistribution.map(({ rating, count }) => {
                  const percentage =
                    totalCount > 0 ? (count / totalCount) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm w-8">{rating} ★</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No reviews yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {canWriteReview
                  ? 'Be the first to review this event!'
                  : 'Reviews will appear here after the event ends.'}
              </p>
              {canWriteReview && (
                <Button onClick={() => setShowReviewModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Write First Review
                </Button>
              )}
            </div>
          )}

          {/* Individual Reviews */}
          {ratings.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Customer Reviews</h4>
                  {ratings.length > 5 && !showAllReviews && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllReviews(true)}
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show All Reviews
                    </Button>
                  )}
                  {showAllReviews && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllReviews(false)}
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </Button>
                  )}
                </div>

                {(showAllReviews ? ratings : ratings.slice(0, 5)).map(
                  (review, index) => (
                    <div key={review.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        {review.user.image ? (
                          <img
                            src={review.user.image}
                            alt={review.user.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {review.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {review.user.name}
                              </span>
                              {renderStars(Number(review.rating))}
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(review.createdAt),
                                  'MMM d, yyyy'
                                )}
                              </span>
                            </div>

                            {/* Review Actions for User's Own Review */}
                            {userReview && userReview.id === review.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setShowReviewModal(true)}
                                  >
                                    <Edit2 className="h-4 w-4 mr-2" />
                                    Edit Review
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteReviewId(review.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Review
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {review.comment && (
                            <p className="text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      </div>
                      {index !==
                        (showAllReviews ? ratings : ratings.slice(0, 5))
                          .length -
                          1 && <Separator className="ml-11" />}
                    </div>
                  )
                )}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreReviews}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : `Load More Reviews`}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={!!deleteReviewId}
            onOpenChange={(open) => !open && setDeleteReviewId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Review</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete your review? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteReviewId && handleDeleteReview(deleteReviewId)
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Review
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        eventId={eventId}
        eventTitle={eventTitle}
        existingReview={userReview}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
}
