import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Trash2, Search, Filter, SortAsc, SortDesc, Film, Star, Calendar, Globe, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Watchlist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    search: '',
    genre: 'all',
    language: 'all',
    yearFrom: '',
    yearTo: '',
    favoritesOnly: false
  });
  
  const [sortBy, setSortBy] = useState<'added_at' | 'title' | 'release_year' | 'rating'>('added_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch user's watchlist
  const { data: watchlist, isLoading, refetch, error } = useQuery({
    queryKey: ['user-watchlist', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');



      // Get watchlist entries with movie details in a single query
      let query = supabase
        .from('watchlists')
        .select(`
          *,
          movie:movies(
            id, 
            title, 
            poster_url, 
            release_year, 
            genre, 
            language, 
            average_rating, 
            review_count
          )
        `)
        .eq('user_id', user.id);

      // Apply favorites filter
      if (filters.favoritesOnly) {
        query = query.eq('is_favorite', true);
      }

      const { data: watchlistData, error: watchlistError } = await query;
      
      if (watchlistError) throw watchlistError;
      if (!watchlistData || watchlistData.length === 0) {
        return [];
      }

      // Filter and sort the combined data
      let filteredData = watchlistData.filter(item => {
        const movie = item.movie;
        if (!movie) return false;

        // Apply search filter
        if (filters.search && !movie.title.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }

        // Apply genre filter
        if (filters.genre && filters.genre !== 'all' && movie.genre !== filters.genre) {
          return false;
        }

        // Apply language filter
        if (filters.language && filters.language !== 'all' && movie.language !== filters.language) {
          return false;
        }

        // Apply year range filters
        if (filters.yearFrom && movie.release_year < parseInt(filters.yearFrom)) {
          return false;
        }
        if (filters.yearTo && movie.release_year > parseInt(filters.yearTo)) {
          return false;
        }

        return true;
      });

      // Sort the filtered data
      filteredData.sort((a, b) => {
        const movieA = a.movie;
        const movieB = b.movie;
        
        if (!movieA || !movieB) return 0;

        let aValue: any, bValue: any;

        switch (sortBy) {
          case 'title':
            aValue = movieA.title.toLowerCase();
            bValue = movieB.title.toLowerCase();
            break;
          case 'release_year':
            aValue = movieA.release_year;
            bValue = movieB.release_year;
            break;
          case 'rating':
            aValue = movieA.average_rating;
            bValue = movieB.average_rating;
            break;
          case 'added_at':
          default:
            aValue = new Date(a.added_at);
            bValue = new Date(b.added_at);
            break;
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      return filteredData;
    },
    enabled: !!user,
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (watchlistId: string) => {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId);
      
      if (error) throw error;
      return watchlistId;
    },
    onSuccess: () => {
      toast({
        title: "Removed from watchlist",
        description: "Movie has been removed from your watchlist",
      });
      queryClient.invalidateQueries({ queryKey: ['user-watchlist', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from watchlist",
        variant: "destructive",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ watchlistId, isFavorite }: { watchlistId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('watchlists')
        .update({ is_favorite: !isFavorite })
        .eq('id', watchlistId);
      
      if (error) throw error;
      return { watchlistId, isFavorite: !isFavorite };
    },
    onSuccess: (data) => {
      toast({
        title: data.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        description: data.isFavorite 
          ? "Movie marked as favorite" 
          : "Movie removed from favorites",
      });
      queryClient.invalidateQueries({ queryKey: ['user-watchlist', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromWatchlist = (watchlistId: string) => {
    removeFromWatchlistMutation.mutate(watchlistId);
  };

  const handleToggleFavorite = (watchlistId: string, isFavorite: boolean) => {
    toggleFavoriteMutation.mutate({ watchlistId, isFavorite });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      genre: 'all',
      language: 'all',
      yearFrom: '',
      yearTo: '',
      favoritesOnly: false
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
              <p className="mt-2 text-muted-foreground">Please sign in to view your watchlist.</p>
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
          <h1 className="text-4xl font-bold text-foreground mb-2">My Watchlist</h1>
          <p className="text-lg text-muted-foreground">
            Manage your movie collection and favorites
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            {error && (
              <Badge variant="destructive" className="text-xs">
                Error: {error.message}
              </Badge>
            )}
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Search Movies</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <Select value={filters.genre} onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Genres" />
                  </SelectTrigger>
                  <SelectContent>
                                         <SelectItem value="all">All Genres</SelectItem>
                    {['action', 'comedy', 'drama', 'romance', 'thriller', 'horror', 'adventure', 'family', 'documentary', 'musical', 'historical'].map((genre) => (
                      <SelectItem key={genre} value={genre}>{formatGenre(genre)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select value={filters.language} onValueChange={(value) => setFilters(prev => ({ ...prev, language: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                                         <SelectItem value="all">All Languages</SelectItem>
                    {['english', 'yoruba', 'igbo', 'hausa', 'twi', 'french', 'swahili', 'other'].map((language) => (
                      <SelectItem key={language} value={language}>{formatLanguage(language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Year From</label>
                <Input
                  type="number"
                  placeholder="1990"
                  value={filters.yearFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, yearFrom: e.target.value }))}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Year To</label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={filters.yearTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, yearTo: e.target.value }))}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>

              {/* Favorites Only */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="favorites-only"
                  checked={filters.favoritesOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, favoritesOnly: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="favorites-only" className="text-sm font-medium">Favorites Only</label>
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
                  <SelectItem value="added_at">Date Added</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="release_year">Release Year</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
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



        {/* Watchlist Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : watchlist && watchlist.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {watchlist.length} movie{watchlist.length !== 1 ? 's' : ''} in your watchlist
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchlist.map((item) => (
                <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="aspect-[3/4] overflow-hidden rounded-t-lg">
                      <img
                        src={item.movie.poster_url || '/placeholder.svg'}
                        alt={item.movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        size="sm"
                        variant={item.is_favorite ? "default" : "secondary"}
                        onClick={() => handleToggleFavorite(item.id, item.is_favorite)}
                        disabled={toggleFavoriteMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Heart className={`h-4 w-4 ${item.is_favorite ? 'fill-current' : ''}`} />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveFromWatchlist(item.id)}
                        disabled={removeFromWatchlistMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Favorites Badge */}
                    {item.is_favorite && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground">
                          <Heart className="h-3 w-3 mr-1 fill-current" />
                          Favorite
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        <Link to={`/movie/${item.movie.id}`} className="hover:underline">
                          {item.movie.title}
                        </Link>
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.movie.release_year}
                        </span>
                        <span className="flex items-center gap-1">
                          <Film className="h-3 w-3" />
                          {formatGenre(item.movie.genre)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {formatLanguage(item.movie.language)}
                        </span>
                      </div>

                      {item.movie.average_rating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(item.movie.average_rating)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {item.movie.average_rating.toFixed(1)} ({item.movie.review_count} reviews)
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Added {new Date(item.added_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Your watchlist is empty</h3>
              <p className="text-muted-foreground mb-4">
                Start building your collection by adding movies you want to watch!
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/browse">
                  <Button>Browse Movies</Button>
                </Link>
                <Link to="/favorites">
                  <Button variant="outline">View Favorites</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
