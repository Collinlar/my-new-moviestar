import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Heart, 
  Star, 
  Film, 
  TrendingUp, 
  Calendar, 
  Globe, 
  User, 
  Settings,
  Plus,
  MessageSquare,
  Eye,
  Clock,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch user's profile
  const { data: profile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's recent reviews
  const { data: recentReviews } = useQuery({
    queryKey: ['recent-reviews', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          movies(title, poster_url, genre, language)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's watchlist summary
  const { data: watchlistSummary } = useQuery({
    queryKey: ['watchlist-summary', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const favorites = data?.filter(item => item.is_favorite).length || 0;
      const recent = data?.slice(0, 3) || [];
      
      return { total, favorites, recent };
    },
    enabled: !!user,
  });

  // Fetch user's activity stats
  const { data: activityStats } = useQuery({
    queryKey: ['activity-stats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const [reviewsResult, watchlistResult] = await Promise.all([
        supabase
          .from('reviews')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('watchlists')
          .select('added_at')
          .eq('user_id', user.id)
          .gte('added_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const reviewsThisMonth = reviewsResult.data?.length || 0;
      const watchlistAdditions = watchlistResult.data?.length || 0;

      return { reviewsThisMonth, watchlistAdditions };
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Authentication Required</h2>
              <p className="mt-2 text-muted-foreground">Please sign in to view your dashboard.</p>
              <Link to="/auth">
                <Button className="mt-4">Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, {(() => {
              if (profile?.display_name) return profile.display_name;
              if (user.user_metadata?.full_name) return user.user_metadata.full_name;
              // Format email username to look more like a name
              const emailPart = user.email?.split('@')[0];
              if (emailPart) {
                return emailPart
                  .split(/[._-]/)
                  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(' ');
              }
              return 'there';
            })()}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            Here's what's happening with your African cinema journey
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {recentReviews?.length || 0}
              </div>
              <p className="text-muted-foreground">Total Reviews</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {watchlistSummary?.total || 0}
              </div>
              <p className="text-muted-foreground">Watchlist Items</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {activityStats?.reviewsThisMonth || 0}
              </div>
              <p className="text-muted-foreground">Reviews This Month</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">
                {watchlistSummary?.favorites || 0}
              </div>
              <p className="text-muted-foreground">Favorites</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {profile?.display_name || 'Anonymous User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>
                
                {profile?.bio && (
                  <p className="text-muted-foreground text-sm">{profile.bio}</p>
                )}

                <div className="space-y-2">
                  <Link to="/profile/edit">
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            {(profile?.preferred_genres?.length > 0 || profile?.preferred_languages?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Your Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.preferred_genres?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Preferred Genres</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.preferred_genres.slice(0, 3).map((genre) => (
                          <Badge key={genre} variant="secondary" className="capitalize">
                            {formatGenre(genre)}
                          </Badge>
                        ))}
                        {profile.preferred_genres.length > 3 && (
                          <Badge variant="outline">+{profile.preferred_genres.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {profile.preferred_languages?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Preferred Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.preferred_languages.slice(0, 3).map((language) => (
                          <Badge key={language} variant="outline" className="capitalize">
                            <Globe className="h-3 w-3 mr-1" />
                            {formatLanguage(language)}
                          </Badge>
                        ))}
                        {profile.preferred_languages.length > 3 && (
                          <Badge variant="outline">+{profile.preferred_languages.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/browse">
                  <Button variant="outline" className="w-full justify-start">
                    <Film className="h-4 w-4 mr-2" />
                    Browse Movies
                  </Button>
                </Link>
                <Link to="/watchlist">
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    View Watchlist
                  </Button>
                </Link>
                <Link to="/reviews">
                  <Button variant="outline" className="w-full justify-start">
                    <Star className="h-4 w-4 mr-2" />
                    My Reviews
                  </Button>
                </Link>
                <Link to="/favorites">
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    My Favorites
                  </Button>
                </Link>
                <Link to="/activity">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Feed
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentReviews && recentReviews.length > 0 ? (
                  <div className="space-y-4">
                    {recentReviews.map((review) => (
                      <div key={review.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-16 bg-muted rounded flex-shrink-0">
                          {review.movies?.poster_url && (
                            <img 
                              src={review.movies.poster_url} 
                              alt={review.movies.title}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold truncate">{review.movies?.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {formatGenre(review.movies?.genre || '')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < review.rating
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            <span>•</span>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                          {review.review_text && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {review.review_text}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <Link to="/reviews">
                        <Button variant="outline" size="sm">
                          View All Reviews
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">⭐</div>
                    <p className="text-muted-foreground mb-4">No reviews yet. Start rating movies!</p>
                    <Link to="/browse">
                      <Button>Browse Movies</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Watchlist Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Watchlist Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {watchlistSummary && watchlistSummary.total > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{watchlistSummary.total}</div>
                        <div className="text-sm text-muted-foreground">Total Items</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{watchlistSummary.favorites}</div>
                        <div className="text-sm text-muted-foreground">Favorites</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Link to="/watchlist">
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Manage Watchlist
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎬</div>
                    <p className="text-muted-foreground mb-4">Your watchlist is empty. Start building your collection!</p>
                    <Link to="/browse">
                      <Button>Browse Movies</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Activity Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  This Month's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Reviews Posted</span>
                    </div>
                    <Badge variant="secondary">{activityStats?.reviewsThisMonth || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>Movies Added to Watchlist</span>
                    </div>
                    <Badge variant="secondary">{activityStats?.watchlistAdditions || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
