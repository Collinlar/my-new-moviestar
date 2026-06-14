import { Star, TrendingUp, Film, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { MovieCard } from "@/components/MovieCard";
import { TrendingCard } from "@/components/TrendingCard";
import { MovieCardHorizontal } from "@/components/MovieCardHorizontal";
import CreatorCard from "@/components/CreatorCard";
import TopReviews from "@/components/TopReviews";
import TopReviewers from "@/components/TopReviewers";
import SearchBar from "@/components/SearchBar";
import GenreMoodSection from "@/components/GenreMoodSection";
import SEOHead, { generateWebsiteSchema, generateOrganizationSchema } from "@/components/SEOHead";
import { useTopCreators } from "@/hooks/useCreators";
import { useFeaturedMovies, useTrendingMovies } from "@/hooks/useMovies";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-cinema.jpg";





const Index = () => {
  const { data: creators, isLoading: creatorsLoading } = useTopCreators(4);
  const { movies: featuredMovies, loading: featuredLoading } = useFeaturedMovies(4);
  const { movies: trendingMovies, loading: trendingLoading } = useTrendingMovies(8);
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="The African Movie Database | MuvieStars"
        description="Explore Africa's most complete collection of movies, filmmakers, and reviews — from timeless classics to new releases across Nollywood, Ghallywood, and beyond."
        keywords="African movie database, Nollywood films, Ghallywood movies, African cinema archive, African filmmakers, African actors, movie reviews, African film history"
        type="website"
        schema={{
          "@context": "https://schema.org",
          "@graph": [generateWebsiteSchema(), generateOrganizationSchema()]
        }}
      />
      <Navigation />
      
    
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Multi-layer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-rose-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        
        {/* Background image with blend */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="African Cinema Hero"
            className="w-full h-full object-cover mix-blend-overlay opacity-40"
          />
        </div>
        
        {/* Decorative radial gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-rose-900/40 via-transparent to-transparent" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32 lg:py-40 w-full">
          <div className="text-center space-y-8">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white/90 text-sm animate-fade-in">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Now documenting 8,350+ African films
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight animate-fade-in">
              The African
              <span className="block bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                Movie Database
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed animate-fade-in font-light">
              Explore Africa's most complete collection of movies, filmmakers, and reviews — from timeless classics to new releases.
            </p>
            
            <p className="text-base text-white/70 max-w-2xl mx-auto animate-fade-in">
              Discover films across Nollywood, Ghallywood, Francophone Africa, and beyond — even those no longer available to watch.
            </p>
            
            {/* Hero Search */}
            <div className="max-w-2xl mx-auto pt-4 animate-fade-in">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search African movies, actors, directors, or countries..."
                className="hero-search"
              />
            </div>

            {/* Stats */}
            <div className="flex justify-center items-center gap-6 sm:gap-10 text-white/90 text-sm flex-wrap pt-6 animate-fade-in">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Film className="w-4 h-4 text-amber-300" />
                <span className="font-medium">8,350+ African Movies</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <Star className="w-4 h-4 text-amber-300" />
                <span className="font-medium">15K+ Community Reviews</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                <TrendingUp className="w-4 h-4 text-amber-300" />
                <span className="font-medium">Preserving African Cinema Daily</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Browse by Mood & Genre */}
      <GenreMoodSection />

      {/* Featured Movies */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Editor's Picks from African Cinema</h2>
              <p className="text-muted-foreground">Curated selections from Africa's growing movie archive</p>
            </div>
            <Link to="/featured">
              <Button variant="outline" className="hidden sm:inline-flex">
                View All Picks
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredLoading ? (
              // Loading skeletons for horizontal cards
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse flex gap-4">
                  <div className="bg-muted rounded-lg h-40 w-40 flex-shrink-0"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))
            ) : featuredMovies.length > 0 ? (
              featuredMovies.map((movie) => (
                <MovieCardHorizontal 
                  key={movie.id} 
                  id={movie.id}
                  title={movie.title}
                  year={movie.release_year}
                  genre={movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1)}
                  rating={movie.average_rating}
                  reviewCount={movie.review_count}
                  thumbnail={movie.poster_url}
                  language={movie.language.charAt(0).toUpperCase() + movie.language.slice(1)}
                  description={movie.description}
                  editorNote={movie.editor_note}
                />
              ))
            ) : (
              // No featured movies message
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Featured Movies</h3>
                <p className="text-muted-foreground">
                  Featured movies will appear here once they are marked as featured by administrators.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* African Film Canon */}
      <section className="py-16 bg-gradient-to-br from-rose-100/80 via-rose-50 to-orange-50/60 dark:from-rose-950/30 dark:via-rose-900/20 dark:to-orange-900/10 border-y border-rose-200/50 dark:border-rose-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Award className="w-8 h-8 text-primary" />
                African Film Canon
              </h2>
              <p className="text-muted-foreground">Landmark films that shaped African storytelling across generations</p>
            </div>
            <Link to="/canon">
              <Button variant="outline" className="hidden sm:inline-flex">
                Explore the Canon
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-64 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : featuredMovies.length > 0 ? (
              featuredMovies.slice(0, 4).map((movie) => (
                <MovieCard 
                  key={movie.id} 
                  id={movie.id}
                  title={movie.title}
                  year={movie.release_year}
                  genre={movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1)}
                  rating={movie.average_rating}
                  reviewCount={movie.review_count}
                  thumbnail={movie.poster_url}
                  language={movie.language.charAt(0).toUpperCase() + movie.language.slice(1)}
                  isCanon={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Canon Coming Soon</h3>
                <p className="text-muted-foreground">
                  Landmark African films will be curated here to showcase cinema history.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Top Reviewers Leaderboard */}
      <TopReviewers />

      {/* Top Reviews */}
      <TopReviews />


      {/* Trending Movies */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Trending Now
            </h2>
            <Link to="/trending" className="text-primary hover:text-primary/80 text-sm font-medium transition-colors">
              See All Trending
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-muted rounded-xl aspect-[16/9]"></div>
                </div>
              ))
            ) : trendingMovies.length > 0 ? (
              trendingMovies.slice(0, 6).map((movie) => (
                <TrendingCard 
                  key={movie.id} 
                  id={movie.id}
                  title={movie.title}
                  rating={movie.average_rating}
                  thumbnail={movie.poster_url}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Trending Movies</h3>
                <p className="text-muted-foreground">
                  Trending movies will appear here based on recent reviews and watchlist activity.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* People Behind African Cinema */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Users className="w-8 h-8 text-primary" />
                People Behind African Cinema
              </h2>
              <p className="text-muted-foreground">Actors, directors, and filmmakers shaping African storytelling</p>
            </div>
            <Button variant="outline" className="hidden sm:inline-flex" asChild>
              <Link to="/people">Explore African Film Talent →</Link>
            </Button>
          </div>
          
          {creatorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-t-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : creators && creators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {creators.slice(0, 4).map((creator) => (
                <CreatorCard key={creator.id} creator={creator} movieCount={creator.movie_count} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No creators found</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-hero-gradient">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Africa's Growing Movie Archive
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Review films, contribute knowledge, and help preserve African cinema for future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/auth">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link to="/movies">Explore the Database</Link>
            </Button>
          </div>
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

export default Index;