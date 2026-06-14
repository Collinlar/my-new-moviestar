import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Grid3X3, List } from 'lucide-react';
import { useMovies } from '@/hooks/useMovies';
import { MovieCard } from '@/components/MovieCard';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import SEOHead from '@/components/SEOHead';

const Movies = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'release_year' | 'average_rating' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const itemsPerPage = 12;
  const offset = (currentPage - 1) * itemsPerPage;

  const { movies, loading, totalCount } = useMovies({
    search: searchQuery,
    sortBy,
    sortOrder,
    limit: itemsPerPage,
    offset
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-');
    setSortBy(newSortBy as 'title' | 'release_year' | 'average_rating' | 'created_at');
    setSortOrder(newSortOrder as 'asc' | 'desc');
    setCurrentPage(1);
  };

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1);
  };

  const formatLanguage = (language: string) => {
    return language.charAt(0).toUpperCase() + language.slice(1);
  };

  const sortOptions = [
    { value: 'created_at-desc', label: 'Newest First' },
    { value: 'created_at-asc', label: 'Oldest First' },
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
    { value: 'release_year-desc', label: 'Release Year (Newest)' },
    { value: 'release_year-asc', label: 'Release Year (Oldest)' },
    { value: 'average_rating-desc', label: 'Highest Rated' },
    { value: 'average_rating-asc', label: 'Lowest Rated' }
  ];

  return (
    <>
      <SEOHead
        title="All African Movies"
        description="Browse all African movies in our collection. Discover Nollywood, Ghallywood, and other African cinema with advanced sorting and search."
        keywords="African movies, Nollywood movies, Ghallywood, Nigerian movies, African cinema collection"
        url="https://muviestars.com/movies"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">All Movies</h1>
            <p className="text-lg text-muted-foreground">
              Complete collection of African cinema
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Search Bar */}
            <div className="flex-1">
              <SearchBar 
                onSearch={handleSearch}
                placeholder="Search all movies..."
              />
            </div>

            {/* Sort and View Controls */}
            <div className="flex gap-2">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'All Movies'}
              </h2>
              <p className="text-muted-foreground">
                {loading ? 'Loading...' : `${totalCount} movie${totalCount !== 1 ? 's' : ''} total`}
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Movies Display */}
          {loading ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              : "space-y-4"
            }>
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                viewMode === 'grid' ? (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-64 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="h-24 w-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          ) : movies.length > 0 ? (
            <>
              {/* Grid View */}
              {viewMode === 'grid' ? (
                <div className="space-y-8 mb-8">
                  {Array.from({ length: Math.ceil(movies.length / 8) }).map((_, groupIndex) => (
                    <div key={groupIndex}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {movies.slice(groupIndex * 8, (groupIndex + 1) * 8).map((movie) => (
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
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="space-y-4 mb-8">
                  {movies.map((movie) => (
                    <Card key={movie.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <Link to={`/movie/${movie.id}`} className="flex gap-4 group">
                          <img
                            src={movie.poster_url}
                            alt={`${movie.title} poster`}
                            className="w-16 h-24 object-cover rounded group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {movie.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {movie.release_year} • {formatGenre(movie.genre)} • {formatLanguage(movie.language)}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {movie.description}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">{movie.average_rating}/5</span>
                                <span className="text-xs text-muted-foreground">
                                  ({movie.review_count} reviews)
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                By {movie.creator.name}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

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
                  ? `No movies match "${searchQuery}".`
                  : "No movies available at the moment."
                }
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => handleSearch('')}>
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Movies;