'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { createRating, updateRating } from '@/actions/rating.actions';
import { cn } from '@/lib/utils';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  existingReview?: {
    id: string;
    rating: number;
    comment?: string;
  } | null;
  onReviewSubmitted: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  existingReview,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!existingReview;

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(existingReview?.rating || 0);
      setComment(existingReview?.comment || '');
      setHoveredRating(0);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;

      if (isEditing && existingReview) {
        response = await updateRating({
          id: existingReview.id,
          eventId,
          rating,
          comment: comment.trim() || undefined,
        });
      } else {
        response = await createRating({
          eventId,
          rating,
          comment: comment.trim() || undefined,
        });
      }

      if (response.success) {
        toast.success(
          isEditing
            ? 'Review updated successfully!'
            : 'Review submitted successfully!'
        );
        onReviewSubmitted();
        handleClose();
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= (hoveredRating || rating);
          return (
            <button
              key={star}
              type="button"
              className={cn(
                'p-1 rounded-full transition-all duration-200',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              disabled={isSubmitting}
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors duration-200',
                  isActive
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-muted stroke-muted-foreground hover:fill-yellow-200 hover:text-yellow-200'
                )}
              />
            </button>
          );
        })}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    if (rating === 0) return 'Select a rating';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    if (rating === 5) return 'Excellent';
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {isEditing ? 'Edit Your Review' : 'Write a Review'}
          </DialogTitle>
          <DialogDescription>
            Share your experience with "{eventTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Section */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Your Rating <span className="text-destructive">*</span>
            </Label>

            <div className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-lg">
              {renderStars()}
              <p className="text-sm font-medium text-center">
                {getRatingText(hoveredRating || rating)}
              </p>
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-3">
            <Label htmlFor="comment" className="text-base font-medium">
              Your Review{' '}
              <span className="text-sm text-muted-foreground font-normal">
                (Optional)
              </span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience at this event..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1000}
              disabled={isSubmitting}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Help others by sharing details about the event</span>
              <span>{comment.length}/1000</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1"
            >
              {isSubmitting
                ? 'Submitting...'
                : isEditing
                ? 'Update Review'
                : 'Submit Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
