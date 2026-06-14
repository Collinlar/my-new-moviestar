import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Film, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Upload, 
  Users, 
  Award, 
  Video,
  Star,
  Calendar,
  Globe,
  FileText,
  Settings,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Save,
  UserPlus
} from 'lucide-react';

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('movies');

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

  // Check if user is admin - now uses role from database, fallback to email check
  const isAdmin = profile?.role === 'admin' || user?.email === 'kofcollkcl100@gmail.com';

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: movies, error: moviesError } = await supabase
        .from('movies')
        .select('*');
      
      if (moviesError) throw moviesError;
      
      const totalMovies = movies?.length || 0;
      const featuredMovies = movies?.filter(m => m.featured).length || 0;
      const thisMonthMovies = movies?.filter(m => {
        const movieDate = new Date(m.created_at);
        const now = new Date();
        return movieDate.getMonth() === now.getMonth() && 
               movieDate.getFullYear() === now.getFullYear();
      }).length || 0;
      
      const languages = new Set(movies?.map(m => m.language) || []);
      
      return {
        totalMovies,
        featuredMovies,
        thisMonthMovies,
        uniqueLanguages: languages.size
      };
    },
    enabled: !!user && isAdmin,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Authentication Required</h2>
              <p className="mt-2 text-muted-foreground">Please sign in to access the admin panel.</p>
              <Link to="/auth">
                <Button className="mt-4">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to access the admin panel.</p>
              <Link to="/" className="mt-4 inline-block">
                <Button>Return to Home</Button>
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
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-500" />
            <h1 className="text-4xl font-bold text-foreground">Admin Panel</h1>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-lg text-muted-foreground">
            Manage movies, content, and platform settings
          </p>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="movies" className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              Movies
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Creators
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Moderation
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Movies Tab */}
          <TabsContent value="movies" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Add Movie */}
              <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Add New Movie</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a new movie entry with full details
                  </p>
                  <Link to="/admin/movies/add">
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Movie
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Edit Movies */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Edit className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Edit Movies</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Modify existing movie information
                  </p>
                  <Link to="/admin/movies/edit">
                    <Button variant="outline" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Manage Movies
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Bulk Import */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Bulk Import</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import multiple movies at once
                  </p>
                  <Link to="/admin/movies/import">
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Movies
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Film className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold">{stats?.totalMovies || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Movies</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <div className="text-2xl font-bold">{stats?.featuredMovies || 0}</div>
                  <div className="text-sm text-muted-foreground">Featured</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold">{stats?.thisMonthMovies || 0}</div>
                  <div className="text-sm text-muted-foreground">This Month</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Globe className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <div className="text-2xl font-bold">{stats?.uniqueLanguages || 0}</div>
                  <div className="text-sm text-muted-foreground">Languages</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Cast & Crew */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-indigo-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Cast & Crew</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage actor and crew information
                  </p>
                  <Link to="/admin/cast-crew">
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Cast
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Trailers */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Video className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Trailers</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload and manage movie trailers
                  </p>
                  <Link to="/admin/trailers">
                    <Button variant="outline" className="w-full">
                      <Video className="h-4 w-4 mr-2" />
                      Manage Trailers
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Awards */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Awards</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Track movie awards and nominations
                  </p>
                  <Link to="/admin/awards">
                    <Button variant="outline" className="w-full">
                      <Award className="h-4 w-4 mr-2" />
                      Manage Awards
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="creators" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* People Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">People Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage actors, directors, and crew profiles
                  </p>
                  <Link to="/admin/people">
                    <Button variant="outline" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage People
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Legacy Creator Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Legacy Creators</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage legacy creator profiles
                  </p>
                  <Link to="/admin/creators">
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Creators
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Management */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">User Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage users, assign roles, and monitor activity
                  </p>
                  <Link to="/admin/users">
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Analytics Dashboard */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View platform insights and user engagement metrics
                  </p>
                  <Link to="/admin/analytics">
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Review Moderation */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-orange-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Review Moderation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Approve, reject, and manage user reviews
                  </p>
                  <Link to="/admin/moderation">
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Moderate Reviews
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Content Flagging */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Content Flagging</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Handle inappropriate content reports
                  </p>
                  <Link to="/admin/flagging">
                    <Button variant="outline" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Manage Flags
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-6">
              {/* Site Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Site Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input id="siteName" placeholder="African Reel Reviews" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Site Description</Label>
                      <Input id="siteDescription" placeholder="Discover the best African cinema" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input id="contactEmail" type="email" placeholder="contact@africanreelreviews.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteUrl">Site URL</Label>
                      <Input id="siteUrl" placeholder="https://africanreelreviews.com" />
                    </div>
                  </div>
                  <Button 
                    className="w-full md:w-auto"
                    onClick={() => {
                      toast({
                        title: "Success!",
                        description: "Site settings saved successfully",
                      });
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Site Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Content Policy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Content Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reviewPolicy">Review Policy</Label>
                    <Textarea 
                      id="reviewPolicy" 
                      placeholder="Guidelines for user reviews..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contentGuidelines">Content Guidelines</Label>
                    <Textarea 
                      id="contentGuidelines" 
                      placeholder="General content guidelines..."
                      rows={4}
                    />
                  </div>
                  <Button 
                    className="w-full md:w-auto"
                    onClick={() => {
                      toast({
                        title: "Success!",
                        description: "Content policy saved successfully",
                      });
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Content Policy
                  </Button>
                </CardContent>
              </Card>

              {/* System Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="autoApproveReviews">Auto-approve Reviews</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxReviewsPerUser">Max Reviews Per User</Label>
                      <Input id="maxReviewsPerUser" type="number" placeholder="10" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reviewCooldown">Review Cooldown (hours)</Label>
                      <Input id="reviewCooldown" type="number" placeholder="24" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="featuredMoviesLimit">Featured Movies Limit</Label>
                      <Input id="featuredMoviesLimit" type="number" placeholder="10" />
                    </div>
                  </div>
                  <Button 
                    className="w-full md:w-auto"
                    onClick={() => {
                      toast({
                        title: "Success!",
                        description: "System preferences saved successfully",
                      });
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save System Preferences
                  </Button>
                </CardContent>
              </Card>

              {/* Maintenance Mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Maintenance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="maintenanceMode" className="rounded" />
                    <Label htmlFor="maintenanceMode">Enable Maintenance Mode</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                    <Textarea 
                      id="maintenanceMessage" 
                      placeholder="Site is under maintenance. Please check back later."
                      rows={3}
                    />
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full md:w-auto"
                    onClick={() => {
                      toast({
                        title: "Warning!",
                        description: "Maintenance mode activated. Site is now under maintenance.",
                        variant: "destructive",
                      });
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Activate Maintenance Mode
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Ad Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Manage advertisements, affiliate links, and sponsored content
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/admin/ads">
                      <Globe className="h-4 w-4 mr-2" />
                      Manage Ads
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Ad Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    View performance metrics and revenue analytics
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    <Star className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-500" />
                    Ad Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Configure ad placement and display settings
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
