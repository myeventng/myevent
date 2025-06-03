import { notFound } from 'next/navigation';
import { getEventReviewsAdmin } from '@/actions/admin-review-actions';
import { getEventById } from '@/actions/event.actions';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RatingDisplay } from '@/components/ui/ratings-display';
import Link from 'next/link';
import Image from 'next/image';

interface EventReviewsPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata({ params }: EventReviewsPageProps) {
  const { eventId } = await params;
  const eventResponse = await getEventById(eventId);

  if (!eventResponse.success || !eventResponse.data) {
    return {
      title: 'Event Not Found | Admin Dashboard',
    };
  }

  return {
    title: `${eventResponse.data.title} Reviews | Admin Dashboard`,
    description: `Manage reviews for ${eventResponse.data.title}`,
  };
}

export default async function EventReviewsPage({
  params,
}: EventReviewsPageProps) {
  const { eventId } = await params;
  const [eventResponse, reviewsResponse] = await Promise.all([
    getEventById(eventId),
    getEventReviewsAdmin(eventId, 1, 50),
  ]);

  if (!eventResponse.success || !eventResponse.data) {
    notFound();
  }

  if (!reviewsResponse.success) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Reviews</h1>
          <p className="text-muted-foreground mb-4">
            {reviewsResponse.message}
          </p>
          <Button asChild>
            <Link href="/admin/reviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reviews
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const event = eventResponse.data;
  const { reviews, totalCount, averageRating } = reviewsResponse.data ?? {
    reviews: [],
    totalCount: 0,
    averageRating: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reviews">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reviews
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-muted-foreground">Event Reviews Management</p>
          </div>
        </div>

        {/* Event Info */}
        <Card>
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(event.startDateTime), 'PPP p')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event.venue.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      event.publishedStatus === 'PUBLISHED'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {event.publishedStatus}
                  </Badge>
                  {event.featured && (
                    <Badge variant="outline">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Review Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Reviews
                      </span>
                      <span className="font-medium">{totalCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Average Rating
                      </span>
                      <RatingDisplay
                        rating={averageRating}
                        size="sm"
                        showValue
                        readonly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews ({totalCount})</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reviews for this event yet
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div key={review.id}>
                    <div className="flex items-start gap-4">
                      {review.user.image ? (
                        <Image
                          width={40}
                          height={40}
                          src={review.user.image}
                          alt={review.user.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {review.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{review.user.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {review.user.email}
                            </p>
                          </div>
                          <div className="text-right">
                            <RatingDisplay
                              rating={review.rating}
                              size="sm"
                              readonly
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(
                                new Date(review.createdAt),
                                'MMM d, yyyy p'
                              )}
                            </p>
                          </div>
                        </div>

                        {review.comment && (
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-sm leading-relaxed">
                              {review.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {index < reviews.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
