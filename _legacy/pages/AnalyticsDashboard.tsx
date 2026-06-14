import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  Users, 
  Film, 
  MessageSquare, 
  Star, 
  Eye, 
  Calendar, 
  Globe, 
  BarChart3, 
  PieChart,
  Shield,
  ArrowUp,
  ArrowDown,
  Minus,
  Download,
  RefreshCw,
  Clock,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AnalyticsData {
  totalUsers: number;
  totalMovies: number;
  totalReviews: number;
  totalWatchlists: number;
  averageRating: number;
  topMovies: Array<{
    id: string;
    title: string;
    poster_url: string | null;
    review_count: number;
    average_rating: number;
    watchlist_count: number;
  }>;
  topGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  topLanguages: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    newUsers: number;
    newMovies: number;
    newReviews: number;
  }>;
  userActivity: {
    activeUsers: number;
    inactiveUsers: number;
    newUsersThisMonth: number;
    returningUsers: number;
  };
}

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1d' | '1y'>('30d');
  const [isRealTime, setIsRealTime] = useState(false);

  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Get total counts
      const [usersData, moviesData, reviewsData, watchlistsData] = await Promise.all([
        supabase.from('profiles').select('created_at'),
        supabase.from('movies').select('created_at'),
        supabase.from('reviews').select('created_at, rating'),
        supabase.from('watchlists').select('created_at')
      ]);

      // Get top movies by review count and rating
      const { data: topMovies } = await supabase
        .from('movies')
        .select(`
          id,
          title,
          poster_url,
          review_count,
          average_rating
        `)
        .order('review_count', { ascending: false })
        .limit(10);

      // Get watchlist counts for top movies
      const moviesWithWatchlists = await Promise.all(
        (topMovies || []).map(async (movie) => {
          const { count } = await supabase
            .from('watchlists')
            .select('*', { count: 'exact', head: true })
            .eq('movie_id', movie.id);
          
          return {
            ...movie,
            watchlist_count: count || 0
          };
        })
      );

      // Get genre distribution
      const { data: movies } = await supabase
        .from('movies')
        .select('genre');

      const genreCounts: { [key: string]: number } = {};
      movies?.forEach(movie => {
        genreCounts[movie.genre] = (genreCounts[movie.genre] || 0) + 1;
      });

      const totalMoviesCount = movies?.length || 0;
      const topGenres = Object.entries(genreCounts)
        .map(([genre, count]) => ({
          genre,
          count,
          percentage: (count / totalMoviesCount) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Get language distribution
      const { data: moviesWithLang } = await supabase
        .from('movies')
        .select('language');

      const languageCounts: { [key: string]: number } = {};
      moviesWithLang?.forEach(movie => {
        languageCounts[movie.language] = (languageCounts[movie.language] || 0) + 1;
      });

      const topLanguages = Object.entries(languageCounts)
        .map(([language, count]) => ({
          language,
          count,
          percentage: (count / totalMoviesCount) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Get monthly statistics
      const monthlyStats = [];
      for (let i = 0; i < 6; i++) {
        const monthDate = new Date();
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthKey = monthDate.toISOString().slice(0, 7);

        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        const [newUsers, newMovies, newReviews] = await Promise.all([
          supabase
            .from('profiles')
            .select('created_at')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('movies')
            .select('created_at')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString()),
          supabase
            .from('reviews')
            .select('created_at')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString())
        ]);

        monthlyStats.unshift({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          newUsers: newUsers.data?.length || 0,
          newMovies: newMovies.data?.length || 0,
          newReviews: newReviews.data?.length || 0
        });
      }

      // Get user activity stats
      const activeUsers = usersData.data?.filter(u => 
        new Date(u.created_at) >= startDate
      ).length || 0;

      const newUsersThisMonth = usersData.data?.filter(u => {
        const userDate = new Date(u.created_at);
        return userDate.getMonth() === now.getMonth() && 
               userDate.getFullYear() === now.getFullYear();
      }).length || 0;

      const totalUsersCount = usersData.data?.length || 0;
      const inactiveUsers = totalUsersCount - activeUsers;

      // Calculate average rating
      const allRatings = reviewsData.data?.map(r => r.rating) || [];
      const averageRating = allRatings.length > 0 
        ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
        : 0;

      return {
        totalUsers: totalUsersCount,
        totalMovies: totalMoviesCount,
        totalReviews: reviewsData.data?.length || 0,
        totalWatchlists: watchlistsData.data?.length || 0,
        averageRating,
        topMovies: moviesWithWatchlists,
        topGenres,
        topLanguages,
        monthlyStats,
        userActivity: {
          activeUsers,
          inactiveUsers,
          newUsersThisMonth,
          returningUsers: activeUsers - newUsersThisMonth
        }
      };
    },
    enabled: !!user && isAdmin,
  });

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // Export analytics data
  const exportAnalytics = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value', 'Change'],
      ['Total Users', analytics.totalUsers.toString(), ''],
      ['Total Movies', analytics.totalMovies.toString(), ''],
      ['Total Reviews', analytics.totalReviews.toString(), ''],
      ['Total Watchlists', analytics.totalWatchlists.toString(), ''],
      ['Average Rating', analytics.averageRating.toFixed(2), ''],
      ['', '', ''],
      ['Top Movies', 'Review Count', 'Average Rating'],
      ...analytics.topMovies.map(movie => [
        movie.title,
        movie.review_count.toString(),
        movie.average_rating.toFixed(2)
      ]),
      ['', '', ''],
      ['Genre', 'Count', 'Percentage'],
      ...analytics.topGenres.map(genre => [
        genre.genre,
        genre.count.toString(),
        `${genre.percentage.toFixed(1)}%`
      ]),
      ['', '', ''],
      ['Language', 'Count', 'Percentage'],
      ...analytics.topLanguages.map(lang => [
        lang.language,
        lang.count.toString(),
        `${lang.percentage.toFixed(1)}%`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Real-time refresh interval
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      // Refetch data every 30 seconds in real-time mode
      window.location.reload();
    }, 30000);

    return () => clearInterval(interval);
  }, [isRealTime]);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to view analytics.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading || !analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Platform insights and user engagement metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Link to="/admin">
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{analytics.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getChangeIcon(analytics.userActivity.newUsersThisMonth)}
                <span className="text-sm text-muted-foreground">
                  +{analytics.userActivity.newUsersThisMonth} this month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Movies</p>
                  <p className="text-3xl font-bold">{analytics.totalMovies.toLocaleString()}</p>
                </div>
                <Film className="h-8 w-8 text-green-500" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getChangeIcon(analytics.monthlyStats[analytics.monthlyStats.length - 1]?.newMovies || 0)}
                <span className="text-sm text-muted-foreground">
                  +{analytics.monthlyStats[analytics.monthlyStats.length - 1]?.newMovies || 0} this month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                  <p className="text-3xl font-bold">{analytics.totalReviews.toLocaleString()}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-500" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {getChangeIcon(analytics.monthlyStats[analytics.monthlyStats.length - 1]?.newReviews || 0)}
                <span className="text-sm text-muted-foreground">
                  +{analytics.monthlyStats[analytics.monthlyStats.length - 1]?.newReviews || 0} this month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                  <p className="text-3xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">
                  Out of 5 stars
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Movies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Movies by Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topMovies.slice(0, 5).map((movie, index) => (
                  <div key={movie.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Film className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{movie.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{movie.review_count} reviews</span>
                        <span>{movie.average_rating.toFixed(1)}★</span>
                        <span>{movie.watchlist_count} in watchlists</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Genre Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Genre Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topGenres.map((genre) => (
                  <div key={genre.genre} className="flex items-center justify-between">
                    <span className="capitalize">{genre.genre}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${genre.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {genre.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {analytics.monthlyStats.map((stat, index) => (
                <div key={stat.month} className="text-center p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">{stat.month}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Users:</span>
                      <span className="font-medium">{stat.newUsers}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Movies:</span>
                      <span className="font-medium">{stat.newMovies}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Reviews:</span>
                      <span className="font-medium">{stat.newReviews}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analytics.topLanguages.map((lang) => (
                <div key={lang.language} className="text-center p-4 border rounded-lg">
                  <p className="text-lg font-medium capitalize">{lang.language}</p>
                  <p className="text-2xl font-bold text-primary">{lang.count}</p>
                  <p className="text-sm text-muted-foreground">
                    {lang.percentage.toFixed(1)}% of total
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
