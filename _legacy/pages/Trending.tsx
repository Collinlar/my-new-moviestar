import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Loader2 } from 'lucide-react';
import { useTrendingMovies } from '@/hooks/useMovies';
import { MovieCard } from '@/components/MovieCard';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import SEOHead from '@/components/SEOHead';

const MOVIES_PER_PAGE = 20;

const Trending = () => {
  const [visibleCount, setVisibleCount] = useState(MOVIES_PER_PAGE);
  const { movies: trendingMovies, loading: trendingLoading } = useTrendingMovies(100);
  
  const visibleMovies = trendingMovies.slice(0, visibleCount);
  const hasMore = visibleCount < trendingMovies.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + MOVIES_PER_PAGE);
  };

  return (
    <>
      <SEOHead
        title="Trending Movies This Week"
        description="See what's hot in African cinema right now. Trending Nollywood and Ghallywood movies ranked by reviews, watchlist activity, and community engagement."
        keywords="trending African movies, popular Nollywood, hot movies this week, most watched African films"
        url="https://muviestars.com/trending"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                Trending Movies
              </h1>
              <p className="text-muted-foreground">Most popular movies based on recent reviews and watchlist activity</p>
            </div>
          </div>

          {/* Movies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {trendingLoading ? (
              Array.from({ length: MOVIES_PER_PAGE }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-64 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : visibleMovies.length > 0 ? (
              visibleMovies.map((movie, index) => (
                <div key={movie.id} className="relative">
                  <MovieCard 
                    id={movie.id}
                    title={movie.title}
                    year={movie.release_year}
                    genre={movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1)}
                    rating={movie.average_rating}
                    reviewCount={movie.review_count}
                    thumbnail={movie.poster_url}
                    language={movie.language.charAt(0).toUpperCase() + movie.language.slice(1)}
                  />
                  {/* Trending rank badge */}
                  <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10">
                    {index + 1}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Trending Movies</h3>
                <p className="text-muted-foreground mb-6">
                  Trending movies will appear here based on recent reviews and watchlist activity.
                </p>
                <Link to="/movies">
                  <Button>Browse All Movies</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Load More Button */}
          {!trendingLoading && hasMore && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleLoadMore} 
                variant="outline" 
                size="lg"
                className="min-w-[200px]"
              >
                Load More Movies
              </Button>
            </div>
          )}

          {/* Stats */}
          {!trendingLoading && visibleMovies.length > 0 && (
            <div className="text-center text-muted-foreground">
              <p>Showing {visibleMovies.length} of {trendingMovies.length} trending movie{trendingMovies.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Algorithm Explanation */}
          {!trendingLoading && visibleMovies.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">How Trending is Calculated</h3>
              <p className="text-muted-foreground text-sm">
                Trending movies are ranked using a combination of recent reviews (40%), 
                recent watchlist additions (30%), and overall rating quality (30%) from the last 7 days.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Trending;
