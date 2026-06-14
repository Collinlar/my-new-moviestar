import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, User, Shield, Ban, Search, Filter, Calendar, MessageSquare, Star, Eye, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  role: 'user' | 'moderator' | 'admin';
  is_suspended: boolean;
  suspension_reason?: string;
  suspension_until?: string;
  review_count: number;
  average_rating: number;
  last_activity: string;
}

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'moderator' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch users with their profiles and activity
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each profile, get additional data
      const usersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get review count and average rating
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('user_id', profile.user_id);

          const reviewCount = reviews?.length || 0;
          const averageRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          // Get last activity (last review or profile update)
          const lastActivity = profile.updated_at;

          return {
            ...profile,
            role: profile.role || 'user',
            is_suspended: profile.is_suspended || false,
            review_count: reviewCount,
            average_rating: averageRating,
            last_activity: lastActivity
          };
        })
      );

      return usersWithData;
    },
    enabled: !!user && isAdmin,
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "User role updated successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration: number }) => {
      const suspensionUntil = new Date();
      suspensionUntil.setDate(suspensionUntil.getDate() + duration);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: true,
          suspension_reason: reason,
          suspension_until: suspensionUntil.toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "User suspended successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend user",
        variant: "destructive",
      });
    },
  });

  // Unsuspend user mutation
  const unsuspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: false,
          suspension_reason: null,
          suspension_until: null
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "User unsuspended successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsuspend user",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && !user.is_suspended) ||
      (statusFilter === 'suspended' && user.is_suspended);

    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  const handleSuspend = (userId: string) => {
    const reason = prompt('Please provide a reason for suspension:');
    if (reason) {
      const duration = prompt('Suspension duration in days (default: 7):');
      const days = duration ? parseInt(duration) : 7;
      suspendUserMutation.mutate({ userId, reason, duration: days });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'moderator':
        return <Badge variant="default">Moderator</Badge>;
      case 'user':
        return <Badge variant="secondary">User</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (isSuspended: boolean, suspensionUntil?: string) => {
    if (isSuspended) {
      if (suspensionUntil && new Date(suspensionUntil) > new Date()) {
        return <Badge variant="destructive">Suspended</Badge>;
      } else {
        return <Badge variant="secondary">Suspension Expired</Badge>;
      }
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${
          i < rating ? 'text-yellow-500' : 'text-muted-foreground'
        }`}
      >
        ★
      </span>
    ));
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to manage users.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => !u.is_suspended).length || 0;
  const suspendedUsers = users?.filter(u => u.is_suspended).length || 0;
  const moderators = users?.filter(u => u.role === 'moderator').length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, assign roles, and monitor activity</p>
          </div>
          <Link to="/admin">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{totalUsers}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{activeUsers}</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Ban className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold">{suspendedUsers}</div>
              <div className="text-sm text-muted-foreground">Suspended</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto text-purple-500 mb-2" />
              <div className="text-2xl font-bold">{moderators}</div>
              <div className="text-sm text-muted-foreground">Moderators</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name or bio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((userProfile) => (
                  <div key={userProfile.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={userProfile.avatar_url} />
                          <AvatarFallback className="text-lg">
                            {userProfile.display_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-lg">
                              {userProfile.display_name || 'Anonymous User'}
                            </h3>
                            {getRoleBadge(userProfile.role)}
                            {getStatusBadge(userProfile.is_suspended, userProfile.suspension_until)}
                          </div>
                          
                          {userProfile.bio && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {userProfile.bio}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Joined {new Date(userProfile.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {userProfile.review_count} reviews
                            </div>
                            {userProfile.average_rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4" />
                                {userProfile.average_rating.toFixed(1)} avg rating
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              Last active {new Date(userProfile.last_activity).toLocaleDateString()}
                            </div>
                          </div>

                          {userProfile.is_suspended && userProfile.suspension_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Suspension Reason:</strong> {userProfile.suspension_reason}
                              {userProfile.suspension_until && (
                                <span className="block mt-1">
                                  <strong>Until:</strong> {new Date(userProfile.suspension_until).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Link to={`/profile/${userProfile.user_id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>
                        
                        {userProfile.role !== 'admin' && (
                          <Select
                            value={userProfile.role}
                            onValueChange={(value) => updateRoleMutation.mutate({ 
                              userId: userProfile.user_id, 
                              role: value 
                            })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {!userProfile.is_suspended ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleSuspend(userProfile.user_id)}
                            disabled={suspendUserMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => unsuspendUserMutation.mutate(userProfile.user_id)}
                            disabled={unsuspendUserMutation.isPending}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Unsuspend
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
