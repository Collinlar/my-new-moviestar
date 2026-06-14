import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { 
  Users, Plus, Edit, Trash2, ArrowLeft, Save, X, Search, 
  CheckCircle, Link as LinkIcon, Film 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type PersonRole = Database['public']['Enums']['person_role'];

interface Person {
  id: string;
  full_name: string;
  bio: string | null;
  country: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  verified: boolean | null;
  profile_image: string | null;
  imdb_id: string | null;
  website: string | null;
  created_at: string;
}

interface MoviePerson {
  id: string;
  movie_id: string;
  person_id: string;
  role: PersonRole;
  character_name: string | null;
  billing_order: number | null;
  department: string | null;
  movies?: { id: string; title: string; release_year: number };
}

const PERSON_ROLES: { value: PersonRole; label: string }[] = [
  { value: 'actor', label: 'Actor' },
  { value: 'director', label: 'Director' },
  { value: 'writer', label: 'Writer' },
  { value: 'producer', label: 'Producer' },
  { value: 'cinematographer', label: 'Cinematographer' },
  { value: 'editor', label: 'Editor' },
  { value: 'composer', label: 'Composer' },
  { value: 'costume_designer', label: 'Costume Designer' },
  { value: 'production_designer', label: 'Production Designer' },
];

const PeopleManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isLinkingMovie, setIsLinkingMovie] = useState(false);
  
  const [personForm, setPersonForm] = useState({
    full_name: '',
    bio: '',
    country: '',
    date_of_birth: '',
    date_of_death: '',
    profile_image: '',
    imdb_id: '',
    website: '',
    verified: false,
  });
  
  const [movieLinkForm, setMovieLinkForm] = useState({
    movie_id: '',
    role: 'actor' as PersonRole,
    character_name: '',
    billing_order: 0,
    department: '',
  });

  // Fetch user profile to check admin role
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = profile?.role === 'admin' || user?.email === 'kofcollkcl100@gmail.com';

  // Fetch people
  const { data: people, isLoading: loadingPeople } = useQuery({
    queryKey: ['admin-people', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('people')
        .select('*')
        .order('full_name');
      
      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!user && isAdmin,
  });

  // Fetch movies for linking
  const { data: movies } = useQuery({
    queryKey: ['movies-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, release_year')
        .order('title');
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });

  // Fetch movie links for selected person
  const { data: movieLinks, refetch: refetchLinks } = useQuery({
    queryKey: ['person-movie-links', selectedPerson?.id],
    queryFn: async () => {
      if (!selectedPerson) return [];
      const { data, error } = await supabase
        .from('movie_people')
        .select('*, movies(id, title, release_year)')
        .eq('person_id', selectedPerson.id)
        .order('billing_order');
      if (error) throw error;
      return data as MoviePerson[];
    },
    enabled: !!selectedPerson,
  });

  // Add person mutation
  const addPersonMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .insert([{
          full_name: personForm.full_name,
          bio: personForm.bio || null,
          country: personForm.country || null,
          date_of_birth: personForm.date_of_birth || null,
          date_of_death: personForm.date_of_death || null,
          profile_image: personForm.profile_image || null,
          imdb_id: personForm.imdb_id || null,
          website: personForm.website || null,
          verified: personForm.verified,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Person added successfully" });
      resetPersonForm();
      setIsAddingPerson(false);
      queryClient.invalidateQueries({ queryKey: ['admin-people'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update person mutation
  const updatePersonMutation = useMutation({
    mutationFn: async () => {
      if (!editingPerson) throw new Error('No person to update');
      const { data, error } = await supabase
        .from('people')
        .update({
          full_name: personForm.full_name,
          bio: personForm.bio || null,
          country: personForm.country || null,
          date_of_birth: personForm.date_of_birth || null,
          date_of_death: personForm.date_of_death || null,
          profile_image: personForm.profile_image || null,
          imdb_id: personForm.imdb_id || null,
          website: personForm.website || null,
          verified: personForm.verified,
        })
        .eq('id', editingPerson.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Person updated successfully" });
      resetPersonForm();
      setEditingPerson(null);
      queryClient.invalidateQueries({ queryKey: ['admin-people'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete person mutation
  const deletePersonMutation = useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase.from('people').delete().eq('id', personId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Person deleted successfully" });
      if (selectedPerson) setSelectedPerson(null);
      queryClient.invalidateQueries({ queryKey: ['admin-people'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Link person to movie mutation
  const linkMovieMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPerson) throw new Error('No person selected');
      const { data, error } = await supabase
        .from('movie_people')
        .insert([{
          person_id: selectedPerson.id,
          movie_id: movieLinkForm.movie_id,
          role: movieLinkForm.role,
          character_name: movieLinkForm.character_name || null,
          billing_order: movieLinkForm.billing_order || 0,
          department: movieLinkForm.department || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Movie linked successfully" });
      setMovieLinkForm({ movie_id: '', role: 'actor', character_name: '', billing_order: 0, department: '' });
      setIsLinkingMovie(false);
      refetchLinks();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Unlink movie mutation
  const unlinkMovieMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('movie_people').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success!", description: "Movie unlinked successfully" });
      refetchLinks();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetPersonForm = () => {
    setPersonForm({
      full_name: '', bio: '', country: '', date_of_birth: '', date_of_death: '',
      profile_image: '', imdb_id: '', website: '', verified: false,
    });
  };

  const startEditPerson = (person: Person) => {
    setEditingPerson(person);
    setPersonForm({
      full_name: person.full_name,
      bio: person.bio || '',
      country: person.country || '',
      date_of_birth: person.date_of_birth || '',
      date_of_death: person.date_of_death || '',
      profile_image: person.profile_image || '',
      imdb_id: person.imdb_id || '',
      website: person.website || '',
      verified: person.verified || false,
    });
    setIsAddingPerson(true);
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      updatePersonMutation.mutate();
    } else {
      addPersonMutation.mutate();
    }
  };

  const handleLinkMovieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkMovieMutation.mutate();
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to manage people.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-6">
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
              <h1 className="text-3xl font-bold text-foreground">People Management</h1>
              <p className="text-muted-foreground">Manage actors, directors, and crew profiles</p>
            </div>
          </div>
          <Button onClick={() => { resetPersonForm(); setEditingPerson(null); setIsAddingPerson(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* People List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                People Directory
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
              {loadingPeople ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : people && people.length > 0 ? (
                people.map((person) => (
                  <div 
                    key={person.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedPerson?.id === person.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                    onClick={() => setSelectedPerson(person)}
                  >
                    <div className="flex items-center gap-3">
                      {person.profile_image ? (
                        <img src={person.profile_image} alt={person.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{person.full_name}</p>
                        {person.country && <p className="text-xs text-muted-foreground">{person.country}</p>}
                      </div>
                      {person.verified && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No people found</p>
              )}
            </CardContent>
          </Card>

          {/* Person Details / Add Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {isAddingPerson ? (editingPerson ? 'Edit Person' : 'Add New Person') : (selectedPerson ? selectedPerson.full_name : 'Select a Person')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAddingPerson ? (
                <form onSubmit={handlePersonSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={personForm.full_name}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, full_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={personForm.country}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="e.g., Nigeria"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={personForm.date_of_birth}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date_of_death">Date of Death</Label>
                      <Input
                        id="date_of_death"
                        type="date"
                        value={personForm.date_of_death}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, date_of_death: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile_image">Profile Image URL</Label>
                      <Input
                        id="profile_image"
                        type="url"
                        value={personForm.profile_image}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, profile_image: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="imdb_id">IMDB ID</Label>
                      <Input
                        id="imdb_id"
                        value={personForm.imdb_id}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, imdb_id: e.target.value }))}
                        placeholder="nm0000001"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={personForm.website}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="bio">Biography</Label>
                      <Textarea
                        id="bio"
                        value={personForm.bio}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="verified"
                        checked={personForm.verified}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, verified: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="verified">Verified Profile</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={addPersonMutation.isPending || updatePersonMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingPerson ? 'Update' : 'Add'} Person
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setIsAddingPerson(false); setEditingPerson(null); resetPersonForm(); }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : selectedPerson ? (
                <div className="space-y-6">
                  {/* Person Info */}
                  <div className="flex items-start gap-4">
                    {selectedPerson.profile_image ? (
                      <img src={selectedPerson.profile_image} alt={selectedPerson.full_name} className="w-24 h-24 rounded-lg object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{selectedPerson.full_name}</h3>
                        {selectedPerson.verified && <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" /> Verified</Badge>}
                      </div>
                      {selectedPerson.country && <p className="text-muted-foreground">{selectedPerson.country}</p>}
                      {selectedPerson.bio && <p className="text-sm mt-2">{selectedPerson.bio}</p>}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" onClick={() => startEditPerson(selectedPerson)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deletePersonMutation.mutate(selectedPerson.id)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Movie Links */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2"><Film className="h-4 w-4" /> Filmography</h4>
                      <Button size="sm" onClick={() => setIsLinkingMovie(true)} disabled={isLinkingMovie}>
                        <LinkIcon className="h-4 w-4 mr-1" /> Link Movie
                      </Button>
                    </div>

                    {isLinkingMovie && (
                      <form onSubmit={handleLinkMovieSubmit} className="p-4 border rounded-lg mb-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Movie *</Label>
                            <Select value={movieLinkForm.movie_id} onValueChange={(v) => setMovieLinkForm(prev => ({ ...prev, movie_id: v }))}>
                              <SelectTrigger><SelectValue placeholder="Select movie" /></SelectTrigger>
                              <SelectContent>
                                {movies?.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>{m.title} ({m.release_year})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Role *</Label>
                            <Select value={movieLinkForm.role} onValueChange={(v) => setMovieLinkForm(prev => ({ ...prev, role: v as PersonRole }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PERSON_ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Character Name</Label>
                            <Input
                              value={movieLinkForm.character_name}
                              onChange={(e) => setMovieLinkForm(prev => ({ ...prev, character_name: e.target.value }))}
                              placeholder="For actors"
                            />
                          </div>
                          <div>
                            <Label>Billing Order</Label>
                            <Input
                              type="number"
                              value={movieLinkForm.billing_order}
                              onChange={(e) => setMovieLinkForm(prev => ({ ...prev, billing_order: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={linkMovieMutation.isPending}>
                            <Save className="h-4 w-4 mr-1" /> Link
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setIsLinkingMovie(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}

                    {movieLinks && movieLinks.length > 0 ? (
                      <div className="space-y-2">
                        {movieLinks.map((link) => (
                          <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{link.movies?.title} ({link.movies?.release_year})</p>
                              <p className="text-sm text-muted-foreground">
                                {PERSON_ROLES.find(r => r.value === link.role)?.label}
                                {link.character_name && ` as ${link.character_name}`}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => unlinkMovieMutation.mutate(link.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No movies linked yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Select a person from the list to view details or add a new person.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PeopleManagement;
