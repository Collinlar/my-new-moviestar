import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ThumbsUp, MessageCircle, Calendar, TrendingUp, Filter, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import HelpfulButton from './HelpfulButton';
import FlagModal from './FlagModal';

interface MovieReview {
  id: string;
  review_text: string;
  rating: number;
  created_at: string;
  helpful_count?: number;
  flag_count?: number;
  profile: {
    display_name: string;
    avatar_url: string;
  };
}

interface MovieReviewsProps {
  movieId: string;
  movieTitle: string;
}

const MovieReviews = ({ movieId, movieTitle }: MovieReviewsProps) => {
  const [activeTab, setActiveTab] = useState<'top-rated' | 'most-helpful' | 'recent'>('top-rated');
  const [showFilters, setShowFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  // Fetch reviews for specific movie based on active tab and filters
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ['movie-reviews', movieId, activeTab, ratingFilter],
    queryFn: async (): Promise<MovieReview[]> => {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          review_text,
          rating,
          created_at,
          profile:profiles(display_name, avatar_url)
        `)
        .eq('movie_id', movieId)
        .not('review_text', 'is', null);

      // Apply rating filter if set
      if (ratingFilter) {
        query = query.eq('rating', ratingFilter);
      }

      // Apply different sorting based on active tab
      switch (activeTab) {
        case 'top-rated':
          query = query.order('rating', { ascending: false });
          break;
        case 'most-helpful':
          // Since we don't have helpful_count, sort by rating then date
          query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
          break;
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      return data || [];
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
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

  const getRatingStats = () => {
    if (!reviews) return { average: 0, total: 0, distribution: {} };
    
    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    return { average: Math.round(average * 10) / 10, total, distribution };
  };

  const { average, total, distribution } = getRatingStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Reviews</h3>
          <p className="text-muted-foreground">
            {total} review{total !== 1 ? 's' : ''} • Average rating: {average}/5
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Rating Distribution */}
      {total > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Rating Distribution</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating] || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Filter by Rating</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={ratingFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRatingFilter(null)}
            >
              All Ratings
            </Button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={ratingFilter === rating ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRatingFilter(rating)}
              >
                {rating} Star{rating !== 1 ? 's' : ''}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'top-rated' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('top-rated')}
            className="rounded-md"
          >
            <Star className="h-4 w-4 mr-2" />
            Top Rated
          </Button>
          <Button
            variant={activeTab === 'most-helpful' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('most-helpful')}
            className="rounded-md"
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Top Rated + Recent
          </Button>
          <Button
            variant={activeTab === 'recent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('recent')}
            className="rounded-md"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Recent
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {review.profile?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {review.profile?.display_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                        <span className="text-sm text-muted-foreground ml-1">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(review.created_at)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {review.review_text}
                </p>
                                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{review.helpful_count || 0}</span>
                      </div>
                                           <div className="flex items-center gap-1 text-muted-foreground">
                       <Flag className="h-4 w-4" />
                       <span>{review.flag_count || 0}</span>
                     </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <HelpfulButton 
                        reviewId={review.id} 
                        initialCount={review.helpful_count || 0}
                        size="sm"
                        variant="ghost"
                      />
                                             <FlagModal
                         reviewId={review.id}
                         reviewText={review.review_text}
                         reviewerName={review.profile?.display_name || 'Anonymous'}
                         trigger={
                           <Button variant="ghost" size="sm">
                             <Flag className="h-4 w-4 mr-2" />
                             Flag
                           </Button>
                         }
                       />
                    </div>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No reviews yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Be the first to share your thoughts on "{movieTitle}"!
          </p>
          <Button asChild>
            <Link to={`/movie/${movieId}/review`}>Write a Review</Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default MovieReviews;
