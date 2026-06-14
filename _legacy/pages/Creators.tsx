import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import CreatorCard from '@/components/CreatorCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Users, Sparkles, Filter, SortAsc, SortDesc } from 'lucide-react';
import { useCreators, Creator } from '@/hooks/useCreators';
import SEOHead from '@/components/SEOHead';

const Creators = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'movies' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const { data: creators, isLoading } = useCreators();
  
  // Fetch movie counts for each creator
  const { data: creatorStats } = useQuery({
    queryKey: ['creator-stats'],
    queryFn: async () => {
      if (!creators) return {};
      
      const stats: Record<string, { movieCount: number; totalRating: number }> = {};
      
      for (const creator of creators) {
        const { data: movies, error } = await supabase
          .from('movies')
          .select('id, average_rating')
          .eq('creator_id', creator.id);
        
        if (!error && movies) {
          const movieCount = movies.length;
          const totalRating = movies.reduce((sum, movie) => sum + (movie.average_rating || 0), 0);
          stats[creator.id] = { movieCount, totalRating };
        }
      }
      
      return stats;
    },
    enabled: !!creators,
  });

  const filteredAndSortedCreators = creators
    ?.filter((creator) =>
      creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creator.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'movies':
          const aCount = creatorStats?.[a.id]?.movieCount || 0;
          const bCount = creatorStats?.[b.id]?.movieCount || 0;
          comparison = aCount - bCount;
          break;
        case 'recent':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    }) || [];

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <>
      <SEOHead
        title="African Cinema Creators"
        description="Discover talented African filmmakers, directors, and creators. From Nollywood legends to emerging voices, explore their stories and filmography."
        keywords="African filmmakers, Nollywood directors, African cinema creators, Nigerian directors"
        url="https://muviestars.com/creators"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
      
      {/* Header */}
      <section className="bg-hero-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
            <h1 className="text-4xl font-bold text-white">Featured Creators</h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Discover the talented filmmakers, directors, and creators behind the best of African cinema. 
            From Nollywood legends to emerging voices, explore their stories and filmography.
          </p>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="py-8 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search creators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={(value: 'name' | 'movies' | 'recent') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="movies">Sort by Movies</SelectItem>
                  <SelectItem value="recent">Sort by Recent</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortOrder}
                className="px-3"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-t-lg mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedCreators.length > 0 ? (
            <>
              <div className="mb-6">
                <p className="text-muted-foreground">
                  Showing {filteredAndSortedCreators.length} creator{filteredAndSortedCreators.length !== 1 ? 's' : ''}
                  {searchTerm && ` for "${searchTerm}"`}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredAndSortedCreators.map((creator) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    movieCount={creatorStats?.[creator.id]?.movieCount || 0}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Users className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No creators found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm 
                  ? `No creators match "${searchTerm}". Try adjusting your search.`
                  : 'No creators are available at the moment.'
                }
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
};

export default Creators;
