import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Constants } from "@/integrations/supabase/types";

const GenreMoodSection = () => {
  // Fetch genres that have at least one movie
  const { data: activeGenres, isLoading } = useQuery({
    queryKey: ["active-genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("genre");
      
      if (error) throw error;
      
      // Get unique genres from movies
      const genreSet = new Set(data.map(movie => movie.genre));
      return Array.from(genreSet);
    },
  });

  // Map genres to display labels
  const genreLabels: Record<string, string> = {
    action: "Action",
    comedy: "Comedy",
    drama: "Drama",
    romance: "Romance",
    thriller: "Thriller",
    horror: "Horror",
    adventure: "Adventure",
    family: "Family",
    documentary: "Documentary",
    musical: "Musical",
    historical: "Historical",
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">Browse by Mood & Genre</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!activeGenres || activeGenres.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Browse by Mood & Genre</h2>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          {activeGenres.map((genre) => (
            <Link
              key={genre}
              to={`/movies?genre=${genre}`}
              className="px-5 py-2.5 rounded-full bg-background border border-border text-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {genreLabels[genre] || genre}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GenreMoodSection;
