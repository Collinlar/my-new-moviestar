import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, Film, Calendar, Globe, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Movie {
  id: string;
  title: string;
  description: string;
  release_year: number;
  genre: string;
  language: string;

  poster_url: string;
  youtube_url: string;
  creator_id: string | null;
  average_rating: number;
  review_count: number;
  created_at: string;
  featured: boolean;
}

interface Creator {
  id: string;
  name: string;
  image_url: string | null;
}

const EditMovie = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    release_year: new Date().getFullYear(),
    genre: '',
    language: '',
    poster_url: '',
    youtube_url: '',
    creator_id: 'none',
    featured: false,
    editor_note: ''
  });

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch movie data
  const { data: movie, isLoading: movieLoading, error: movieError } = useQuery({
    queryKey: ['movie', id],
    queryFn: async () => {
      if (!id) throw new Error('No movie ID provided');
      
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user && isAdmin,
  });

  // Fetch creators for dropdown
  const { data: creators } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, name, image_url')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdmin,
  });

  // Update form data when movie is loaded
  useEffect(() => {
    if (movie) {
      setFormData({
        title: movie.title || '',
        description: movie.description || '',
        release_year: movie.release_year || new Date().getFullYear(),
        genre: movie.genre || '',
        language: movie.language || '',
        poster_url: movie.poster_url || '',
        youtube_url: movie.youtube_url || '',
        creator_id: movie.creator_id || 'none',
        featured: movie.featured || false,
        editor_note: movie.editor_note || ''
      });
    }
  }, [movie]);

  // Update movie mutation
  const updateMovieMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No movie ID provided');
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        release_year: formData.release_year,
        genre: formData.genre as any,
        language: formData.language as any,
        poster_url: formData.poster_url,
        youtube_url: formData.youtube_url,
        creator_id: (formData.creator_id === 'none' || formData.creator_id === '' || !formData.creator_id) ? null : formData.creator_id,
        featured: formData.featured,
        editor_note: formData.editor_note || null
      };

      console.log('Updating movie with data:', updateData);
      console.log('Original creator_id value:', formData.creator_id);

      const { data, error } = await supabase
        .from('movies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Movie updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      navigate('/admin/movies/edit');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMovieMutation.mutate();
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  if (movieLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading movie...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Movie Not Found</h2>
              <p className="mt-2 text-muted-foreground">The movie you're looking for doesn't exist.</p>
              <Link to="/admin/movies/edit">
                <Button className="mt-4">Back to Movie List</Button>
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
        <div className="flex items-center gap-3">
          <Link to="/admin/movies/edit">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Movie List
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Movie</h1>
            <p className="text-muted-foreground">Update movie information</p>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Movie Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="md:col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Movie title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Movie description"
                    rows={4}
                    required
                  />
                </div>

                {/* Release Year */}
                <div>
                  <Label htmlFor="release_year">Release Year *</Label>
                  <Input
                    id="release_year"
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => handleInputChange('release_year', parseInt(e.target.value))}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                {/* Genre */}
                <div>
                  <Label htmlFor="genre">Genre *</Label>
                  <Select 
                    value={formData.genre} 
                    onValueChange={(value) => handleInputChange('genre', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="horror">Horror</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="documentary">Documentary</SelectItem>
                      <SelectItem value="musical">Musical</SelectItem>
                      <SelectItem value="historical">Historical</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="western">Western</SelectItem>
                      <SelectItem value="war">War</SelectItem>
                      <SelectItem value="crime">Crime</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="animation">Animation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language */}
                <div>
                  <Label htmlFor="language">Language *</Label>
                  <Select 
                    value={formData.language} 
                    onValueChange={(value) => handleInputChange('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="portuguese">Portuguese</SelectItem>
                      <SelectItem value="russian">Russian</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="korean">Korean</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="arabic">Arabic</SelectItem>
                      <SelectItem value="hindi">Hindi</SelectItem>
                      <SelectItem value="yoruba">Yoruba</SelectItem>
                      <SelectItem value="igbo">Igbo</SelectItem>
                      <SelectItem value="hausa">Hausa</SelectItem>
                      <SelectItem value="swahili">Swahili</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>



                {/* Creator */}
                <div>
                  <Label htmlFor="creator_id">Creator</Label>
                  <Select 
                    value={formData.creator_id} 
                    onValueChange={(value) => handleInputChange('creator_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select creator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Creator</SelectItem>
                      {creators?.map((creator) => (
                        <SelectItem key={creator.id} value={creator.id}>
                          {creator.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Poster URL */}
                <div className="md:col-span-2">
                  <Label htmlFor="poster_url">Poster URL</Label>
                  <Input
                    id="poster_url"
                    type="url"
                    value={formData.poster_url}
                    onChange={(e) => handleInputChange('poster_url', e.target.value)}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>

                {/* YouTube URL */}
                <div className="md:col-span-2">
                  <Label htmlFor="youtube_url">YouTube URL</Label>
                  <Input
                    id="youtube_url"
                    type="url"
                    value={formData.youtube_url}
                    onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                {/* Editor Note */}
                <div className="md:col-span-2">
                  <Label htmlFor="editor_note">Editor's Note</Label>
                  <Textarea
                    id="editor_note"
                    value={formData.editor_note}
                    onChange={(e) => handleInputChange('editor_note', e.target.value)}
                    placeholder="Write your editorial commentary for this film (displayed in Editor's Picks section)"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This note will appear in the "Editor's Picks" section instead of the description.
                  </p>
                </div>

                {/* Featured Status */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => handleInputChange('featured', checked)}
                    />
                    <Label 
                      htmlFor="featured" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Featured Movie
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Featured movies will be displayed prominently on the homepage and in special sections.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={updateMovieMutation.isPending}
                  className="flex-1"
                >
                  {updateMovieMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Movie
                    </>
                  )}
                </Button>
                <Link to="/admin/movies/edit" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Current Movie Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Movie Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">ID:</span>
                <span className="font-mono">{movie.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Created:</span>
                <span>{new Date(movie.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rating:</span>
                <span>{movie.average_rating || 0}/5 ({movie.review_count || 0} reviews)</span>
              </div>

              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Featured:</span>
                <span className={movie.featured ? "text-yellow-600 font-medium" : "text-muted-foreground"}>
                  {movie.featured ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditMovie;
