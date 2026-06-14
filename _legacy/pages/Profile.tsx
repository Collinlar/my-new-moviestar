import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Heart, Edit, Star, Calendar, Film, Globe, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const { id } = useParams();
  
  console.log("Profile ID from useParams:", id);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      if (!id) throw new Error("Profile ID is required");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id, // Only run query when id exists
  });

  const { data: userReviews } = useQuery({
    queryKey: ["user-reviews", id],
    queryFn: async () => {
      if (!id) throw new Error("Profile ID is required");
      
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          movies(title, poster_url)
        `)
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userWatchlist } = useQuery({
    queryKey: ["user-watchlist", id],
    queryFn: async () => {
      if (!id) throw new Error("Profile ID is required");
      
      // First get the watchlist entries
      const { data: watchlistData, error: watchlistError } = await supabase
        .from("watchlists")
        .select("*")
        .eq("user_id", id)
        .order("added_at", { ascending: false });
      
      if (watchlistError) throw watchlistError;
      if (!watchlistData || watchlistData.length === 0) return [];
      
      // Then get the movie details for each watchlist entry
      const movieIds = watchlistData.map(item => item.movie_id);
      const { data: moviesData, error: moviesError } = await supabase
        .from("movies")
        .select("id, title, poster_url, release_year, genre")
        .in("id", movieIds);
      
      if (moviesError) throw moviesError;
      
      // Combine watchlist data with movie data
      return watchlistData.map(watchlistItem => ({
        ...watchlistItem,
        movies: moviesData?.find(movie => movie.id === watchlistItem.movie_id)
      }));
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Profile not found</h2>
              <p className="mt-2 text-muted-foreground">This user profile does not exist.</p>
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
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">
                    {profile.display_name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">
                    {profile.display_name || "Anonymous User"}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Last updated {new Date(profile.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-muted-foreground max-w-2xl">{profile.bio}</p>
                  )}
                </div>
              </div>
              
              {/* Edit Profile Button - Only show if viewing own profile */}
              <Link to="/profile/edit">
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {userReviews?.length || 0}
              </div>
              <p className="text-muted-foreground">Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {userReviews && userReviews.length > 0 
                  ? (userReviews.reduce((acc, review) => acc + review.rating, 0) / userReviews.length).toFixed(1)
                  : "0.0"
                }
              </div>
              <p className="text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {userWatchlist?.length || 0}
              </div>
              <p className="text-muted-foreground">Watchlist</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary">
                {userWatchlist?.filter(item => item.is_favorite).length || 0}
              </div>
              <p className="text-muted-foreground">Favorites</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Details & Preferences */}
          <div className="lg:col-span-1 space-y-6">
            {/* Preferences */}
            {(profile.preferred_genres?.length > 0 || profile.preferred_languages?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.preferred_genres?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Preferred Genres</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.preferred_genres.map((genre) => (
                          <Badge key={genre} variant="secondary" className="capitalize">
                            {formatGenre(genre)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.preferred_languages?.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Preferred Languages</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.preferred_languages.map((language) => (
                          <Badge key={language} variant="outline" className="capitalize">
                            <Globe className="h-3 w-3 mr-1" />
                            {formatLanguage(language)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {profile.notification_preferences && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email notifications</span>
                    <Badge variant={(profile.notification_preferences as any)?.email_notifications ? "default" : "secondary"}>
                      {(profile.notification_preferences as any)?.email_notifications ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Review mentions</span>
                    <Badge variant={(profile.notification_preferences as any)?.review_mentions ? "default" : "secondary"}>
                      {(profile.notification_preferences as any)?.review_mentions ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New movie alerts</span>
                    <Badge variant={(profile.notification_preferences as any)?.new_movie_alerts ? "default" : "secondary"}>
                      {(profile.notification_preferences as any)?.new_movie_alerts ? "On" : "Off"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Reviews */}
            {userReviews && userReviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Recent Reviews ({userReviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{review.movies?.title}</h4>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-sm ${
                                i < review.rating ? 'text-yellow-500' : 'text-muted-foreground'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-muted-foreground text-sm">{review.review_text}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                      <Separator />
                    </div>
                  ))}
                  {userReviews.length > 5 && (
                    <div className="text-center pt-2">
                      <Link to={`/all-reviews?user=${id}`}>
                        <Button variant="outline" size="sm">
                          View All Reviews
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Watchlist */}
            {userWatchlist && userWatchlist.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    Watchlist ({userWatchlist.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userWatchlist.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <div className="w-12 h-16 bg-muted rounded flex-shrink-0">
                        {item.movies?.poster_url && (
                          <img 
                            src={item.movies.poster_url} 
                            alt={item.movies.title}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{item.movies?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.movies?.release_year} • {item.movies?.genre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(item.added_at).toLocaleDateString()}
                        </p>
                        {item.is_favorite && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            <Heart className="h-3 w-3 mr-1 fill-current" />
                            Favorite
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {userWatchlist.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View Full Watchlist
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty States */}
            {(!userReviews || userReviews.length === 0) && (!userWatchlist || userWatchlist.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No activity yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start exploring African cinema by rating movies and building your watchlist!
                  </p>
                  <Link to="/browse">
                    <Button>Browse Movies</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;