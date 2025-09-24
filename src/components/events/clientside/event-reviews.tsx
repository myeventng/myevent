'use client';

import { useState } from 'react';
import {
  Star,
  MessageCircle,
  User,
  Calendar,
  Trophy,
  Vote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/lib/auth-client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Rating {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}

interface EventReviewsProps {
  eventId: string;
  eventTitle: string;
  initialRatings: Rating[];
  isPastEvent: boolean;
  isVotingContest?: boolean;
}

export function EventReviews({
  eventId,
  eventTitle,
  initialRatings,
  isPastEvent,
  isVotingContest = false,
}: EventReviewsProps) {
  const [ratings, setRatings] = useState<Rating[]>(initialRatings);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { data: session } = useSession();

  // Calculate average rating
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
      : 0;

  // Get rating distribution
  const getRatingDistribution = () => {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      distribution[rating.rating as keyof typeof distribution]++;
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  const handleStarClick = (rating: number) => {
    setNewRating(rating);
    if (!showReviewForm) {
      setShowReviewForm(true);
    }
  };

  const handleSubmitReview = async () => {
    if (!session?.user) {
      toast.error('Please sign in to leave a review');
      return;
    }

    if (newRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          rating: newRating,
          comment: newComment.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || 'Failed to submit review');
        return;
      }

      // Add the new rating to the list
      const newRatingData: Rating = {
        id: result.data.id,
        rating: newRating,
        comment: newComment.trim() || undefined,
        createdAt: new Date().toISOString(),
        user: {
          name: session.user.name || 'Anonymous',
          image: session.user.image ?? undefined,
        },
      };

      setRatings((prev) => [newRatingData, ...prev]);
      setNewRating(0);
      setNewComment('');
      setShowReviewForm(false);

      toast.success(
        isVotingContest
          ? 'Thank you for reviewing this contest!'
          : 'Thank you for your review!'
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    rating,
    onStarClick,
    interactive = false,
    size = 'h-5 w-5',
  }: {
    rating: number;
    onStarClick?: (rating: number) => void;
    interactive?: boolean;
    size?: string;
  }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onStarClick?.(star)}
            disabled={!interactive}
            className={`${interactive ? 'hover:scale-110 transition-transform cursor-pointer' : ''}`}
          >
            <Star
              className={`${size} ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : interactive
                    ? 'fill-gray-200 text-gray-300 hover:fill-yellow-200 hover:text-yellow-300'
                    : 'fill-gray-200 text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const visibleReviews = showAllReviews ? ratings : ratings.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isVotingContest ? (
            <>
              <Trophy className="h-5 w-5 text-purple-600" />
              Contest Reviews
            </>
          ) : (
            <>
              <Star className="h-5 w-5 text-yellow-500" />
              Event Reviews
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {averageRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(averageRating)} />
            <p className="text-sm text-muted-foreground mt-1">
              {ratings.length} review{ratings.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Rating Distribution */}
          {ratings.length > 0 && (
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3">{star}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width:
                          ratings.length > 0
                            ? `${(ratingDistribution[star as keyof typeof ratingDistribution] / ratings.length) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                  <span className="w-8 text-right">
                    {
                      ratingDistribution[
                        star as keyof typeof ratingDistribution
                      ]
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Review Section */}
        {isPastEvent && session?.user && !showReviewForm && (
          <div className="text-center">
            <Button
              onClick={() => setShowReviewForm(true)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {isVotingContest ? 'Review Contest' : 'Write a Review'}
            </Button>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
            <h4 className="font-semibold">
              {isVotingContest
                ? 'Share your contest experience'
                : 'Share your experience'}
            </h4>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Rating</Label>
              <StarRating
                rating={newRating}
                onStarClick={handleStarClick}
                interactive
                size="h-8 w-8"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Your Review (optional)
              </Label>
              <Textarea
                placeholder={
                  isVotingContest
                    ? 'Tell others about your contest experience...'
                    : 'Tell others about your event experience...'
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {newComment.length}/1000 characters
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || newRating === 0}
                className="flex-1"
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
        )}

        {!isPastEvent && (
          <div className="text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>
              Reviews will be available after the{' '}
              {isVotingContest ? 'contest' : 'event'} ends
            </p>
          </div>
        )}

        {/* Reviews List */}
        {ratings.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-4">
              {visibleReviews.map((rating) => (
                <div key={rating.id} className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={rating.user.image}
                      alt={rating.user.name}
                    />
                    <AvatarFallback>
                      {rating.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{rating.user.name}</span>
                      <StarRating rating={rating.rating} size="h-4 w-4" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(rating.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {rating.comment && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {rating.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Show More/Less Button */}
            {ratings.length > 3 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="text-sm"
                >
                  {showAllReviews
                    ? 'Show Less Reviews'
                    : `Show All ${ratings.length} Reviews`}
                </Button>
              </div>
            )}
          </div>
        )}

        {ratings.length === 0 && isPastEvent && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h4 className="font-semibold mb-2">No Reviews Yet</h4>
            <p className="text-sm">
              Be the first to review this{' '}
              {isVotingContest ? 'contest' : 'event'}!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
