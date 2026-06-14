import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Film, Star, Calendar, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { MovieCard } from '@/components/MovieCard';
import { supabase } from '@/integrations/supabase/client';
import { Creator } from '@/hooks/useCreators';

interface CreatorMovie {
  id: string;
  title: string;
  description: string;
  genre: string;
  language: string;
  release_year: number;
  poster_url: string;
  youtube_url: string;
  average_rating: number;
  review_count: number;
}

const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [movies, setMovies] = useState<CreatorMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReviews: 0,
    totalWatchlists: 0,
    averageRating: 0,
    totalViews: 0
  });

  useEffect(() => {
    if (!id) return;

    const fetchCreatorData = async () => {
      try {
        // Fetch creator details
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('*')
          .eq('id', id)
          .single();

        if (creatorError) throw creatorError;

        // Fetch all movies by this creator
        const { data: moviesData, error: moviesError } = await supabase
          .from('movies')
          .select('*')
          .eq('creator_id', id)
          .order('release_year', { ascending: false });

        if (moviesError) throw moviesError;

        // Calculate stats
        const movieIds = moviesData?.map(m => m.id) || [];
        let totalReviews = 0;
        let totalWatchlists = 0;
        let totalRating = 0;
        let totalMovies = moviesData?.length || 0;

        if (movieIds.length > 0) {
          // Get total reviews
          const { count: reviewCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .in('movie_id', movieIds);

          // Get total watchlists
          const { count: watchlistCount } = await supabase
            .from('watchlists')
            .select('*', { count: 'exact', head: true })
            .in('movie_id', movieIds);

          totalReviews = reviewCount || 0;
          totalWatchlists = watchlistCount || 0;
          totalRating = moviesData?.reduce((sum, movie) => sum + (movie.average_rating || 0), 0) || 0;
        }

        setCreator(creatorData);
        setMovies(moviesData || []);
        setStats({
          totalReviews,
          totalWatchlists,
          averageRating: totalMovies > 0 ? totalRating / totalMovies : 0,
          totalViews: totalMovies * 1000 // Mock view count
        });
      } catch (error) {
        console.error('Error fetching creator data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-muted rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-96 bg-muted rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Creator not found</h1>
            <Link to="/creators">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Creators
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>{creator.name} - Creator Profile - MuvieStars.com</title>
        <meta name="description" content={`Discover ${creator.name}, a talented filmmaker behind ${movies.length} African movies. Explore their filmography, ratings, and reviews.`} />
        <meta property="og:title" content={`${creator.name} - Creator Profile - MuvieStars.com`} />
        <meta property="og:description" content={`Discover ${creator.name}, a talented filmmaker behind ${movies.length} African movies.`} />
        <meta property="og:image" content={creator.image_url || ''} />
        <meta property="og:type" content="profile" />
        <link rel="canonical" href={`${window.location.origin}/creator/${creator.id}`} />
      </head>

      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
          {/* Back Navigation */}
          <Link to="/creators" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Creators
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Creator Header */}
              <Card className="border-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={creator.image_url || ''} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {creator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-foreground mb-2">{creator.name}</h1>
                      
                      {creator.bio && (
                        <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                          {creator.bio}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{movies.length}</div>
                          <div className="text-sm text-muted-foreground">Movies</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.totalReviews}</div>
                          <div className="text-sm text-muted-foreground">Reviews</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.totalWatchlists}</div>
                          <div className="text-sm text-muted-foreground">Watchlists</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.averageRating.toFixed(1)}</div>
                          <div className="text-sm text-muted-foreground">Avg Rating</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Movies Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Film className="h-6 w-6 text-primary" />
                    Filmography ({movies.length})
                  </h2>
                </div>

                {movies.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {movies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        id={movie.id}
                        title={movie.title}
                        year={movie.release_year}
                        genre={formatGenre(movie.genre)}
                        rating={movie.average_rating}
                        reviewCount={movie.review_count}
                        thumbnail={movie.poster_url}
                        language={formatLanguage(movie.language)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No movies yet</h3>
                      <p className="text-muted-foreground">
                        {creator.name} hasn't added any movies to their filmography yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Creator Info Card */}
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Creator Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={creator.image_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {creator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{creator.name}</p>
                      <p className="text-sm text-muted-foreground">Filmmaker</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Joined {new Date(creator.created_at).getFullYear()}</span>
                    </div>
                    
                    {movies.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span>Average Rating: {stats.averageRating.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Movies</span>
                    <span className="font-medium">{movies.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Reviews</span>
                    <span className="font-medium">{stats.totalReviews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Watchlists</span>
                    <span className="font-medium">{stats.totalWatchlists}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Views</span>
                    <span className="font-medium">{stats.totalViews.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreatorProfile;
