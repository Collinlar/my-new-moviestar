import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navigation } from "@/components/Navigation";
import { Link } from "react-router-dom";

const Profiles = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card>
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4" />
                    <div className="h-4 bg-muted rounded w-24 mx-auto mb-2" />
                    <div className="h-3 bg-muted rounded w-16 mx-auto" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Community Members</h1>
          <p className="text-muted-foreground mt-2">
            Discover fellow movie enthusiasts and their reviews
          </p>
        </div>

        {profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/profile/${profile.id}`}
                className="group"
              >
                <Card className="transition-all duration-200 group-hover:shadow-lg group-hover:scale-105">
                  <CardContent className="p-6 text-center">
                    <Avatar className="w-16 h-16 mx-auto mb-4">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {profile.display_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {profile.display_name || "Anonymous User"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                No profiles found
              </h2>
              <p className="text-muted-foreground">
                Be the first to create a profile and join the community!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profiles;