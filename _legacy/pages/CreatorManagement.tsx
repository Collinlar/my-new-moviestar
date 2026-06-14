import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  SortAsc, 
  SortDesc, 
  Edit, 
  Trash2, 
  Users, 
  Eye,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { Creator } from '@/hooks/useCreators';
import FileUpload from '@/components/FileUpload';
import { Link } from 'react-router-dom';

interface CreatorFormData {
  name: string;
  bio: string;
  image_url: string;
}

const CreatorManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'movie_count'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [formData, setFormData] = useState<CreatorFormData>({
    name: '',
    bio: '',
    image_url: ''
  });

  // Fetch all creators
  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async (): Promise<Creator[]> => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get movie count for each creator
      const creatorsWithCounts = await Promise.all(
        data.map(async (creator) => {
          const { count } = await supabase
            .from('movies')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', creator.id);

          return {
            ...creator,
            movie_count: count || 0
          };
        })
      );

      return creatorsWithCounts;
    }
  });

  // Add creator mutation
  const addCreatorMutation = useMutation({
    mutationFn: async (data: CreatorFormData) => {
      const { data: newCreator, error } = await supabase
        .from('creators')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newCreator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      queryClient.invalidateQueries({ queryKey: ['top-creators'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', bio: '', image_url: '' });
      toast({
        title: "Success",
        description: "Creator added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add creator: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update creator mutation
  const updateCreatorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatorFormData> }) => {
      const { data: updatedCreator, error } = await supabase
        .from('creators')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedCreator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      queryClient.invalidateQueries({ queryKey: ['top-creators'] });
      setEditingCreator(null);
      setFormData({ name: '', bio: '', image_url: '' });
      toast({
        title: "Success",
        description: "Creator updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update creator: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete creator mutation
  const deleteCreatorMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if creator has movies
      const { count } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', id);

      if (count && count > 0) {
        throw new Error('Cannot delete creator with existing movies. Please reassign or delete movies first.');
      }

      const { error } = await supabase
        .from('creators')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      queryClient.invalidateQueries({ queryKey: ['top-creators'] });
      toast({
        title: "Success",
        description: "Creator deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter and sort creators
  const filteredCreators = creators?.filter(creator =>
    creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const sortedCreators = [...filteredCreators].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];

    if (sortBy === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCreator) {
      updateCreatorMutation.mutate({ id: editingCreator.id, data: formData });
    } else {
      addCreatorMutation.mutate(formData);
    }
  };

  const handleEdit = (creator: Creator) => {
    setEditingCreator(creator);
    setFormData({
      name: creator.name,
      bio: creator.bio || '',
      image_url: creator.image_url || ''
    });
  };

  const handleCancel = () => {
    setEditingCreator(null);
    setFormData({ name: '', bio: '', image_url: '' });
    setIsAddDialogOpen(false);
  };

  const handleImageUpload = (result: any) => {
    if (result.success && result.url) {
      setFormData(prev => ({ ...prev, image_url: result.url }));
    } else {
      toast({
        title: "Upload Error",
        description: result.error || "Failed to upload image",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link 
            to="/admin" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Panel
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Creator Management</h1>
              <p className="text-muted-foreground">Manage filmmakers and content creators</p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Creator
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Creator</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Creator name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Creator biography"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Profile Image</Label>
                  <FileUpload
                    onUploadComplete={handleImageUpload}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    className="mt-2"
                    customUploadMethod="creatorProfile"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCreatorMutation.isPending}>
                    {addCreatorMutation.isPending ? 'Adding...' : 'Add Creator'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="movie_count">Movie Count</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCreators.map((creator) => (
            <Card key={creator.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.image_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {creator.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg font-semibold">{creator.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {creator.movie_count} movie{creator.movie_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(creator)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCreatorMutation.mutate(creator.id)}
                      disabled={deleteCreatorMutation.isPending}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {creator.bio && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {creator.bio}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Joined {new Date(creator.created_at).getFullYear()}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/creator/${creator.id}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Creator Dialog */}
        <Dialog open={!!editingCreator} onOpenChange={() => setEditingCreator(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Creator</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Creator name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Creator biography"
                  rows={3}
                />
              </div>
              <div>
                <Label>Profile Image</Label>
                <FileUpload
                  onUploadComplete={handleImageUpload}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                  className="mt-2"
                  customUploadMethod="creatorProfile"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCreatorMutation.isPending}>
                  {updateCreatorMutation.isPending ? 'Updating...' : 'Update Creator'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Empty State */}
        {sortedCreators.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No creators found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first creator.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Creator
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreatorManagement;
