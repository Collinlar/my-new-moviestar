import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, MapPin, Film } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import SEOHead from '@/components/SEOHead';
import { useQuery } from '@tanstack/react-query';

interface Person {
  id: string;
  full_name: string;
  country: string | null;
  verified: boolean;
  profile_image: string | null;
  movie_count?: number;
}

const ITEMS_PER_PAGE = 24;

const People = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch people with movie counts
  const { data: peopleData, isLoading } = useQuery({
    queryKey: ['people', searchQuery, countryFilter, verifiedFilter, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('people')
        .select('*, movie_people(count)', { count: 'exact' });

      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      if (countryFilter !== 'all') {
        query = query.eq('country', countryFilter);
      }

      if (verifiedFilter === 'verified') {
        query = query.eq('verified', true);
      }

      const { data, error, count } = await query
        .order('full_name')
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Transform data to include movie count
      const transformedData = (data || []).map(person => ({
        ...person,
        movie_count: person.movie_people?.[0]?.count || 0
      }));

      return { people: transformedData, totalCount: count || 0 };
    }
  });

  // Fetch unique countries for filter
  const { data: countries } = useQuery({
    queryKey: ['people-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('country')
        .not('country', 'is', null);

      if (error) throw error;

      const uniqueCountries = [...new Set(data?.map(p => p.country).filter(Boolean))];
      return uniqueCountries.sort();
    }
  });

  const people = peopleData?.people || [];
  const totalCount = peopleData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <>
      <SEOHead
        title="People & Talent - African Film Professionals | MuvieStars"
        description="Explore actors, directors, writers, and crew from African cinema. Discover filmographies, biographies, and career highlights from Nollywood, Ghollywood, and beyond."
        url="https://muviestars.com/people"
      />

      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb 
            items={[
              { label: "People & Talent" }
            ]} 
          />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">People & Talent</h1>
            <p className="text-muted-foreground">
              Explore the talented actors, directors, and crew behind African cinema
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                
                <Select value={countryFilter} onValueChange={(value) => {
                  setCountryFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries?.map(country => (
                      <SelectItem key={country} value={country || ''}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={verifiedFilter} onValueChange={(value) => {
                  setVerifiedFilter(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Profiles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profiles</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            {totalCount} {totalCount === 1 ? 'person' : 'people'} found
          </p>

          {/* People Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-[3/4] bg-muted animate-pulse" />
                  <CardContent className="p-3">
                    <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : people.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {people.map((person) => (
                <Link key={person.id} to={`/person/${person.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="aspect-[3/4] relative">
                      {person.profile_image ? (
                        <img
                          src={person.profile_image}
                          alt={person.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Avatar className="w-20 h-20">
                            <AvatarFallback className="text-2xl">
                              {person.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      {person.verified && (
                        <Badge className="absolute top-2 right-2 bg-blue-500 text-white p-1">
                          <CheckCircle className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm line-clamp-1">{person.full_name}</p>
                      {person.country && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {person.country}
                        </p>
                      )}
                      {person.movie_count > 0 && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-1">
                          <Film className="h-3 w-3" />
                          {person.movie_count} {person.movie_count === 1 ? 'credit' : 'credits'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No people found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || countryFilter !== 'all' || verifiedFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No talent profiles have been added yet'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default People;
