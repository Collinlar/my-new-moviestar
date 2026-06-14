import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useFeaturedMovies } from '@/hooks/useMovies';
import { MovieCard } from '@/components/MovieCard';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import SEOHead from '@/components/SEOHead';

const Featured = () => {
  const { movies: featuredMovies, loading: featuredLoading } = useFeaturedMovies(20); // Show more movies on dedicated page

  return (
    <>
      <SEOHead
        title="Featured Movies - Editor's Picks"
        description="Explore our handpicked selection of the best African movies. Curated featured films from Nollywood, Ghallywood, and pan-African cinema chosen by our editors."
        keywords="featured African movies, best Nollywood films, editor picks, curated African cinema, top rated movies"
        url="https://muviestars.com/featured"
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
            <h1 className="text-3xl font-bold text-foreground">Featured Movies</h1>
            <p className="text-muted-foreground">Handpicked selections from our curators</p>
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {featuredLoading ? (
            // Loading skeletons
            Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-muted rounded-lg h-64 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : featuredMovies.length > 0 ? (
            featuredMovies.map((movie) => (
              <MovieCard 
                key={movie.id} 
                id={movie.id}
                title={movie.title}
                year={movie.release_year}
                genre={movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1)}
                rating={movie.average_rating}
                reviewCount={movie.review_count}
                thumbnail={movie.poster_url}
                language={movie.language.charAt(0).toUpperCase() + movie.language.slice(1)}
              />
            ))
          ) : (
            // No featured movies message
            <div className="col-span-full text-center py-20">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Featured Movies</h3>
              <p className="text-muted-foreground mb-6">
                Featured movies will appear here once they are marked as featured by administrators.
              </p>
              <Link to="/movies">
                <Button>Browse All Movies</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats */}
        {!featuredLoading && featuredMovies.length > 0 && (
          <div className="text-center text-muted-foreground">
            <p>Showing {featuredMovies.length} featured movie{featuredMovies.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default Featured;
