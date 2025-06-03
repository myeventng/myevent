'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Search,
  // Filter,
  MoreHorizontal,
  Trash2,
  Flag,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { RatingDisplay } from '@/components/ui/ratings-display';
import {
  getAdminReviews,
  deleteRating,
  bulkDeleteRatings,
  getReviewsStats,
} from '@/actions/admin-review-actions';
import Image from 'next/image';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    startDateTime: string;
  };
}

interface ReviewsStats {
  totalReviews: number;
  averageRating: number;
  reviewsThisMonth: number;
  ratingDistribution: { rating: number; count: number }[];
}

export function AdminReviewsDashboard() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [filterEvent, setFilterEvent] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [stats, setStats] = useState<ReviewsStats | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [currentPage, searchTerm, filterRating, filterEvent, sortBy]);

  const loadReviews = async () => {
    setLoading(true);

    try {
      const response = await getAdminReviews({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        rating: filterRating ? parseInt(filterRating) : undefined,
        eventId: filterEvent || undefined,
        sortBy,
      });

      if (response.success && response.data) {
        setReviews(response.data.reviews);
        setTotalPages(response.data.totalPages);
        setTotalCount(response.data.totalCount);
      } else {
        toast.error(response.message || 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getReviewsStats();

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilter = (type: string, value: string) => {
    if (type === 'rating') {
      setFilterRating(value);
    } else if (type === 'event') {
      setFilterEvent(value);
    }
    setCurrentPage(1);
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSelectReview = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews((prev) => [...prev, reviewId]);
    } else {
      setSelectedReviews((prev) => prev.filter((id) => id !== reviewId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(reviews.map((review) => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await deleteRating(reviewId);

      if (response.success) {
        toast.success('Review deleted successfully');
        setDeleteReviewId(null);
        loadReviews();
        toast.error(response.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const response = await bulkDeleteRatings(selectedReviews);

      if (response.success) {
        toast.success(`${selectedReviews.length} reviews dele
                  ted successfully
                `);
        setSelectedReviews([]);

        setShowBulkDelete(false);
        loadReviews();
        loadStats();
      } else {
        toast.error(response.message || 'Failed to delete reviews');
      }
    } catch (error) {
      console.error('Error bulk deleting reviews:', error);
      toast.error('Failed to delete reviews');
    }
  };

  const handleExport = async () => {
    try {
      // This would typically generate a CSV/Excel file
      toast.info('Export functionality coming soon');
    } catch (error) {
      console.error('Error exporting reviews:', error);
      toast.error('Failed to export reviews');
    }
  };

  // const getRatingColor = (rating: number) => {
  //   if (rating >= 4) return 'text-green-600';
  //   if (rating >= 3) return 'text-yellow-600';
  //   if (rating >= 2) return 'text-orange-600';
  //   return 'text-red-600';
  // };

  const getStatIcon = (type: string) => {
    switch (type) {
      case 'total':
        return <BarChart3 className="h-4 w-4" />;
      case 'average':
        return <CheckCircle className="h-4 w-4" />;
      case 'month':
        return <Calendar className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage event reviews and ratings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadReviews} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatIcon('total')}
                <div>
                  <p className="text-sm text-muted-forground">Total Reviews</p>
                  <p className="text-2xl font-bold">
                    {stats.totalReviews.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatIcon('average')}
                <div>
                  <p className="text-sm text-muted-foreground">
                    Average Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {stats.averageRating.toFixed(1)}
                    </p>
                    <RatingDisplay
                      rating={stats.averageRating}
                      size="sm"
                      readonly
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {getStatIcon('month')}
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {stats.reviewsThisMonth.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          {' '}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews, users, or events..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={filterRating}
              onValueChange={(value) => handleFilter('rating', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={handleSort}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>

                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="highest">Highest Rating</SelectItem>
                <SelectItem value="lowest">Lowest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedReviews.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">
                  {selectedReviews.length} review
                  {selectedReviews.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReviews([])}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reviews ({totalCount.toLocaleString()})</CardTitle>
            {selectedReviews.length > 0 && (
              <Badge variant="secondary">
                {selectedReviews.length} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedReviews.length === reviews.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReviews.includes(review.id)}
                            onCheckedChange={(checked) =>
                              handleSelectReview(review.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {review.user.image ? (
                              <Image
                                width={32}
                                height={32}
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
                            <div>
                              <div className="font-medium text-sm">
                                {review.user.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {review.user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm line-clamp-1">
                              {review.event.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(
                                new Date(review.event.startDateTime),
                                'MMM d, yyyy'
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RatingDisplay
                            rating={review.rating}
                            size="sm"
                            showValue
                            readonly
                          />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {review.comment ? (
                            <div className="line-clamp-2 text-sm">
                              {review.comment}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">
                              No comment
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(review.createdAt), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewReview(review)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(
                                    `/events/${review.event.slug}`,
                                    '_blank'
                                  )
                                }
                              >
                                <Flag className="h-4 w-4 mr-2" />
                                View Event
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteReviewId(review.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Review
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, totalCount)} of{' '}
                    {totalCount} reviews
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Review Dialog */}
      <AlertDialog
        open={!!deleteReviewId}
        onOpenChange={(open) => !open && setDeleteReviewId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be
              undone.
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Reviews</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedReviews.length} review
              {selectedReviews.length !== 1 ? 's' : ''}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedReviews.length} Review
              {selectedReviews.length !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Review Dialog */}
      <Dialog
        open={!!viewReview}
        onOpenChange={(open) => !open && setViewReview(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Full review information and context
            </DialogDescription>
          </DialogHeader>

          {viewReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Reviewer</h4>
                  <div className="flex items-center gap-2">
                    {viewReview.user.image ? (
                      <Image
                        width={40}
                        height={40}
                        src={viewReview.user.image}
                        alt={viewReview.user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {viewReview.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{viewReview.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {viewReview.user.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Event</h4>
                  <div>
                    <div className="font-medium">{viewReview.event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(viewReview.event.startDateTime), 'PPP')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Rating</h4>
                <RatingDisplay
                  rating={viewReview.rating}
                  size="lg"
                  showValue
                  readonly
                />
              </div>

              <div>
                <h4 className="font-medium mb-2">Comment</h4>
                <div className="p-3 bg-muted/50 rounded-lg">
                  {viewReview.comment ? (
                    <p className="text-sm leading-relaxed">
                      {viewReview.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No comment provided
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Review Date</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(viewReview.createdAt), 'PPP p')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
