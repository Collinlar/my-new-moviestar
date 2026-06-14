import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Video, Plus, Edit, Trash2, ArrowLeft, Save, X, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Trailer {
  id: string;
  movie_id: string;
  title: string;
  url: string;
  type: 'teaser' | 'trailer' | 'behind-the-scenes';
  created_at: string;
}

interface Movie {
  id: string;
  title: string;
  release_year: number;
}

const TrailerManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [isAddingTrailer, setIsAddingTrailer] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  
  const [trailerForm, setTrailerForm] = useState({
    title: '',
    url: '',
    type: '' as 'teaser' | 'trailer' | 'behind-the-scenes'
  });

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  const { data: movies } = useQuery({
    queryKey: ['movies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, release_year')
        .order('title');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isAdmin,
  });

  const { data: trailersData, refetch: refetchTrailers } = useQuery({
    queryKey: ['trailers', selectedMovie],
    queryFn: async () => {
      if (!selectedMovie) return [];
      const { data, error } = await supabase
        .from('movie_trailers')
        .select('*')
        .eq('movie_id', selectedMovie)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMovie,
  });

  const addTrailerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('movie_trailers')
        .insert([{
          movie_id: selectedMovie,
          title: trailerForm.title,
          url: trailerForm.url,
          type: trailerForm.type
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Trailer added successfully",
      });
      setTrailerForm({ title: '', url: '', type: '' as any });
      setIsAddingTrailer(false);
      refetchTrailers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add trailer",
        variant: "destructive",
      });
    },
  });

  const updateTrailerMutation = useMutation({
    mutationFn: async () => {
      if (!editingTrailer) throw new Error('No trailer to update');
      
      const { data, error } = await supabase
        .from('movie_trailers')
        .update({
          title: trailerForm.title,
          url: trailerForm.url,
          type: trailerForm.type
        })
        .eq('id', editingTrailer.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Trailer updated successfully",
      });
      setTrailerForm({ title: '', url: '', type: '' as any });
      setEditingTrailer(null);
      refetchTrailers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trailer",
        variant: "destructive",
      });
    },
  });

  const deleteTrailerMutation = useMutation({
    mutationFn: async (trailerId: string) => {
      const { error } = await supabase
        .from('movie_trailers')
        .delete()
        .eq('id', trailerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Trailer removed successfully",
      });
      refetchTrailers();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove trailer",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrailer) {
      updateTrailerMutation.mutate();
    } else {
      addTrailerMutation.mutate();
    }
  };

  const startEdit = (trailer: Trailer) => {
    setEditingTrailer(trailer);
    setTrailerForm({
      title: trailer.title,
      url: trailer.url,
      type: trailer.type
    });
    setIsAddingTrailer(true);
  };

  const cancelEdit = () => {
    setEditingTrailer(null);
    setTrailerForm({ title: '', url: '', type: '' as any });
    setIsAddingTrailer(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to manage trailers.</p>
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
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trailer Management</h1>
            <p className="text-muted-foreground">Upload and manage movie trailers</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Movie</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMovie} onValueChange={setSelectedMovie}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a movie to manage trailers" />
              </SelectTrigger>
              <SelectContent>
                {movies?.map((movie) => (
                  <SelectItem key={movie.id} value={movie.id}>
                    {movie.title} ({movie.release_year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedMovie && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    {editingTrailer ? 'Edit Trailer' : 'Add New Trailer'}
                  </span>
                  {!isAddingTrailer && (
                    <Button onClick={() => setIsAddingTrailer(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trailer
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAddingTrailer && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="trailer-title">Title *</Label>
                        <Input
                          id="trailer-title"
                          value={trailerForm.title}
                          onChange={(e) => setTrailerForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Official Trailer, Teaser"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="trailer-url">YouTube URL *</Label>
                        <Input
                          id="trailer-url"
                          type="url"
                          value={trailerForm.url}
                          onChange={(e) => setTrailerForm(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://youtube.com/watch?v=..."
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="trailer-type">Type *</Label>
                        <Select 
                          value={trailerForm.type} 
                          onValueChange={(value: 'teaser' | 'trailer' | 'behind-the-scenes') => 
                            setTrailerForm(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teaser">Teaser</SelectItem>
                            <SelectItem value="trailer">Trailer</SelectItem>
                            <SelectItem value="behind-the-scenes">Behind the Scenes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button type="submit" disabled={addTrailerMutation.isPending || updateTrailerMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingTrailer ? 'Update' : 'Add'} Trailer
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Trailers ({trailersData?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trailersData && trailersData.length > 0 ? (
                  <div className="space-y-4">
                    {trailersData.map((trailer) => (
                      <div key={trailer.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{trailer.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{trailer.type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(trailer.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={trailer.url} target="_blank" rel="noopener noreferrer">
                                <Play className="h-4 w-4 mr-2" />
                                Watch
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(trailer as Trailer)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTrailerMutation.mutate(trailer.id)}
                              disabled={deleteTrailerMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No trailers added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TrailerManagement;
