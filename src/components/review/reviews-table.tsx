'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Search,
  Filter,
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
  User,
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
  exportReviews,
  getUserReviews,
} from '@/actions/admin-review-actions';

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

interface ReviewsTableProps {
  initialData: any;
  initialStats: ReviewsStats | null;
  userCanModerate: boolean;
}

export function ReviewsTable({
  initialData,
  initialStats,
  userCanModerate,
}: ReviewsTableProps) {
  const [reviews, setReviews] = useState<Review[]>(initialData?.reviews || []);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount || 0);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [stats, setStats] = useState<ReviewsStats | null>(initialStats);
  const [viewUserReviews, setViewUserReviews] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [userReviewsData, setUserReviewsData] = useState<any>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    if (searchTerm || filterRating || sortBy !== 'newest') {
      const timer = setTimeout(() => {
        loadReviews();
      }, 500); // Debounce search
      return () => clearTimeout(timer);
    }
  }, [searchTerm, filterRating, sortBy]);

  useEffect(() => {
    if (currentPage > 1) {
      loadReviews();
    }
  }, [currentPage]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await getAdminReviews({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        rating: filterRating ? parseInt(filterRating) : undefined,
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

  const loadUserReviews = async (userId: string) => {
    try {
      const response = await getUserReviews(userId, 1, 20);
      if (response.success && response.data) {
        setUserReviewsData(response.data);
      } else {
        toast.error(response.message || 'Failed to load user reviews');
      }
    } catch (error) {
      console.error('Error loading user reviews:', error);
      toast.error('Failed to load user reviews');
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilter = (type: string, value: string) => {
    if (type === 'rating') {
      setFilterRating(value);
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
        await Promise.all([loadReviews(), loadStats()]);
      } else {
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
        toast.success(`${selectedReviews.length} reviews deleted successfully`);
        setSelectedReviews([]);
        setShowBulkDelete(false);
        await Promise.all([loadReviews(), loadStats()]);
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
      const response = await exportReviews('csv', {
        search: searchTerm,
        rating: filterRating ? parseInt(filterRating) : undefined,
        sortBy,
      });

      if (response.success && response.data) {
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reviews-export-${
          new Date().toISOString().split('T')[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Reviews exported successfully');
      } else {
        toast.error(response.message || 'Failed to export reviews');
      }
    } catch (error) {
      console.error('Error exporting reviews:', error);
      toast.error('Failed to export reviews');
    }
  };

  const handleViewUserReviews = async (userId: string, userName: string) => {
    setViewUserReviews({ userId, userName });
    await loadUserReviews(userId);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
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
                <CheckCircle className="h-4 w-4 text-green-500" />
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
                <Calendar className="h-4 w-4 text-purple-500" />
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

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                onClick={loadReviews}
                disabled={loading}
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedReviews.length > 0 && userCanModerate && (
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
                      {userCanModerate && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedReviews.length === reviews.length &&
                              reviews.length > 0
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
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
                        {userCanModerate && (
                          <TableCell>
                            <Checkbox
                              checked={selectedReviews.includes(review.id)}
                              onCheckedChange={(checked) =>
                                handleSelectReview(
                                  review.id,
                                  checked as boolean
                                )
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                                  handleViewUserReviews(
                                    review.user.id,
                                    review.user.name
                                  )
                                }
                              >
                                <User className="h-4 w-4 mr-2" />
                                User Reviews
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
                              {userCanModerate && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteReviewId(review.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Review
                                  </DropdownMenuItem>
                                </>
                              )}
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
                      disabled={currentPage === 1 || loading}
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
                      disabled={currentPage === totalPages || loading}
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
                      <img
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

      {/* User Reviews Dialog */}
      <Dialog
        open={!!viewUserReviews}
        onOpenChange={(open) => !open && setViewUserReviews(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              All Reviews by {viewUserReviews?.userName}
            </DialogTitle>
            <DialogDescription>
              Complete review history for this user
            </DialogDescription>
          </DialogHeader>

          {userReviewsData && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white">
                    {userReviewsData.userInfo.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {userReviewsData.userInfo.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {userReviewsData.userInfo.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Reviews
                    </p>
                    <p className="text-lg font-bold">
                      {userReviewsData.totalCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Average Rating
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-lg font-bold">
                        {userReviewsData.userInfo.averageRating}
                      </p>
                      <RatingDisplay
                        rating={userReviewsData.userInfo.averageRating}
                        size="sm"
                        readonly
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-lg font-bold">
                      {format(
                        new Date(userReviewsData.userInfo.createdAt),
                        'MMM yyyy'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-3">
                {userReviewsData.reviews.map((review: any) => (
                  <div key={review.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-sm">
                            {review.event.title}
                          </h5>
                          <RatingDisplay
                            rating={review.rating}
                            size="sm"
                            readonly
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Event Date:{' '}
                          {format(
                            new Date(review.event.startDateTime),
                            'MMM d, yyyy'
                          )}
                        </p>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(review.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                ))}
                {userReviewsData.reviews.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    This user hasn't written any reviews yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
