import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, Globe, User, ArrowLeft, Users, Video, Award, Film, ExternalLink, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ReviewForm } from '@/components/ReviewForm';
import { WatchlistButton } from '@/components/WatchlistButton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MovieReviewsSimple from '@/components/MovieReviewsSimple';
import { Breadcrumb } from '@/components/Breadcrumb';
import SEOHead, { generateMovieSchema } from '@/components/SEOHead';

interface Movie {
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
  creator: {
     id: string;
    name: string;
    image_url?: string;
   };
  // Enhanced fields
  director?: string;
  producer?: string;
  writer?: string;
  country?: string;
  rating?: string;
  synopsis?: string;
  tagline?: string;
  keywords?: string;
  content_warning?: string;
  featured?: boolean;
  is_featured?: boolean;
  // Phase 1: Repository-first fields
  original_title?: string;
  production_company?: string;
  distribution_status?: 'cinema' | 'streaming' | 'dvd' | 'tv' | 'unavailable';
  is_streaming_available?: boolean;
  festivals?: string;
  cultural_context?: string;
  // Editorial content
  editor_note?: string;
}

interface CastMember {
  id: string;
  name: string;
  role: string;
  character?: string;
}

interface CrewMember {
  id: string;
  name: string;
  role: string;
  department: string;
}

interface Trailer {
  id: string;
  title: string;
  url: string;
  type: 'teaser' | 'trailer' | 'behind-the-scenes';
}

interface Award {
  id: string;
  name: string;
  category: string;
  year: number;
  won: boolean;
}

interface RelatedMovie {
  id: string;
  related_movie_id: string;
  relationship_type: 'sequel' | 'prequel' | 'remake' | 'similar' | 'franchise';
  movies: {
    id: string;
    title: string;
    poster_url: string;
    release_year: number;
    genre: string;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  helpful_count?: number;
  flag_count?: number;
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
}

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<RelatedMovie[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchMovieData = async () => {
      try {
        // Fetch movie details first
        const { data: movieData, error: movieError } = await supabase
          .from('movies')
          .select('*')
          .eq('id', id)
          .single();

        if (movieError) throw movieError;

        // Fetch creator details separately if creator_id exists
        let creatorData = null;
        if (movieData.creator_id) {
          const { data: creator } = await supabase
            .from('creators')
            .select('id, name, image_url')
            .eq('id', movieData.creator_id)
            .single();
          creatorData = creator;
        }

        // Combine movie and creator data
        const movieWithCreator = {
          ...movieData,
          creator: creatorData
        };

        // Fetch enhanced movie data
        const [castData, crewData, trailersData, awardsData, relatedData] = await Promise.all([
          supabase.from('movie_cast').select('*').eq('movie_id', id),
          supabase.from('movie_crew').select('*').eq('movie_id', id),
          supabase.from('movie_trailers').select('*').eq('movie_id', id),
          supabase.from('movie_awards').select('*').eq('movie_id', id),
          supabase.from('movie_related').select(`
            *,
            movies(id, title, poster_url, release_year, genre)
          `).eq('movie_id', id)
        ]);

        // Fetch reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('movie_id', id)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        // For each review, fetch the corresponding profile
        const reviewsWithProfiles = await Promise.all(
          (reviewsData || []).map(async (review) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', review.user_id)
              .maybeSingle();
            
            return {
              ...review,
              profiles: profile || { display_name: 'Anonymous', avatar_url: undefined }
            };
          })
        );

        setMovie(movieWithCreator);
        setCast(castData.data || []);
        setCrew(crewData.data || []);
        setTrailers((trailersData.data || []) as unknown as Trailer[]);
        setAwards(awardsData.data || []);
        setRelatedMovies((relatedData.data || []) as unknown as RelatedMovie[]);
        setReviews(reviewsWithProfiles);
      } catch (error) {
        console.error('Error fetching movie data:', error);
        console.error('Movie ID:', id);
        toast({
          title: "Error",
          description: `Failed to load movie data: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMovieData();
  }, [id, toast]);

  const handleReviewAdded = () => {
    // Refresh reviews
    window.location.reload();
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : i < rating
            ? 'fill-yellow-400/50 text-yellow-400'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-20 bg-muted rounded"></div>
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

  if (!movie) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Movie not found</h1>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Generate dynamic SEO description based on movie data
  const generateSEODescription = () => {
    const genre = formatGenre(movie.genre);
    const language = formatLanguage(movie.language);
    const ratingText = movie.average_rating > 0 
      ? `Rated ${movie.average_rating.toFixed(1)}/5 by ${movie.review_count} viewers.` 
      : '';
    const directorText = movie.director ? `Directed by ${movie.director}.` : '';
    const baseDescription = movie.synopsis || movie.description || '';
    
    // Create a unique, keyword-rich description
    let description = `${movie.title} (${movie.release_year}) - ${genre} ${language} African movie. ${directorText} ${ratingText}`;
    
    // Add truncated synopsis if available
    if (baseDescription) {
      const remainingChars = 155 - description.length;
      if (remainingChars > 30) {
        description += ` ${baseDescription.substring(0, remainingChars - 3)}...`;
      }
    }
    
    return description.trim();
  };

  // Generate dynamic keywords
  const generateKeywords = () => {
    const keywords = [
      movie.title,
      `${movie.title} movie`,
      `${movie.title} ${movie.release_year}`,
      formatGenre(movie.genre),
      `${formatGenre(movie.genre)} movies`,
      formatLanguage(movie.language),
      `${formatLanguage(movie.language)} movies`,
      'African movies',
      'Nollywood',
      movie.director,
      movie.creator?.name,
    ].filter(Boolean);
    
    // Add custom keywords if available
    if (movie.keywords) {
      keywords.push(...movie.keywords.split(',').map(k => k.trim()));
    }
    
    return [...new Set(keywords)].join(', ');
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOHead
        title={`${movie.title} (${movie.release_year}) - ${formatGenre(movie.genre)} African Movie`}
        description={generateSEODescription()}
        image={movie.poster_url}
        url={`https://muviestars.com/movie/${movie.id}`}
        type="video.movie"
        keywords={generateKeywords()}
        schema={generateMovieSchema(movie)}
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumb 
            items={[
              { label: "Movies", href: "/movies" },
              { label: movie.title }
            ]} 
          />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* PRD Layout: Title, Year, Country, Language FIRST */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">{movie.title}</h1>
                  {movie.original_title && movie.original_title !== movie.title && (
                    <p className="text-lg text-muted-foreground mb-4">
                      Original title: {movie.original_title}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {movie.release_year}
                    </Badge>
                    
                    {movie.country && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {movie.country}
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="flex items-center gap-1">
                      {formatLanguage(movie.language)}
                    </Badge>
                    
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                      {formatGenre(movie.genre)}
                    </Badge>

                    {movie.featured && (
                      <Badge className="bg-yellow-500 text-white">
                        Featured
                      </Badge>
                    )}
                  </div>

                  {movie.tagline && (
                    <p className="text-lg font-medium text-primary italic mb-4">
                      "{movie.tagline}"
                    </p>
                  )}
                </div>

                {/* PRD Layout: Synopsis SECOND */}
                <Card>
                  <CardHeader>
                    <CardTitle>Synopsis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {movie.synopsis || movie.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Editor's Note - Styled callout for curated commentary */}
                {movie.editor_note && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Quote className="h-5 w-5" />
                        Editor's Note
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground leading-relaxed italic">
                        "{movie.editor_note}"
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Ratings Summary */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {renderStars(movie.average_rating)}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {movie.average_rating}/5 ({movie.review_count} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Enhanced Movie Information Tabs */}
              <Tabs defaultValue="cast" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="cast">Cast & Crew</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="media">Where to Watch</TabsTrigger>
                  <TabsTrigger value="awards">Awards</TabsTrigger>
                </TabsList>

                {/* Cast & Crew Tab - PRD: Cast & crew THIRD */}
                <TabsContent value="cast" className="space-y-6">
                  {cast.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Cast
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cast.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {member.character ? `as ${member.character}` : member.role}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {crew.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Crew
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {crew.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {member.role} • {member.department}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {cast.length === 0 && crew.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No cast and crew information available yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Details Tab - Production info, cultural context */}
                <TabsContent value="details" className="space-y-6">

                  {/* Production Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {movie.director && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Director</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">{movie.director}</p>
                        </CardContent>
                      </Card>
                    )}

                    {movie.producer && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Producer</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">{movie.producer}</p>
                        </CardContent>
                      </Card>
                    )}

                    {movie.writer && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Writer</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">{movie.writer}</p>
                        </CardContent>
                      </Card>
                    )}

                    {movie.production_company && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Production Company</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">{movie.production_company}</p>
                        </CardContent>
                      </Card>
                    )}

                    {movie.rating && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Content Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium">{movie.rating}</p>
                        </CardContent>
                      </Card>
                    )}

                    {movie.keywords && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm text-muted-foreground">Keywords</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {movie.keywords.split(',').map((keyword, index) => (
                              <Badge key={index} variant="outline">
                                {keyword.trim()}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Cultural Context & Festivals - PRD requirement */}
                  {movie.cultural_context && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Cultural Context</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{movie.cultural_context}</p>
                      </CardContent>
                    </Card>
                  )}

                  {movie.festivals && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Film Festivals</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{movie.festivals}</p>
                      </CardContent>
                    </Card>
                  )}

                  {movie.content_warning && (
                    <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
                      <CardHeader>
                        <CardTitle className="text-orange-800 dark:text-orange-200">Content Warning</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-orange-700 dark:text-orange-300">{movie.content_warning}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Where to Watch Tab - PRD: "Where to Watch" label, appears AFTER content */}
                <TabsContent value="media" className="space-y-6">
                  {/* Distribution Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Where to Watch
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {movie.is_streaming_available && movie.distribution_status === 'streaming' ? (
                        <div className="space-y-4">
                          <Badge className="bg-green-500 text-white">Available for Streaming</Badge>
                          {movie.youtube_url && (
                            <Button asChild className="w-full">
                              <a href={movie.youtube_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Watch Now
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {movie.distribution_status === 'cinema' && 'In Cinemas'}
                              {movie.distribution_status === 'dvd' && 'Available on DVD'}
                              {movie.distribution_status === 'tv' && 'Available on TV'}
                              {(movie.distribution_status === 'unavailable' || !movie.distribution_status) && 'Not Currently Available'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            This movie is not currently available for online streaming. Check back later for updates on availability.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Trailers */}
                  {trailers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Trailers & Clips</h3>
                      {trailers.map((trailer) => (
                        <Card key={trailer.id}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <Video className="h-4 w-4" />
                              {trailer.title}
                              <Badge variant="outline" className="ml-auto">
                                {trailer.type}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="aspect-video bg-muted rounded-lg mb-4">
                              <iframe
                                src={getYouTubeEmbedUrl(trailer.url)}
                                title={trailer.title}
                                className="w-full h-full rounded-lg"
                                allowFullScreen
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Main trailer/video if no separate trailers */}
                  {trailers.length === 0 && movie.youtube_url && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Official Trailer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video">
                          <iframe
                            src={getYouTubeEmbedUrl(movie.youtube_url)}
                            title={movie.title}
                            className="w-full h-full rounded-lg"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                {/* Awards Tab */}
                <TabsContent value="awards" className="space-y-6">
                  {awards.length > 0 ? (
                    <div className="space-y-4">
                      {awards.map((award) => (
                        <Card key={award.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{award.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {award.category} • {award.year}
                                </p>
                              </div>
                              <Badge variant={award.won ? "default" : "secondary"}>
                                {award.won ? "Won" : "Nominated"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No awards information available yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

                {/* Related Movies */}
                {relatedMovies.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        Related Movies
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {relatedMovies
                          .filter(
                            (
                              related
                            ): related is RelatedMovie & {
                              movies: NonNullable<RelatedMovie["movies"]>;
                            } => Boolean(related.movies)
                          )
                          .map((related) => (
                            <Link key={related.id} to={`/movie/${related.movies.id}`}>
                              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                  <div className="aspect-[3/4] bg-muted rounded-lg mb-3 overflow-hidden">
                                    {related.movies.poster_url ? (
                                      <img
                                        src={related.movies.poster_url}
                                        alt={related.movies.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <Film className="h-8 w-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm line-clamp-2">{related.movies.title}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {related.relationship_type}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {related.movies.release_year}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Creator Info */}
                {movie.creator ? (
                  <Card className="border-primary/10 hover:shadow-md transition-shadow cursor-pointer">
                    <Link to={`/creator/${movie.creator.id}`}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Creator
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={movie.creator.image_url} />
                            <AvatarFallback>{movie.creator.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground hover:text-primary transition-colors">{movie.creator.name}</p>
                            <p className="text-sm text-muted-foreground">Click to view full profile</p>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ) : (
                  <Card className="border-primary/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Creator
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">No creator profile linked for this title.</p>
                    </CardContent>
                  </Card>
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Movie Poster */}
              <Card className="overflow-hidden border-primary/10 shadow-glow">
                <div className="aspect-[3/4] relative">
                  <img
                    src={movie.poster_url}
                    alt={`${movie.title} poster`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-bold text-lg mb-2">{movie.title}</h3>
                    <div className="flex items-center gap-1">
                      {renderStars(movie.average_rating)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Watchlist Button */}
              <WatchlistButton 
                movieId={id!}
                movieTitle={movie.title}
                variant="outline" 
                size="default" 
                showText={true}
              />


              {/* Rate Movie Button */}
              {user ? (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    // Scroll to review form
                    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Rate & Review
                </Button>
              ) : (
                <Link to="/auth">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                    <Star className="h-4 w-4 mr-2" />
                    Sign in to Review
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Add Review Form */}
          <div id="review-form" className="mt-12">
            <ReviewForm movieId={id!} onReviewAdded={handleReviewAdded} />
          </div>

          {/* Enhanced Reviews Section */}
          <div className="mt-8">
            <MovieReviewsSimple reviews={reviews} movieId={id!} movieTitle={movie.title} />
          </div>
        </div>
      </div>
    </>
  );
};

export default MovieDetail;