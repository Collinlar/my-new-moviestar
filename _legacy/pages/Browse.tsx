import { useState } from 'react';
import { Filter } from 'lucide-react';
import { useMovies } from '@/hooks/useMovies';
import { MovieCard } from '@/components/MovieCard';
import MovieFilters from '@/components/MovieFilters';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/SEOHead';

const Browse = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    genre?: string;
    language?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: 'title' | 'release_year' | 'average_rating' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const itemsPerPage = 12;
  const offset = (currentPage - 1) * itemsPerPage;

  const { movies, loading, totalCount } = useMovies({
    ...filters,
    search: searchQuery,
    limit: itemsPerPage,
    offset
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  return (
    <>
      <SEOHead
        title="Browse African Movies"
        description="Browse and discover African movies by genre, language, and year. Find Nollywood, Ghallywood, and other African cinema gems."
        keywords="browse African movies, filter Nollywood, African cinema by genre, movie search"
        url="https://muviestars.com/browse"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-foreground">Browse Movies</h1>
              <Button variant="outline" asChild>
                <Link to="/creators">Discover Creators</Link>
              </Button>
            </div>
            <p className="text-lg text-muted-foreground mb-6">
              Discover African cinema with advanced filters and search
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search movies by title or description..."
                className="mb-6"
              />
            </div>
          </div>

          {/* Filters and Results */}
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <MovieFilters 
                onFiltersChange={handleFiltersChange}
                initialFilters={filters}
              />
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'All Movies'}
                  </h2>
                  <p className="text-muted-foreground">
                    {loading ? 'Loading...' : `${totalCount} movie${totalCount !== 1 ? 's' : ''} found`}
                  </p>
                </div>
                
                {/* Active Filters Display */}
                {(filters.genre || filters.language || filters.yearFrom || filters.yearTo) && (
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <Filter className="h-4 w-4" />
                    <span>Filtered by:</span>
                    {filters.genre && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {formatGenre(filters.genre)}
                      </span>
                    )}
                    {filters.language && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {formatLanguage(filters.language)}
                      </span>
                    )}
                    {(filters.yearFrom || filters.yearTo) && (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {filters.yearFrom || '1990'}-{filters.yearTo || new Date().getFullYear()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Movies Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-64 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : movies.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {movies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        id={movie.id}
                        title={movie.title}
                        year={movie.release_year}
                        genre={formatGenre(movie.genre)}
                        rating={movie.average_rating}
                        reviewCount={movie.review_count}
                        thumbnail={movie.poster_url}
                        language={formatLanguage(movie.language)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎬</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No movies found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? `No movies match "${searchQuery}" with the current filters.`
                      : "No movies match your current filters."
                    }
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setFilters({ sortBy: 'created_at', sortOrder: 'desc' });
                      setCurrentPage(1);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Browse;