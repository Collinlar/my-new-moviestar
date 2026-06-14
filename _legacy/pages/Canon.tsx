import { Award, Film, Star, Play } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { MovieCard } from "@/components/MovieCard";
import SEOHead from "@/components/SEOHead";
import { useFeaturedMovies } from "@/hooks/useMovies";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WatchlistButton } from "@/components/WatchlistButton";

const Canon = () => {
  const { movies: canonMovies, loading } = useFeaturedMovies(20);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="African Film Canon | Landmark Films in African Cinema | MuvieStars"
        description="Explore the essential films that define African cinema history. From pioneering works of the 1960s to modern masterpieces, discover the landmark movies that shaped African storytelling."
        keywords="African film canon, essential African movies, landmark African cinema, classic Nollywood films, African film history, must-watch African movies, African cinema masterpieces"
        type="website"
      />
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-amber-900/10 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Award className="w-8 h-8 text-zinc-900" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              The African Film Canon
            </h1>
            <p className="text-xl text-zinc-200 max-w-3xl mx-auto leading-relaxed">
              A curated collection of landmark films that have shaped African storytelling across generations — 
              from pioneering works of independence-era cinema to contemporary masterpieces.
            </p>
            <div className="flex justify-center items-center gap-8 text-sm pt-6">
              <div className="flex items-center gap-2 bg-zinc-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-500/30">
                <Film className="w-4 h-4 text-amber-400" />
                <span className="text-amber-100 font-medium">{canonMovies.length} Essential Films</span>
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-500/30">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-amber-100 font-medium">Curated by Experts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 bg-zinc-900">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="bg-zinc-800 border-amber-500/40 shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></span>
                What is the Canon?
              </h2>
              <div className="space-y-4">
                <p className="text-zinc-100 leading-relaxed">
                  The African Film Canon represents the essential works that every student, scholar, and lover 
                  of African cinema should experience. These films have been selected based on their artistic 
                  innovation, cultural significance, historical importance, and lasting influence on African 
                  and global cinema.
                </p>
                <p className="text-zinc-200 leading-relaxed">
                  From Ousmane Sembène&apos;s groundbreaking <em className="text-amber-400 not-italic font-medium">La Noire de...</em> (1966) — often considered the 
                  first Sub-Saharan African feature film — to the explosive growth of Nollywood in the 1990s 
                  and today&apos;s acclaimed international co-productions, this collection traces the evolution 
                  of African filmmaking across decades and borders.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Canon Films Grid */}
      <section className="py-16 bg-gradient-to-br from-rose-100/80 via-rose-50 to-orange-50/60 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-2">Essential Films</h2>
            <p className="text-muted-foreground">
              Landmark works that define African cinema, presented with historical context and editorial notes.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-zinc-800 rounded-lg h-72 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : canonMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {canonMovies.map((movie) => (
                <CanonFilmCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-zinc-800 rounded-full flex items-center justify-center">
                <Award className="w-10 h-10 text-amber-400" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Canon Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our editorial team is carefully curating the definitive collection of landmark African films. 
                Check back soon to explore the canon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-amber-50 mb-4">
            Help Build the Canon
          </h2>
          <p className="text-xl text-zinc-300 mb-8">
            Are we missing a landmark film? Let us know which essential African films should be added to the canon.
          </p>
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-900 font-semibold rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
          >
            Suggest a Film
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Film className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              MuvieStars.com
            </span>
          </div>
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 MuvieStars.com. Preserving and celebrating African cinema.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Extended Canon Film Card with more details
interface CanonFilmCardProps {
  movie: {
    id: string;
    title: string;
    release_year: number;
    genre: string;
    average_rating: number;
    review_count: number;
    poster_url: string;
    language: string;
    description?: string;
    editor_note?: string;
    cultural_context?: string;
    director?: string;
    country?: string;
  };
}

const CanonFilmCard = ({ movie }: CanonFilmCardProps) => {
  return (
    <Link to={`/movie/${movie.id}`} className="block group">
      <Card className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-b from-zinc-900 to-zinc-950 border-amber-500/40 ring-1 ring-amber-400/20 shadow-lg shadow-amber-900/10 overflow-hidden">
        <div className="relative overflow-hidden">
          <img 
            src={movie.poster_url} 
            alt={`${movie.title} poster`}
            className="w-full h-72 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-amber-500/90 rounded-full p-3">
              <Play className="w-6 h-6 fill-current text-zinc-900" />
            </div>
          </div>
          
          {/* Language Badge */}
          <Badge className="absolute top-3 right-3 bg-amber-500 text-zinc-900 font-semibold border-0">
            {movie.language.charAt(0).toUpperCase() + movie.language.slice(1)}
          </Badge>
          
          {/* Canon Badge */}
          <div className="absolute top-3 left-3 w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-900 rounded-full flex items-center justify-center shadow-lg">
            <Award className="w-4 h-4" />
          </div>
          
          {/* Watchlist Button */}
          <div className="absolute bottom-3 right-3">
            <WatchlistButton 
              movieId={movie.id}
              movieTitle={movie.title}
              variant="ghost" 
              size="sm" 
              showText={false}
            />
          </div>

          {/* Director & Country overlay */}
          {(movie.director || movie.country) && (
            <div className="absolute bottom-3 left-3 right-12">
              <p className="text-xs text-zinc-300 truncate">
                {movie.director && <span>Dir. {movie.director}</span>}
                {movie.director && movie.country && <span> • </span>}
                {movie.country && <span>{movie.country}</span>}
              </p>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 text-amber-50 group-hover:text-amber-300 transition-colors">
              {movie.title}
            </h3>
            <div className="flex items-center justify-between text-sm text-zinc-400 mt-1">
              <span>{movie.release_year}</span>
              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">
                {movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Editor Note or Description */}
          {(movie.editor_note || movie.description) && (
            <p className="text-sm text-zinc-400 line-clamp-2 italic">
              {movie.editor_note || movie.description}
            </p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(movie.average_rating)
                      ? "text-amber-400 fill-current"
                      : "text-zinc-600"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-amber-50">
              {movie.average_rating.toFixed(1)}
            </span>
            <span className="text-sm text-zinc-400">
              ({movie.review_count} reviews)
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Canon;
