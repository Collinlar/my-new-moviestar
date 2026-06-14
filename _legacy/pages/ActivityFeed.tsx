import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Star, 
  Heart, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Calendar, 
  Film, 
  Search, 
  Filter, 
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  type: 'review' | 'watchlist_add' | 'watchlist_remove' | 'favorite_toggle' | 'profile_update';
  timestamp: string;
  title: string;
  description: string;
  movie_id?: string;
  movie_title?: string;
  movie_poster?: string;
  rating?: number;
  review_text?: string;
  icon: React.ReactNode;
  color: string;
}

const ActivityFeed = () => {
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    dateRange: 'all'
  });

  // Fetch user's activity
  const { data: activities, isLoading } = useQuery({
    queryKey: ['user-activity', user?.id, filters],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const activities: ActivityItem[] = [];

      // Fetch reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          updated_at,
          movies(id, title, poster_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!reviewsError && reviews) {
        reviews.forEach(review => {
          activities.push({
            id: `review-${review.id}`,
            type: 'review',
            timestamp: review.created_at,
            title: `Reviewed "${review.movies?.title}"`,
            description: review.review_text || `Rated ${review.rating} stars`,
            movie_id: review.movies?.id,
            movie_title: review.movies?.title,
            movie_poster: review.movies?.poster_url,
            rating: review.rating,
            review_text: review.review_text,
            icon: <Star className="h-4 w-4 fill-current" />,
            color: 'text-yellow-600'
          });
        });
      }

      // Fetch watchlist activity
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .select(`
          id,
          movie_id,
          is_favorite,
          added_at,
          movies(id, title, poster_url)
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (!watchlistError && watchlist) {
        watchlist.forEach(item => {
          // Add to watchlist
          activities.push({
            id: `watchlist-add-${item.id}`,
            type: 'watchlist_add',
            timestamp: item.added_at,
            title: `Added "${item.movies?.title}" to watchlist`,
            description: 'Added to your movie collection',
            movie_id: item.movies?.id,
            movie_title: item.movies?.title,
            movie_poster: item.movies?.poster_url,
            icon: <Plus className="h-4 w-4" />,
            color: 'text-green-600'
          });

          // Favorite toggle
          if (item.is_favorite) {
            activities.push({
              id: `favorite-${item.id}`,
              type: 'favorite_toggle',
              timestamp: item.added_at,
              title: `Favorited "${item.movies?.title}"`,
              description: 'Marked as favorite',
              movie_id: item.movies?.id,
              movie_title: item.movies?.title,
              movie_poster: item.movies?.poster_url,
              icon: <Heart className="h-4 w-4 fill-current" />,
              color: 'text-red-600'
            });
          }
        });
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply filters
      let filteredActivities = activities;

      if (filters.type !== 'all') {
        filteredActivities = filteredActivities.filter(activity => activity.type === filters.type);
      }

      if (filters.search) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          activity.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          activity.movie_title?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            cutoffDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        filteredActivities = filteredActivities.filter(activity => 
          new Date(activity.timestamp) >= cutoffDate
        );
      }

      return filteredActivities;
    },
    enabled: !!user,
  });

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'review': return 'Reviews';
      case 'watchlist_add': return 'Watchlist Additions';
      case 'favorite_toggle': return 'Favorites';
      case 'profile_update': return 'Profile Updates';
      default: return 'All Activities';
    }
  };

  const getActivityTypeCount = (type: string) => {
    if (!activities) return 0;
    if (type === 'all') return activities.length;
    return activities.filter(activity => activity.type === type).length;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Authentication Required</h2>
              <p className="mt-2 text-muted-foreground">Please sign in to view your activity feed.</p>
              <Link to="/auth">
                <Button className="mt-4">Sign In</Button>
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
            <Activity className="h-8 w-8 text-blue-500" />
            <h1 className="text-4xl font-bold text-foreground">Activity Feed</h1>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-lg text-muted-foreground">
            Track your movie journey and community contributions
          </p>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getActivityTypeCount('all')}
              </div>
              <div className="text-sm text-blue-700">Total Activities</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {getActivityTypeCount('review')}
              </div>
              <div className="text-sm text-yellow-700">Reviews Posted</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {getActivityTypeCount('watchlist_add')}
              </div>
              <div className="text-sm text-green-700">Movies Added</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {getActivityTypeCount('favorite_toggle')}
              </div>
              <div className="text-sm text-red-700">Favorites</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Activity Type</label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="review">Reviews</SelectItem>
                    <SelectItem value="watchlist_add">Watchlist Additions</SelectItem>
                    <SelectItem value="favorite_toggle">Favorites</SelectItem>
                    <SelectItem value="profile_update">Profile Updates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                    <SelectItem value="year">Past Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
              </h2>
            </div>

            {activities.map((activity) => (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Activity Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ${activity.color}`}>
                      {activity.icon}
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{activity.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                          
                          {/* Movie Info */}
                          {activity.movie_id && (
                            <div className="flex items-center gap-3 mt-3">
                              {activity.movie_poster && (
                                <img 
                                  src={activity.movie_poster} 
                                  alt={activity.movie_title}
                                  className="w-12 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <Link 
                                  to={`/movie/${activity.movie_id}`}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {activity.movie_title}
                                </Link>
                                
                                {/* Rating Display */}
                                {activity.rating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < activity.rating!
                                            ? 'text-yellow-500 fill-current'
                                            : 'text-muted-foreground'
                                        }`}
                                      />
                                    ))}
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {activity.rating} stars
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-4">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No activities yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your activity feed by reviewing movies, adding to your watchlist, and marking favorites!
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/browse">
                  <Button>Browse Movies</Button>
                </Link>
                <Link to="/watchlist">
                  <Button variant="outline">View Watchlist</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
