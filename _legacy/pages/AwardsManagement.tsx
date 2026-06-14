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
import { Award, Plus, Edit, Trash2, ArrowLeft, Save, X, CheckCircle, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MovieAward {
  id: string;
  movie_id: string;
  name: string;
  category: string;
  year: number;
  won: boolean;
  created_at: string;
}

interface Movie {
  id: string;
  title: string;
  release_year: number;
}

const AwardsManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [isAddingAward, setIsAddingAward] = useState(false);
  const [editingAward, setEditingAward] = useState<MovieAward | null>(null);
  
  const [awardForm, setAwardForm] = useState({
    name: '',
    category: '',
    year: new Date().getFullYear(),
    won: false
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

  const { data: awardsData, refetch: refetchAwards } = useQuery({
    queryKey: ['awards', selectedMovie],
    queryFn: async () => {
      if (!selectedMovie) return [];
      const { data, error } = await supabase
        .from('movie_awards')
        .select('*')
        .eq('movie_id', selectedMovie)
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMovie,
  });

  const addAwardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('movie_awards')
        .insert([{
          movie_id: selectedMovie,
          name: awardForm.name,
          category: awardForm.category,
          year: awardForm.year,
          won: awardForm.won
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Award added successfully",
      });
      setAwardForm({ name: '', category: '', year: new Date().getFullYear(), won: false });
      setIsAddingAward(false);
      refetchAwards();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add award",
        variant: "destructive",
      });
    },
  });

  const updateAwardMutation = useMutation({
    mutationFn: async () => {
      if (!editingAward) throw new Error('No award to update');
      
      const { data, error } = await supabase
        .from('movie_awards')
        .update({
          name: awardForm.name,
          category: awardForm.category,
          year: awardForm.year,
          won: awardForm.won
        })
        .eq('id', editingAward.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Award updated successfully",
      });
      setAwardForm({ name: '', category: '', year: new Date().getFullYear(), won: false });
      setEditingAward(null);
      refetchAwards();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update award",
        variant: "destructive",
      });
    },
  });

  const deleteAwardMutation = useMutation({
    mutationFn: async (awardId: string) => {
      const { error } = await supabase
        .from('movie_awards')
        .delete()
        .eq('id', awardId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Award removed successfully",
      });
      refetchAwards();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove award",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAward) {
      updateAwardMutation.mutate();
    } else {
      addAwardMutation.mutate();
    }
  };

  const startEdit = (award: MovieAward) => {
    setEditingAward(award);
    setAwardForm({
      name: award.name,
      category: award.category,
      year: award.year,
      won: award.won
    });
    setIsAddingAward(true);
  };

  const cancelEdit = () => {
    setEditingAward(null);
    setAwardForm({ name: '', category: '', year: new Date().getFullYear(), won: false });
    setIsAddingAward(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to manage awards.</p>
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
            <h1 className="text-3xl font-bold text-foreground">Awards Management</h1>
            <p className="text-muted-foreground">Track nominations and wins for movies</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Movie</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMovie} onValueChange={setSelectedMovie}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a movie to manage awards" />
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
                    <Award className="h-5 w-5" />
                    {editingAward ? 'Edit Award' : 'Add New Award'}
                  </span>
                  {!isAddingAward && (
                    <Button onClick={() => setIsAddingAward(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Award
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAddingAward && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="award-name">Award Name *</Label>
                        <Select 
                          value={awardForm.name} 
                          onValueChange={(value) => setAwardForm(prev => ({ ...prev, name: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select award" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Academy Awards">Academy Awards (Oscars)</SelectItem>
                            <SelectItem value="Golden Globe Awards">Golden Globe Awards</SelectItem>
                            <SelectItem value="BAFTA Awards">BAFTA Awards</SelectItem>
                            <SelectItem value="Cannes Film Festival">Cannes Film Festival</SelectItem>
                            <SelectItem value="Venice Film Festival">Venice Film Festival</SelectItem>
                            <SelectItem value="Berlin International Film Festival">Berlin International Film Festival</SelectItem>
                            <SelectItem value="Sundance Film Festival">Sundance Film Festival</SelectItem>
                            <SelectItem value="Toronto International Film Festival">Toronto International Film Festival</SelectItem>
                            <SelectItem value="AFI Awards">AFI Awards</SelectItem>
                            <SelectItem value="Screen Actors Guild Awards">Screen Actors Guild Awards</SelectItem>
                            <SelectItem value="Directors Guild of America Awards">Directors Guild of America Awards</SelectItem>
                            <SelectItem value="Writers Guild of America Awards">Writers Guild of America Awards</SelectItem>
                            <SelectItem value="Critics Choice Awards">Critics Choice Awards</SelectItem>
                            <SelectItem value="Independent Spirit Awards">Independent Spirit Awards</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="award-category">Category *</Label>
                        <Select 
                          value={awardForm.category} 
                          onValueChange={(value) => setAwardForm(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Best Picture">Best Picture</SelectItem>
                            <SelectItem value="Best Director">Best Director</SelectItem>
                            <SelectItem value="Best Actor">Best Actor</SelectItem>
                            <SelectItem value="Best Actress">Best Actress</SelectItem>
                            <SelectItem value="Best Supporting Actor">Best Supporting Actor</SelectItem>
                            <SelectItem value="Best Supporting Actress">Best Supporting Actress</SelectItem>
                            <SelectItem value="Best Original Screenplay">Best Original Screenplay</SelectItem>
                            <SelectItem value="Best Adapted Screenplay">Best Adapted Screenplay</SelectItem>
                            <SelectItem value="Best Cinematography">Best Cinematography</SelectItem>
                            <SelectItem value="Best Film Editing">Best Film Editing</SelectItem>
                            <SelectItem value="Best Production Design">Best Production Design</SelectItem>
                            <SelectItem value="Best Costume Design">Best Costume Design</SelectItem>
                            <SelectItem value="Best Makeup and Hairstyling">Best Makeup and Hairstyling</SelectItem>
                            <SelectItem value="Best Sound Mixing">Best Sound Mixing</SelectItem>
                            <SelectItem value="Best Sound Editing">Best Sound Editing</SelectItem>
                            <SelectItem value="Best Visual Effects">Best Visual Effects</SelectItem>
                            <SelectItem value="Best Original Score">Best Original Score</SelectItem>
                            <SelectItem value="Best Original Song">Best Original Song</SelectItem>
                            <SelectItem value="Best Animated Feature">Best Animated Feature</SelectItem>
                            <SelectItem value="Best Documentary Feature">Best Documentary Feature</SelectItem>
                            <SelectItem value="Best International Feature">Best International Feature</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="award-year">Year *</Label>
                        <Input
                          id="award-year"
                          type="number"
                          value={awardForm.year}
                          onChange={(e) => setAwardForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                          min="1900"
                          max={new Date().getFullYear() + 1}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          id="award-won"
                          type="checkbox"
                          checked={awardForm.won}
                          onChange={(e) => setAwardForm(prev => ({ ...prev, won: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="award-won">Won the award</Label>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button type="submit" disabled={addAwardMutation.isPending || updateAwardMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingAward ? 'Update' : 'Add'} Award
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
                  <Award className="h-5 w-5" />
                  Awards ({awardsData?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {awardsData && awardsData.length > 0 ? (
                  <div className="space-y-4">
                    {awardsData.map((award) => (
                      <div key={award.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{award.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{award.category}</Badge>
                              <span className="text-sm text-muted-foreground">{award.year}</span>
                              <Badge variant={award.won ? "default" : "secondary"}>
                                {award.won ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Won
                                  </>
                                ) : (
                                  <>
                                    <Circle className="h-3 w-3 mr-1" />
                                    Nominated
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(award)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteAwardMutation.mutate(award.id)}
                              disabled={deleteAwardMutation.isPending}
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
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No awards added yet.</p>
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

export default AwardsManagement;
