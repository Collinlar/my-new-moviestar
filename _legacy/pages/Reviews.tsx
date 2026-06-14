import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Star, Edit, Trash2, Search, Filter, SortAsc, SortDesc, Calendar, Film, MessageSquare, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const Reviews = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    search: '',
    rating: 'all',
    hasReview: false
  });
  
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [editingReview, setEditingReview] = useState<{
    id: string;
    rating: number;
    review_text: string;
  } | null>(null);

  // Fetch user's reviews
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ['user-reviews', user?.id, filters, sortBy, sortOrder],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('reviews')
        .select(`
          *,
          movies(id, title, poster_url, release_year, genre, language, average_rating, review_count)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filters.rating && filters.rating !== 'all') {
        query = query.eq('rating', parseInt(filters.rating));
      }
      if (filters.hasReview) {
        query = query.not('review_text', 'is', null);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter after fetching (since we can't search across joined tables easily)
      let filteredData = data || [];
      if (filters.search) {
        filteredData = filteredData.filter(review => 
          review.movies?.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
          review.review_text?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      return filteredData;
    },
    enabled: !!user,
  });

  // Update review mutation
  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, rating, review_text }: { id: string; rating: number; review_text: string }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({ 
          rating, 
          review_text: review_text.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Review updated",
        description: "Your review has been updated successfully",
      });
      setEditingReview(null);
      queryClient.invalidateQueries({ queryKey: ['user-reviews', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update review",
        variant: "destructive",
      });
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      
      if (error) throw error;
      return reviewId;
    },
    onSuccess: () => {
      toast({
        title: "Review deleted",
        description: "Your review has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['user-reviews', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete review",
        variant: "destructive",
      });
    },
  });

  const handleEditReview = (review: any) => {
    setEditingReview({
      id: review.id,
      rating: review.rating,
      review_text: review.review_text || ''
    });
  };

  const handleSaveReview = () => {
    if (!editingReview) return;
    
    if (editingReview.rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before saving.",
        variant: "destructive",
      });
      return;
    }
    
    updateReviewMutation.mutate(editingReview);
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      rating: '',
      hasReview: false
    });
  };

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Authentication Required</h2>
              <p className="mt-2 text-muted-foreground">Please sign in to view your reviews.</p>
              <Link to="/auth">
                <Button className="mt-4">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Reviews</h1>
          <p className="text-lg text-muted-foreground">
            Manage your movie reviews and ratings
          </p>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or review text..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} Star{rating !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Has Review Filter */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-review"
                  checked={filters.hasReview}
                  onChange={(e) => setFilters(prev => ({ ...prev, hasReview: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="has-review" className="text-sm font-medium">With Review Text Only</label>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Sort by:</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Posted</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="title">Movie Title</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="gap-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>

              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Content */}
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-24 bg-muted rounded flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-20 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </h2>
            </div>

            <div className="space-y-6">
              {reviews.map((review) => (
                <Card key={review.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {editingReview?.id === review.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-24 bg-muted rounded flex-shrink-0">
                            {review.movies?.poster_url && (
                              <img 
                                src={review.movies.poster_url} 
                                alt={review.movies.title}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <h3 className="font-semibold text-lg">{review.movies?.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{review.movies?.release_year}</span>
                                <span>•</span>
                                <span>{formatGenre(review.movies?.genre || '')}</span>
                                <span>•</span>
                                <span>{formatLanguage(review.movies?.language || '')}</span>
                              </div>
                            </div>

                            {/* Rating Selection */}
                            <div>
                              <label className="block text-sm font-medium mb-2">Rating</label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditingReview(prev => prev ? { ...prev, rating: star } : null)}
                                    className="p-1 hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      className={`w-6 h-6 ${
                                        star <= editingReview.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Review Text */}
                            <div>
                              <label className="block text-sm font-medium mb-2">Review (Optional)</label>
                              <Textarea
                                placeholder="Share your thoughts about this movie..."
                                value={editingReview.review_text}
                                onChange={(e) => setEditingReview(prev => prev ? { ...prev, review_text: e.target.value } : null)}
                                rows={4}
                                maxLength={500}
                              />
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {editingReview.review_text.length}/500
                                </span>
                              </div>
                            </div>

                            {/* Edit Actions */}
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSaveReview}
                                disabled={updateReviewMutation.isPending}
                                size="sm"
                              >
                                {updateReviewMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-24 bg-muted rounded flex-shrink-0">
                          {review.movies?.poster_url && (
                            <img 
                              src={review.movies.poster_url} 
                              alt={review.movies.title}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                <Link to={`/movie/${review.movies?.id}`} className="hover:underline">
                                  {review.movies?.title}
                                </Link>
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {review.movies?.release_year}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Film className="h-3 w-3" />
                                  {formatGenre(review.movies?.genre || '')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {formatLanguage(review.movies?.language || '')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditReview(review)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deleteReviewMutation.isPending}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Rating Display */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {review.rating}/5
                            </span>
                          </div>

                          {/* Review Text */}
                          {review.review_text && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Your Review</span>
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {review.review_text}
                              </p>
                            </div>
                          )}

                          {/* Timestamp */}
                          <p className="text-xs text-muted-foreground">
                            Posted {new Date(review.created_at).toLocaleDateString()}
                            {review.updated_at !== review.created_at && (
                              <span> • Updated {new Date(review.updated_at).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Start sharing your thoughts by rating and reviewing movies!
              </p>
              <Link to="/browse">
                <Button>Browse Movies</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reviews;
