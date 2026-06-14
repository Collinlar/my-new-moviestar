import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ThumbsUp, Calendar, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import HelpfulButton from './HelpfulButton';
import FlagModal from './FlagModal';
import { getSafeDisplayName } from '@/lib/displayName';

interface TopReview {
  id: string;
  review_text: string;
  rating: number;
  created_at: string;
  helpful_count: number;
  movie: {
    id: string;
    title: string;
    poster_url: string;
    release_year: number;
  };
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const TopReviews = () => {
  const [activeTab, setActiveTab] = useState<'top-rated' | 'most-helpful' | 'recent'>('top-rated');
  const [currentIndex, setCurrentIndex] = useState(0);
  const reviewsPerPage = 3;

  // Fetch top reviews based on active tab
  const { data: topReviews, isLoading, error } = useQuery({
    queryKey: ['top-reviews', activeTab],
    queryFn: async (): Promise<TopReview[]> => {
      try {
        // Build query with proper sorting based on tab
        let query = supabase
          .from('reviews')
          .select('*')
          .eq('status', 'approved')
          .not('review_text', 'is', null);

        // Apply different sorting based on active tab
        // Each tab prioritizes different criteria for variety
        switch (activeTab) {
          case 'top-rated':
            // Highest rated first, then by creation date for tiebreaker
            query = query
              .order('rating', { ascending: false })
              .order('created_at', { ascending: false });
            break;
          case 'most-helpful':
            // Most helpful first, filter to only reviews with helpful votes
            query = query
              .gte('helpful_count', 1)
              .order('helpful_count', { ascending: false })
              .order('rating', { ascending: false });
            break;
          case 'recent':
            // Most recent first
            query = query.order('created_at', { ascending: false });
            break;
        }

        const { data: reviews, error: reviewsError } = await query.limit(9);

        if (reviewsError) throw reviewsError;
        if (!reviews || reviews.length === 0) return [];

        // Fetch movie and profile data for each review
        const reviewsWithDetails = await Promise.all(
          reviews.map(async (review) => {
            const [{ data: movie }, { data: profile }] = await Promise.all([
              supabase
                .from('movies')
                .select('id, title, poster_url, release_year')
                .eq('id', review.movie_id)
                .single(),
              supabase
                .from('profiles')
                .select('display_name, username, avatar_url')
                .eq('user_id', review.user_id)
                .single()
            ]);

            return {
              id: review.id,
              review_text: review.review_text,
              rating: review.rating,
              created_at: review.created_at,
              helpful_count: (review as any).helpful_count || 0,
              movie: movie || { id: '', title: 'Unknown Movie', poster_url: '', release_year: 0 },
              profile: profile || { display_name: null, username: 'Anonymous', avatar_url: null }
            } as TopReview;
          })
        );

        return reviewsWithDetails;
      } catch (err) {
        console.error('Error in reviews query:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Reset carousel index when tab changes
  const handleTabChange = (tab: 'top-rated' | 'most-helpful' | 'recent') => {
    setActiveTab(tab);
    setCurrentIndex(0);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground/30'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Carousel navigation
  const totalReviews = topReviews?.length || 0;
  const maxIndex = Math.max(0, totalReviews - reviewsPerPage);
  
  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  const visibleReviews = topReviews?.slice(currentIndex, currentIndex + reviewsPerPage) || [];

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-3 animate-pulse" />
            <div className="h-4 bg-muted rounded w-80 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <p className="text-muted-foreground">Failed to load reviews</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">Community Reviews</h2>
          <p className="text-muted-foreground">
            Discover what others are saying about African cinema
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-background border border-border rounded-full p-1 shadow-sm">
            <Button
              variant={activeTab === 'top-rated' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('top-rated')}
              className="rounded-full px-4"
            >
              <Star className="h-4 w-4 mr-1.5" />
              Top Rated
            </Button>
            <Button
              variant={activeTab === 'most-helpful' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('most-helpful')}
              className="rounded-full px-4"
            >
              <ThumbsUp className="h-4 w-4 mr-1.5" />
              Most Helpful
            </Button>
            <Button
              variant={activeTab === 'recent' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('recent')}
              className="rounded-full px-4"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Recent
            </Button>
          </div>
        </div>

        {/* Reviews Carousel */}
        {topReviews && topReviews.length > 0 ? (
          <div className="relative">
            {/* Navigation Arrows */}
            {totalReviews > reviewsPerPage && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background shadow-lg border-border hover:bg-muted disabled:opacity-50 hidden md:flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={currentIndex >= maxIndex}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background shadow-lg border-border hover:bg-muted disabled:opacity-50 hidden md:flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {visibleReviews.map((review) => (
                <Card 
                  key={review.id} 
                  className="group bg-background border-border hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                >
                  <CardContent className="p-5">
                    {/* Quote Icon */}
                    <Quote className="h-6 w-6 text-primary/20 mb-3" />
                    
                    {/* Review Text */}
                    <p className="text-foreground/80 text-sm leading-relaxed mb-4 min-h-[60px]">
                      "{truncateText(review.review_text, 100)}"
                    </p>

                    {/* Movie Info - Compact */}
                    <Link 
                      to={`/movie/${review.movie?.id}`}
                      className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg mb-4 hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                        {review.movie?.poster_url ? (
                          <img
                            src={review.movie.poster_url}
                            alt={review.movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted-foreground/10" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {review.movie?.title || 'Unknown Movie'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {review.movie?.release_year}
                          </span>
                          <div className="flex items-center">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Reviewer & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={review.profile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getSafeDisplayName(review.profile?.display_name, review.profile?.username).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate max-w-[100px]">
                            {getSafeDisplayName(review.profile?.display_name, review.profile?.username)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(review.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <HelpfulButton 
                          reviewId={review.id} 
                          initialCount={review.helpful_count || 0}
                          size="sm"
                          variant="ghost"
                        />
                        <FlagModal
                          reviewId={review.id}
                          reviewText={review.review_text}
                          reviewerName={getSafeDisplayName(review.profile?.display_name, review.profile?.username)}
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Flag review</span>
                              🚩
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Write a Review CTA Card */}
              {visibleReviews.length > 0 && visibleReviews.length < 3 && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 border-dashed flex items-center justify-center min-h-[280px]">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Share Your Voice</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your review helps preserve African cinema history
                    </p>
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/movies">Write a Review</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pagination Dots (Mobile) */}
            {totalReviews > reviewsPerPage && (
              <div className="flex justify-center gap-1.5 mt-6 md:hidden">
                {Array.from({ length: Math.ceil(totalReviews / reviewsPerPage) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i * reviewsPerPage)}
                    className={`h-2 rounded-full transition-all ${
                      Math.floor(currentIndex / reviewsPerPage) === i
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {activeTab === 'most-helpful' 
                ? 'No reviews with helpful votes yet. Be the first to mark a review as helpful!'
                : 'No reviews yet. Be the first to share your thoughts!'}
            </p>
            <Button asChild size="sm">
              <Link to="/movies">Browse Movies</Link>
            </Button>
          </div>
        )}

        {/* View All Button */}
        {topReviews && topReviews.length > 0 && (
          <div className="text-center mt-10">
            <Button variant="outline" size="lg" asChild className="rounded-full px-8">
              <Link to="/all-reviews">View All Reviews</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopReviews;
