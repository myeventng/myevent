'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Rating {
  id: string;
  rating: number;
  comment?: string;
  user: {
    name: string;
    image?: string;
  };
}

interface EventReviewsProps {
  eventId: string;
  ratings: Rating[];
  isPastEvent: boolean;
}

export function EventReviews({
  eventId,
  ratings,
  isPastEvent,
}: EventReviewsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate average rating
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length
      : 0;

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => Math.floor(Number(r.rating)) === star).length,
    percentage:
      ratings.length > 0
        ? (ratings.filter((r) => Math.floor(Number(r.rating)) === star).length /
            ratings.length) *
          100
        : 0,
  }));

  const handleSubmitReview = async () => {
    if (newRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement review submission API call
      // const response = await submitReview(eventId, newRating, newComment);

      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setNewRating(0);
      setNewComment('');
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'sm') => {
    const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-muted stroke-muted-foreground'
            } ${
              interactive
                ? 'cursor-pointer hover:scale-110 transition-transform'
                : ''
            }`}
            onClick={interactive ? () => setNewRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reviews & Ratings
          </CardTitle>
          {isPastEvent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewForm(!showReviewForm)}
            >
              Write Review
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating Summary */}
        {ratings.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating), false, 'lg')}
              <p className="text-sm text-muted-foreground mt-2">
                Based on {ratings.length} review
                {ratings.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm w-8">{star} ★</span>
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
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No reviews yet</h3>
            <p className="text-sm text-muted-foreground">
              Be the first to review this event!
            </p>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Write a Review</h4>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Rating
                </label>
                {renderStars(newRating, true, 'lg')}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Review (Optional)
                </label>
                <Textarea
                  placeholder="Share your experience with this event..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || newRating === 0}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                    setNewRating(0);
                    setNewComment('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Individual Reviews */}
        {ratings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">Customer Reviews</h4>
              {ratings.slice(0, 5).map((review) => (
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {review.user.name}
                        </span>
                        {renderStars(Number(review.rating))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {ratings.length > 5 && (
                <Button variant="outline" size="sm" className="w-full">
                  View All {ratings.length} Reviews
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
