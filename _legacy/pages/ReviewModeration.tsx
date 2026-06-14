import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, CheckCircle, XCircle, Eye, Filter, Search, AlertTriangle, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  flagged_reason?: string;
  user_id: string;
  movie: {
    id: string;
    title: string;
    poster_url: string | null;
  };
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ReviewModeration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [bulkActions, setBulkActions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch reviews for moderation
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ['reviews-moderation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          movie:movies(id, title, poster_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately to avoid join issues
      if (data) {
        const userIds = [...new Set(data.map(review => review.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Create a map for quick lookup
        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Merge profiles data with reviews
        return data.map(review => ({
          ...review,
          profile: profilesMap.get(review.user_id) || { display_name: 'Anonymous', avatar_url: null }
        }));
      }

      return data || [];
    },
    enabled: !!user && isAdmin,
  });

  // Approve review mutation
  const approveReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved' })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Review approved successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve review",
        variant: "destructive",
      });
    },
  });

  // Reject review mutation
  const rejectReviewMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: 'rejected',
          flagged_reason: reason
        })
        .eq('id', reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Review rejected successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject review",
        variant: "destructive",
      });
    },
  });

  // Bulk approve reviews mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved' })
        .in('id', reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `${bulkActions.length} reviews approved successfully`,
      });
      setBulkActions([]);
      setShowBulkActions(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve reviews",
        variant: "destructive",
      });
    },
  });

  // Bulk reject reviews mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async ({ reviewIds, reason }: { reviewIds: string[]; reason: string }) => {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          status: 'rejected',
          flagged_reason: reason
        })
        .in('id', reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: `${bulkActions.length} reviews rejected successfully`,
      });
      setBulkActions([]);
      setShowBulkActions(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject reviews",
        variant: "destructive",
      });
    },
  });

  // Filter reviews based on search and filters
  const filteredReviews = reviews?.filter((review) => {
    const matchesSearch = 
      review.review_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.movie?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review as any).profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesRating = ratingFilter === 'all' || review.rating.toString() === ratingFilter;

    return matchesSearch && matchesStatus && matchesRating;
  }) || [];

  const handleReject = (reviewId: string) => {
    const reason = prompt('Please provide a reason for rejecting this review:');
    if (reason) {
      rejectReviewMutation.mutate({ reviewId, reason });
    }
  };

  const handleBulkApprove = () => {
    if (bulkActions.length === 0) return;
    if (confirm(`Are you sure you want to approve ${bulkActions.length} reviews?`)) {
      bulkApproveMutation.mutate(bulkActions);
    }
  };

  const handleBulkReject = () => {
    if (bulkActions.length === 0) return;
    const reason = prompt('Please provide a reason for rejecting these reviews:');
    if (reason) {
      bulkRejectMutation.mutate({ reviewIds: bulkActions, reason });
    }
  };

  const toggleBulkAction = (reviewId: string) => {
    setBulkActions(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const selectAll = () => {
    if (bulkActions.length === filteredReviews.length) {
      setBulkActions([]);
    } else {
      setBulkActions(filteredReviews.map(review => review.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${
          i < rating ? 'text-yellow-500' : 'text-muted-foreground'
        }`}
      >
        ★
      </span>
    ));
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to moderate reviews.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingCount = reviews?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = reviews?.filter(r => r.status === 'approved').length || 0;
  const rejectedCount = reviews?.filter(r => r.status === 'rejected').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Moderation</h1>
            <p className="text-muted-foreground">Approve, reject, and manage user reviews</p>
          </div>
          <Link to="/admin">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{reviews?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Reviews</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reviews, movies, or users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select value={ratingFilter} onValueChange={(value: any) => setRatingFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {showBulkActions && bulkActions.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-800">
                Bulk Actions ({bulkActions.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All ({bulkActions.length})
                </Button>
                <Button
                  onClick={handleBulkReject}
                  disabled={bulkRejectMutation.isPending}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject All ({bulkActions.length})
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkActions([]);
                    setShowBulkActions(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Reviews ({filteredReviews.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  Bulk Actions
                </Button>
                {showBulkActions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    {bulkActions.length === filteredReviews.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading reviews...</p>
              </div>
            ) : filteredReviews.length > 0 ? (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={bulkActions.includes(review.id)}
                            onChange={() => toggleBulkAction(review.id)}
                            className="mt-2 rounded"
                          />
                        )}
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {review.movie?.poster_url ? (
                            <img
                              src={review.movie.poster_url}
                              alt={review.movie?.title || 'Movie'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <span className="text-xs">No Poster</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{review.movie?.title || 'Unknown Movie'}</h3>
                            {getStatusBadge(review.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {getRatingStars(review.rating)}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-muted rounded-full overflow-hidden flex-shrink-0">
                                {(review as any).profile?.avatar_url ? (
                                  <img
                                    src={(review as any).profile.avatar_url}
                                    alt={(review as any).profile?.display_name || 'User'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <User className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                by {(review as any).profile?.display_name || 'Anonymous'}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {review.review_text && (
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {review.review_text}
                            </p>
                          )}

                          {review.flagged_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Rejection Reason:</strong> {review.flagged_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {review.movie?.id && (
                          <Link to={`/movie/${review.movie.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Movie
                            </Button>
                          </Link>
                        )}
                        
                        {review.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => approveReviewMutation.mutate(review.id)}
                              disabled={approveReviewMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(review.id)}
                              disabled={rejectReviewMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reviews found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReviewModeration;
