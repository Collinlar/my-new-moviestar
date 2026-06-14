import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Edit, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CastMember {
  id: string;
  movie_id: string;
  name: string;
  role: string;
  character?: string;
  created_at: string;
}

interface CrewMember {
  id: string;
  movie_id: string;
  name: string;
  role: string;
  department: string;
  created_at: string;
}

interface Movie {
  id: string;
  title: string;
  release_year: number;
}

const CastCrewManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [isAddingCast, setIsAddingCast] = useState(false);
  const [isAddingCrew, setIsAddingCrew] = useState(false);
  const [editingCast, setEditingCast] = useState<CastMember | null>(null);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  
  const [castForm, setCastForm] = useState({
    name: '',
    role: '',
    character: ''
  });
  
  const [crewForm, setCrewForm] = useState({
    name: '',
    role: '',
    department: ''
  });

  // Check if user is admin
  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch movies for selection
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

  // Fetch cast and crew for selected movie
  const { data: castData, refetch: refetchCast } = useQuery({
    queryKey: ['cast', selectedMovie],
    queryFn: async () => {
      if (!selectedMovie) return [];
      const { data, error } = await supabase
        .from('movie_cast')
        .select('*')
        .eq('movie_id', selectedMovie)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMovie,
  });

  const { data: crewData, refetch: refetchCrew } = useQuery({
    queryKey: ['crew', selectedMovie],
    queryFn: async () => {
      if (!selectedMovie) return [];
      const { data, error } = await supabase
        .from('movie_crew')
        .select('*')
        .eq('movie_id', selectedMovie)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMovie,
  });

  // Add cast member mutation
  const addCastMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('movie_cast')
        .insert([{
          movie_id: selectedMovie,
          name: castForm.name,
          role: castForm.role,
          character: castForm.character || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Cast member added successfully",
      });
      setCastForm({ name: '', role: '', character: '' });
      setIsAddingCast(false);
      refetchCast();
      queryClient.invalidateQueries({ queryKey: ['cast'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add cast member",
        variant: "destructive",
      });
    },
  });

  // Add crew member mutation
  const addCrewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('movie_crew')
        .insert([{
          movie_id: selectedMovie,
          name: crewForm.name,
          role: crewForm.role,
          department: crewForm.department
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Crew member added successfully",
      });
      setCrewForm({ name: '', role: '', department: '' });
      setIsAddingCrew(false);
      refetchCrew();
      queryClient.invalidateQueries({ queryKey: ['crew'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add crew member",
        variant: "destructive",
      });
    },
  });

  // Update cast member mutation
  const updateCastMutation = useMutation({
    mutationFn: async () => {
      if (!editingCast) throw new Error('No cast member to update');
      
      const { data, error } = await supabase
        .from('movie_cast')
        .update({
          name: castForm.name,
          role: castForm.role,
          character: castForm.character || null
        })
        .eq('id', editingCast.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Cast member updated successfully",
      });
      setCastForm({ name: '', role: '', character: '' });
      setEditingCast(null);
      refetchCast();
      queryClient.invalidateQueries({ queryKey: ['cast'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cast member",
        variant: "destructive",
      });
    },
  });

  // Update crew member mutation
  const updateCrewMutation = useMutation({
    mutationFn: async () => {
      if (!editingCrew) throw new Error('No crew member to update');
      
      const { data, error } = await supabase
        .from('movie_crew')
        .update({
          name: crewForm.name,
          role: crewForm.role,
          department: crewForm.department
        })
        .eq('id', editingCrew.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Crew member updated successfully",
      });
      setCrewForm({ name: '', role: '', department: '' });
      setEditingCrew(null);
      refetchCrew();
      queryClient.invalidateQueries({ queryKey: ['crew'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update crew member",
        variant: "destructive",
      });
    },
  });

  // Delete cast member mutation
  const deleteCastMutation = useMutation({
    mutationFn: async (castId: string) => {
      const { error } = await supabase
        .from('movie_cast')
        .delete()
        .eq('id', castId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Cast member removed successfully",
      });
      refetchCast();
      queryClient.invalidateQueries({ queryKey: ['cast'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove cast member",
        variant: "destructive",
      });
    },
  });

  // Delete crew member mutation
  const deleteCrewMutation = useMutation({
    mutationFn: async (crewId: string) => {
      const { error } = await supabase
        .from('movie_crew')
        .delete()
        .eq('id', crewId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Crew member removed successfully",
      });
      refetchCrew();
      queryClient.invalidateQueries({ queryKey: ['crew'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove crew member",
        variant: "destructive",
      });
    },
  });

  const handleCastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCast) {
      updateCastMutation.mutate();
    } else {
      addCastMutation.mutate();
    }
  };

  const handleCrewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCrew) {
      updateCrewMutation.mutate();
    } else {
      addCrewMutation.mutate();
    }
  };

  const startEditCast = (cast: CastMember) => {
    setEditingCast(cast);
    setCastForm({
      name: cast.name,
      role: cast.role,
      character: cast.character || ''
    });
    setIsAddingCast(true);
  };

  const startEditCrew = (crew: CrewMember) => {
    setEditingCrew(crew);
    setCrewForm({
      name: crew.name,
      role: crew.role,
      department: crew.department
    });
    setIsAddingCrew(true);
  };

  const cancelEdit = () => {
    setEditingCast(null);
    setEditingCrew(null);
    setCastForm({ name: '', role: '', character: '' });
    setCrewForm({ name: '', role: '', department: '' });
    setIsAddingCast(false);
    setIsAddingCrew(false);
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to manage cast and crew.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedMovieData = movies?.find(m => m.id === selectedMovie);

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
              <h1 className="text-3xl font-bold text-foreground">Cast & Crew Management</h1>
              <p className="text-muted-foreground">Manage actor and crew information for movies</p>
            </div>
          </div>
        </div>

        {/* Movie Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Movie</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMovie} onValueChange={setSelectedMovie}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a movie to manage cast and crew" />
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
            {/* Cast Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Cast Members
                  </span>
                  <Button 
                    onClick={() => setIsAddingCast(true)}
                    disabled={isAddingCast}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cast Member
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAddingCast && (
                  <form onSubmit={handleCastSubmit} className="mb-6 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="cast-name">Name *</Label>
                        <Input
                          id="cast-name"
                          value={castForm.name}
                          onChange={(e) => setCastForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Actor name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cast-role">Role *</Label>
                        <Select 
                          value={castForm.role} 
                          onValueChange={(value) => setCastForm(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="supporting">Supporting</SelectItem>
                            <SelectItem value="cameo">Cameo</SelectItem>
                            <SelectItem value="extra">Extra</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cast-character">Character</Label>
                        <Input
                          id="cast-character"
                          value={castForm.character}
                          onChange={(e) => setCastForm(prev => ({ ...prev, character: e.target.value }))}
                          placeholder="Character name"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="submit" disabled={addCastMutation.isPending || updateCastMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingCast ? 'Update' : 'Add'} Cast Member
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {castData && castData.length > 0 ? (
                  <div className="space-y-3">
                    {castData.map((cast) => (
                      <div key={cast.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{cast.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cast.role} {cast.character && `• ${cast.character}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditCast(cast)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCastMutation.mutate(cast.id)}
                            disabled={deleteCastMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No cast members added yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Crew Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Crew Members
                  </span>
                  <Button 
                    onClick={() => setIsAddingCrew(true)}
                    disabled={isAddingCrew}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Crew Member
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isAddingCrew && (
                  <form onSubmit={handleCrewSubmit} className="mb-6 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="crew-name">Name *</Label>
                        <Input
                          id="crew-name"
                          value={crewForm.name}
                          onChange={(e) => setCrewForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Crew member name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="crew-role">Role *</Label>
                        <Select 
                          value={crewForm.role} 
                          onValueChange={(value) => setCrewForm(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="producer">Producer</SelectItem>
                            <SelectItem value="writer">Writer</SelectItem>
                            <SelectItem value="cinematographer">Cinematographer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="composer">Composer</SelectItem>
                            <SelectItem value="production_designer">Production Designer</SelectItem>
                            <SelectItem value="costume_designer">Costume Designer</SelectItem>
                            <SelectItem value="makeup_artist">Makeup Artist</SelectItem>
                            <SelectItem value="sound_designer">Sound Designer</SelectItem>
                            <SelectItem value="stunt_coordinator">Stunt Coordinator</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="crew-department">Department *</Label>
                        <Select 
                          value={crewForm.department} 
                          onValueChange={(value) => setCrewForm(prev => ({ ...prev, department: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direction">Direction</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="writing">Writing</SelectItem>
                            <SelectItem value="cinematography">Cinematography</SelectItem>
                            <SelectItem value="editing">Editing</SelectItem>
                            <SelectItem value="music">Music</SelectItem>
                            <SelectItem value="art">Art</SelectItem>
                            <SelectItem value="costumes">Costumes</SelectItem>
                            <SelectItem value="makeup">Makeup</SelectItem>
                            <SelectItem value="sound">Sound</SelectItem>
                            <SelectItem value="stunts">Stunts</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="submit" disabled={addCrewMutation.isPending || updateCrewMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingCrew ? 'Update' : 'Add'} Crew Member
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {crewData && crewData.length > 0 ? (
                  <div className="space-y-3">
                    {crewData.map((crew) => (
                      <div key={crew.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{crew.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {crew.role} • {crew.department}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditCrew(crew)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCrewMutation.mutate(crew.id)}
                            disabled={deleteCrewMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No crew members added yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default CastCrewManagement;
