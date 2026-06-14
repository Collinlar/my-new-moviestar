import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { useMovies } from '@/hooks/useMovies';
import { useAdvancedMovieSearch } from '@/hooks/useAdvancedMovieSearch';
import { MovieCard } from '@/components/MovieCard';
import SearchBar from '@/components/SearchBar';
import MovieFilters from '@/components/MovieFilters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SEOHead from '@/components/SEOHead';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    genre: searchParams.get('genre') || undefined,
    language: searchParams.get('language') || undefined,
    yearFrom: searchParams.get('yearFrom') ? parseInt(searchParams.get('yearFrom')!) : undefined,
    yearTo: searchParams.get('yearTo') ? parseInt(searchParams.get('yearTo')!) : undefined,
    sortBy: (searchParams.get('sortBy') as 'title' | 'release_year' | 'average_rating' | 'created_at') || 'average_rating',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  });
  
  const searchQuery = searchParams.get('q') || '';
  const itemsPerPage = 12;
  const offset = (currentPage - 1) * itemsPerPage;

  // Use advanced search when there's a search query, otherwise use regular movies hook
  const { movies: searchMovies, loading: searchLoading, totalCount: searchTotalCount } = useAdvancedMovieSearch({
    search: searchQuery,
    limit: itemsPerPage,
    offset,
  });

  const { movies: filteredMovies, loading: filterLoading, totalCount: filterTotalCount } = useMovies({
    search: '', // Don't use search in regular hook
    limit: itemsPerPage,
    offset,
    genre: filters.genre,
    language: filters.language,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // Use search results when there's a query, otherwise use filtered results
  const movies = searchQuery ? searchMovies : filteredMovies;
  const loading = searchQuery ? searchLoading : filterLoading;
  const totalCount = searchQuery ? searchTotalCount : filterTotalCount;

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    const newParams = new URLSearchParams();
    if (query.trim()) {
      newParams.set('q', query.trim());
    }
    
    // Preserve existing filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    
    const newParams = new URLSearchParams();
    
    // Preserve search query
    if (searchQuery) {
      newParams.set('q', searchQuery);
    }
    
    // Add filters to URL
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams);
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
        title={searchQuery ? `Search: ${searchQuery}` : 'Search African Movies'}
        description={searchQuery 
          ? `Search results for "${searchQuery}" - Find African movies, actors, and directors matching your search on MuvieStars.`
          : 'Search for African movies, Nollywood films, actors, directors, and creators. Discover your next favorite African cinema experience.'
        }
        keywords={searchQuery 
          ? `${searchQuery}, African movies search, find Nollywood films`
          : 'search African movies, find Nollywood, movie search, African cinema search'
        }
        url={`https://muviestars.com/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">
              {searchQuery ? 'Search Results' : 'Search Movies'}
            </h1>
            
            {searchQuery && (
              <p className="text-lg text-muted-foreground mb-6">
                Results for "<span className="text-foreground font-medium">{searchQuery}</span>"
              </p>
            )}
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <SearchBar 
              onSearch={handleSearch}
              initialValue={searchQuery}
              placeholder="Search movies, actors, directors, creators..."
              autoFocus={!searchQuery}
            />
          </div>

          {/* Filters */}
          {searchQuery && (
            <div className="mb-6">
              <MovieFilters 
                onFiltersChange={handleFiltersChange}
                initialFilters={filters}
              />
            </div>
          )}

          {/* Results */}
          {searchQuery ? (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">Search Results</h2>
                  <p className="text-muted-foreground">
                    {loading ? 'Searching...' : `${totalCount} movie${totalCount !== 1 ? 's' : ''} found`}
                  </p>
                </div>
                
                {!loading && totalCount > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Sorted by rating (highest first)
                  </div>
                )}
              </div>

              {/* Movies Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-64 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : movies.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-4">
                    We couldn't find any movies matching "<strong>{searchQuery}</strong>".
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    <p>Try searching for:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Different keywords or movie titles</li>
                      <li>Actor or director names</li>
                      <li>More general terms (e.g., "drama", "comedy")</li>
                    </ul>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => handleSearch('')}>
                      Clear Search
                    </Button>
                    <Link to="/browse">
                      <Button>Browse All Movies</Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No search query - show search suggestions */
            <div className="text-center py-12">
              <SearchIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-4">Discover African Cinema</h2>
              <p className="text-muted-foreground mb-8">
                Search for your favorite Nollywood films, Ghallywood classics, actors, directors, and other African cinema content
              </p>
              
              {/* Popular searches */}
              <div className="max-w-md mx-auto">
                <p className="text-sm text-muted-foreground mb-4">Popular searches:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Living in Bondage', 'King of Boys', 'Wedding Party', 'Drama', 'Comedy', 'Ramsey Nouah', 'Genevieve Nnaji', 'Kunle Afolayan'].map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(term)}
                      className="text-xs"
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Browse link */}
              <div className="mt-8">
                <Link to="/browse">
                  <Button>Browse All Movies</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Search;