import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Filter, 
  Search, 
  Flag,
  MessageSquare,
  User,
  Film,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContentFlag {
  id: string;
  content_type: 'review' | 'movie' | 'user' | 'comment';
  content_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  action_taken?: string;
  content: {
    id: string;
    title?: string;
    review_text?: string;
    display_name?: string;
  };
  reporter: {
    display_name: string;
    avatar_url?: string;
  };
}

const ContentFlagging = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'review' | 'movie' | 'user' | 'comment'>('all');

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch content flags
  const { data: flags, isLoading, refetch } = useQuery({
    queryKey: ['content-flags'],
    queryFn: async () => {
      // For now, we'll simulate content flags since we don't have a flags table yet
      // In a real implementation, this would fetch from a content_flags table
      const mockFlags: ContentFlag[] = [
        {
          id: '1',
          content_type: 'review',
          content_id: 'review1',
          reporter_id: 'user1',
          reason: 'Inappropriate language',
          description: 'Contains offensive language and slurs',
          status: 'pending',
          priority: 'high',
          created_at: new Date().toISOString(),
          content: {
            id: 'review1',
            review_text: 'This movie was terrible and offensive'
          },
          reporter: {
            display_name: 'Moderator1',
            avatar_url: null
          }
        },
        {
          id: '2',
          content_type: 'movie',
          content_id: 'movie1',
          reporter_id: 'user2',
          reason: 'Inappropriate content',
          description: 'Movie contains graphic violence',
          status: 'reviewed',
          priority: 'medium',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'admin1',
          action_taken: 'Added content warning',
          content: {
            id: 'movie1',
            title: 'Action Movie'
          },
          reporter: {
            display_name: 'User2',
            avatar_url: null
          }
        }
      ];

      return mockFlags;
    },
    enabled: !!user && isAdmin,
  });

  // Resolve flag mutation
  const resolveFlagMutation = useMutation({
    mutationFn: async ({ flagId, action, notes }: { flagId: string; action: string; notes: string }) => {
      // In a real implementation, this would update the flag status
      console.log('Resolving flag:', flagId, action, notes);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Content flag resolved successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve flag",
        variant: "destructive",
      });
    },
  });

  // Dismiss flag mutation
  const dismissFlagMutation = useMutation({
    mutationFn: async ({ flagId, reason }: { flagId: string; reason: string }) => {
      // In a real implementation, this would update the flag status
      console.log('Dismissing flag:', flagId, reason);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Content flag dismissed successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss flag",
        variant: "destructive",
      });
    },
  });

  // Filter flags based on search and filters
  const filteredFlags = flags?.filter((flag) => {
    const matchesSearch = 
      flag.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.content.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.content.review_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flag.reporter.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || flag.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || flag.priority === priorityFilter;
    const matchesContentType = contentTypeFilter === 'all' || flag.content_type === contentTypeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesContentType;
  }) || [];

  const handleResolve = (flagId: string) => {
    const action = prompt('What action was taken? (e.g., "Removed content", "Added warning", "Suspended user"):');
    if (action) {
      const notes = prompt('Additional notes (optional):');
      resolveFlagMutation.mutate({ flagId, action, notes: notes || '' });
    }
  };

  const handleDismiss = (flagId: string) => {
    const reason = prompt('Why is this flag being dismissed?');
    if (reason) {
      dismissFlagMutation.mutate({ flagId, reason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline">Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="default">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="destructive">Dismissed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'high':
        return <Badge variant="default">High</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'review':
        return <MessageSquare className="h-4 w-4" />;
      case 'movie':
        return <Film className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to access content flagging.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingCount = flags?.filter(f => f.status === 'pending').length || 0;
  const highPriorityCount = flags?.filter(f => f.priority === 'high' || f.priority === 'critical').length || 0;
  const resolvedCount = flags?.filter(f => f.status === 'resolved').length || 0;
  const totalCount = flags?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Flagging</h1>
            <p className="text-muted-foreground">Review and manage flagged content reports</p>
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
              <Flag className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">Total Flags</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <div className="text-2xl font-bold">{highPriorityCount}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">{resolvedCount}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search flags, content, or users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content Type</label>
                <Select value={contentTypeFilter} onValueChange={(value: any) => setContentTypeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="review">Reviews</SelectItem>
                    <SelectItem value="movie">Movies</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="comment">Comments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flags List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Content Flags ({filteredFlags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading content flags...</p>
              </div>
            ) : filteredFlags.length > 0 ? (
              <div className="space-y-4">
                {filteredFlags.map((flag) => (
                  <div key={flag.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {getContentTypeIcon(flag.content_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              {getContentTypeIcon(flag.content_type)}
                              <span className="text-sm text-muted-foreground capitalize">
                                {flag.content_type}
                              </span>
                            </div>
                            {getStatusBadge(flag.status)}
                            {getPriorityBadge(flag.priority)}
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <strong>Reason:</strong> {flag.reason}
                            </div>
                            <div>
                              <strong>Description:</strong> {flag.description}
                            </div>
                            {flag.content.title && (
                              <div>
                                <strong>Content:</strong> {flag.content.title}
                              </div>
                            )}
                            {flag.content.review_text && (
                              <div>
                                <strong>Review:</strong> 
                                <p className="text-sm text-muted-foreground mt-1">
                                  {flag.content.review_text}
                                </p>
                              </div>
                            )}
                            {flag.action_taken && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                                <strong>Action Taken:</strong> {flag.action_taken}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Reported by: {flag.reporter.display_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(flag.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        {flag.status === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleResolve(flag.id)}
                              disabled={resolveFlagMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Resolve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDismiss(flag.id)}
                              disabled={dismissFlagMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Dismiss
                            </Button>
                          </>
                        )}
                        
                        {flag.content_type === 'movie' && flag.content.id && (
                          <Link to={`/movie/${flag.content.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Content
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content flags found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentFlagging;
