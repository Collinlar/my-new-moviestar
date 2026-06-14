import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Film, Plus, X, Save, ArrowLeft, Users, Video, Award } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import FileUpload from '@/components/FileUpload';
import { UploadResult } from '@/services/fileUpload';
import { notifySearchEnginesAboutMovies } from '@/services/searchEngineNotification';

const AddMovie = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    release_year: new Date().getFullYear(),
    genre: 'action' as 'action' | 'comedy' | 'drama' | 'romance' | 'thriller' | 'horror' | 'adventure' | 'family' | 'documentary' | 'musical' | 'historical',
    language: 'english' as 'english' | 'french' | 'swahili' | 'yoruba' | 'igbo' | 'hausa' | 'other' | 'twi',

    poster_file: null as File | null,
    poster_url: '',
    youtube_url: '',
    creator_id: 'none',
    director: '',
    producer: '',
    writer: '',
    country: '',
    rating: '',
    synopsis: '',
    tagline: '',
    keywords: ''
  });

  // Check if user is admin
  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch creators for the dropdown
  const { data: creators } = useQuery({
    queryKey: ['creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdmin,
  });

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to add movies.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const addMovieMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      
      try {
                 const { data: movieData, error: movieError } = await supabase
           .from('movies')
           .insert([{
             title: formData.title,
             description: formData.description,
             release_year: formData.release_year,
             genre: formData.genre,
             language: formData.language,

             poster_url: formData.poster_url || '',
             youtube_url: formData.youtube_url,
             creator_id: formData.creator_id === 'none' ? null : formData.creator_id
           }])
           .select()
           .single();

        if (movieError) throw movieError;
        return movieData;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: async (movieData) => {
      toast({
        title: "Success!",
        description: "Movie has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      
      // Notify search engines about the new movie for instant indexing
      if (movieData?.id) {
        console.log('📢 Notifying search engines about new movie:', movieData.id);
        notifySearchEnginesAboutMovies([movieData.id]).then(result => {
          if (result.success) {
            console.log('✅ Search engines notified successfully');
          } else {
            console.warn('⚠️ Search engine notification failed:', result.message);
          }
        });
      }
      
      navigate('/admin');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add movie",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMovieMutation.mutate();
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
              <h1 className="text-3xl font-bold text-foreground">Add New Movie</h1>
              <p className="text-muted-foreground">Create a comprehensive movie entry</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Movie Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Movie Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter movie title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_year">Release Year *</Label>
                  <Input
                    id="release_year"
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, release_year: parseInt(e.target.value) }))}
                    min="1900"
                    max={new Date().getFullYear() + 5}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Genre *</Label>
                  <Select value={formData.genre} onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value as typeof prev.genre }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {['action', 'comedy', 'drama', 'romance', 'thriller', 'horror', 'adventure', 'family', 'documentary', 'musical', 'historical', 'sci-fi', 'fantasy', 'western', 'war', 'crime', 'mystery', 'animation'].map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre.charAt(0).toUpperCase() + genre.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                                 <div className="space-y-2">
                   <Label htmlFor="language">Language *</Label>
                   <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value as typeof prev.language }))}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select language" />
                     </SelectTrigger>
                     <SelectContent>
                       {['english', 'yoruba', 'igbo', 'hausa', 'twi', 'french', 'swahili', 'spanish', 'portuguese', 'arabic', 'chinese', 'japanese', 'korean', 'hindi', 'other'].map((lang) => (
                         <SelectItem key={lang} value={lang}>
                           {lang.charAt(0).toUpperCase() + lang.slice(1)}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="creator">Creator</Label>
                   <Select value={formData.creator_id} onValueChange={(value) => setFormData(prev => ({ ...prev, creator_id: value }))}>
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



                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="e.g., Nigeria, USA, UK"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the movie"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="synopsis">Synopsis</Label>
                <Textarea
                  id="synopsis"
                  value={formData.synopsis}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                  placeholder="Detailed plot summary"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g., 'In space, no one can hear you scream'"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media & Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Media & Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                 <div className="space-y-2">
                  <FileUpload
                    label="Poster Image"
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    onFileSelect={(file) => {
                      setFormData(prev => ({ ...prev, poster_file: file }));
                    }}
                    onUploadComplete={(result: UploadResult) => {
                      if (result.success && result.url) {
                        setFormData(prev => ({ ...prev, poster_url: result.url }));
                        toast({
                          title: "Success!",
                          description: "Poster uploaded successfully",
                        });
                      }
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "Upload Error",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                    showPreview={true}
                    required={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube_url">YouTube URL</Label>
                  <Input
                    id="youtube_url"
                    type="url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="director">Director</Label>
                  <Input
                    id="director"
                    value={formData.director}
                    onChange={(e) => setFormData(prev => ({ ...prev, director: e.target.value }))}
                    placeholder="Director name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producer">Producer</Label>
                  <Input
                    id="producer"
                    value={formData.producer}
                    onChange={(e) => setFormData(prev => ({ ...prev, producer: e.target.value }))}
                    placeholder="Producer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="writer">Writer</Label>
                  <Input
                    id="writer"
                    value={formData.writer}
                    onChange={(e) => setFormData(prev => ({ ...prev, writer: e.target.value }))}
                    placeholder="Writer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating</Label>
                  <Input
                    id="rating"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                    placeholder="e.g., PG-13, R, 18+"
                  />
                </div>

                
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="e.g., action, superhero, adventure (comma separated)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link to="/admin">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Adding Movie...' : 'Add Movie'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMovie;
