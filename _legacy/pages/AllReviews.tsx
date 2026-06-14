import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Navigation } from '@/components/Navigation';
import { Star, Search, Filter, SortAsc, SortDesc, Calendar, Film, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SEOHead from '@/components/SEOHead';

const AllReviews = () => {
  const [searchParams] = useSearchParams();
  const userFilter = searchParams.get('user');
  
  const [filters, setFilters] = useState({
    search: '',
    rating: 'all',
  });
  
  const [sortBy, setSortBy] = useState<'created_at' | 'rating' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Fetch all public reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['all-reviews', filters, sortBy, sortOrder, currentPage, userFilter],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select(`
          *,
          movies(id, title, poster_url, release_year, genre, language),
          profiles(username, avatar_url)
        `)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Filter by specific user if provided
      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`review_text.ilike.%${filters.search}%,movies.title.ilike.%${filters.search}%`);
      }

      // Apply rating filter
      if (filters.rating !== 'all') {
        query = query.eq('rating', parseInt(filters.rating));
      }

      // Apply sorting
      if (sortBy === 'title') {
        query = query.order('movies.title', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEOHead
        title="Community Movie Reviews"
        description="Read authentic reviews from African cinema enthusiasts. Discover what viewers think about Nollywood, Ghallywood, and pan-African movies through community ratings and opinions."
        keywords="African movie reviews, Nollywood film reviews, user ratings, movie opinions, community reviews"
        url="https://muviestars.com/all-reviews"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">
              {userFilter ? 'User Reviews' : 'All Reviews'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {userFilter 
              ? 'Reviews by this user' 
              : 'Discover what the community thinks about African movies'
            }
          </p>
        </div>

        {/* Filters and Sorting */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Sorting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews or movies..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Rating Filter */}
              <Select 
                value={filters.rating} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
              >
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

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="title">Movie Title</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-16 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {reviews.map((review: any) => (
                <Card key={review.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Movie Info */}
                    <div className="flex items-start gap-3 mb-4">
                      <img
                        src={review.movies?.poster_url}
                        alt={review.movies?.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/movie/${review.movies?.id}`}
                          className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2"
                        >
                          {review.movies?.title}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {review.movies?.release_year}
                          <Badge variant="outline" className="text-xs">
                            {review.movies?.genre}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        {renderStars(review.rating)}
                      </div>
                      <span className="font-medium">{review.rating}/5</span>
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {review.review_text}
                      </p>
                    )}

                    {/* Review Meta */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        <span>By {review.profiles?.username || 'Anonymous'}</span>
                      </div>
                      <span>{formatDate(review.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 py-2">
                Page {currentPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={reviews.length < itemsPerPage}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Reviews Found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.rating !== 'all' 
                  ? "Try adjusting your filters to see more reviews."
                  : "Be the first to write a review!"}
              </p>
              <Link to="/browse">
                <Button>
                  <Film className="h-4 w-4 mr-2" />
                  Browse Movies
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
};

export default AllReviews;
