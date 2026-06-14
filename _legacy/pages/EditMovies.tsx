import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Film, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Search,
  Plus,
  Eye,
  Star,
  Calendar,
  Globe,
  Users,
  Video,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const EditMovies = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  // Check if user is admin
  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to edit movies.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch all movies
  const { data: movies, isLoading, refetch } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Delete movie mutation
  const deleteMovieMutation = useMutation({
    mutationFn: async (movieId: string) => {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieId);
      
      if (error) throw error;
      return movieId;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Movie has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete movie",
        variant: "destructive",
      });
    },
  });

  const handleDeleteMovie = (movieId: string, movieTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${movieTitle}"? This action cannot be undone.`)) {
      deleteMovieMutation.mutate(movieId);
    }
  };

  // Filter movies based on search and filters
  const filteredMovies = movies?.filter(movie => {
    const matchesSearch = movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movie.description && movie.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGenre = selectedGenre === 'all' || movie.genre === selectedGenre;
    const matchesLanguage = selectedLanguage === 'all' || movie.language === selectedLanguage;
    
    return matchesSearch && matchesGenre && matchesLanguage;
  }) || [];

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manage Movies</h1>
              <p className="text-muted-foreground">Edit, delete, and manage existing movies</p>
            </div>
          </div>
          <Link to="/admin/movies/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Movie
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Film className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{movies?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Movies</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{movies?.filter(m => m.featured).length || 0}</div>
              <div className="text-sm text-muted-foreground">Featured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">
                {movies?.filter(m => m.release_year === new Date().getFullYear()).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">This Year</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Globe className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold">
                {new Set(movies?.map(m => m.language) || []).size}
              </div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Movies</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Genres</option>
                  {['action', 'comedy', 'drama', 'romance', 'thriller', 'horror', 'adventure', 'family', 'documentary', 'musical', 'historical', 'sci-fi', 'fantasy', 'western', 'war', 'crime', 'mystery', 'animation'].map((genre) => (
                    <option key={genre} value={genre}>
                      {formatGenre(genre)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Languages</option>
                  {['english', 'yoruba', 'igbo', 'hausa', 'twi', 'french', 'swahili', 'spanish', 'portuguese', 'arabic', 'chinese', 'japanese', 'korean', 'hindi', 'other'].map((lang) => (
                    <option key={lang} value={lang}>
                      {formatLanguage(lang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movies List */}
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
        ) : filteredMovies.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {filteredMovies.length} movie{filteredMovies.length !== 1 ? 's' : ''} found
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMovies.map((movie) => (
                <Card key={movie.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="aspect-[3/4] overflow-hidden rounded-t-lg">
                      <img
                        src={movie.poster_url || '/placeholder.svg'}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Link to={`/movie/${movie.id}`}>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <Link to={`/admin/movies/edit/${movie.id}`}>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDeleteMovie(movie.id, movie.title)}
                        disabled={deleteMovieMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Featured Badge */}
                    {movie.featured && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-yellow-500 text-yellow-900 border-yellow-600">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {movie.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {movie.release_year}
                        </span>
                        <span className="flex items-center gap-1">
                          <Film className="h-3 w-3" />
                          {formatGenre(movie.genre)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {formatLanguage(movie.language)}
                        </span>
                      </div>

                      {movie.average_rating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < Math.floor(movie.average_rating)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {movie.average_rating.toFixed(1)} ({movie.review_count} reviews)
                          </span>
                        </div>
                      )}

                      {movie.director && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Director:</strong> {movie.director}
                        </p>
                      )}

                      {movie.country && (
                        <p className="text-xs text-muted-foreground">
                          <strong>Country:</strong> {movie.country}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Added {new Date(movie.created_at).toLocaleDateString()}
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
              <h3 className="text-xl font-semibold text-foreground mb-2">No movies found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedGenre !== 'all' || selectedLanguage !== 'all'
                  ? 'Try adjusting your search criteria or filters.'
                  : 'No movies have been added yet.'}
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setSelectedGenre('all');
                  setSelectedLanguage('all');
                }}>
                  Clear Filters
                </Button>
                <Link to="/admin/movies/add">
                  <Button>Add First Movie</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EditMovies;
