import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, CheckCircle, Film, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import SEOHead from '@/components/SEOHead';

interface Person {
  id: string;
  full_name: string;
  country: string | null;
  bio: string | null;
  date_of_birth: string | null;
  date_of_death: string | null;
  verified: boolean;
  profile_image: string | null;
  imdb_id: string | null;
  website: string | null;
  created_at: string;
}

interface FilmographyItem {
  id: string;
  movie_id: string;
  role: string;
  character_name: string | null;
  billing_order: number;
  department: string | null;
  movie: {
    id: string;
    title: string;
    poster_url: string | null;
    release_year: number;
    genre: string;
  };
}

const PersonProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [filmography, setFilmography] = useState<FilmographyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchPersonData = async () => {
      try {
        // Fetch person details
        const { data: personData, error: personError } = await supabase
          .from('people')
          .select('*')
          .eq('id', id)
          .single();

        if (personError) throw personError;

        // Fetch filmography
        const { data: filmographyData, error: filmographyError } = await supabase
          .from('movie_people')
          .select(`
            id,
            movie_id,
            role,
            character_name,
            billing_order,
            department,
            movie:movies(id, title, poster_url, release_year, genre)
          `)
          .eq('person_id', id)
          .order('billing_order', { ascending: true });

        if (filmographyError) throw filmographyError;

        setPerson(personData);
        setFilmography((filmographyData || []).map(item => ({
          ...item,
          movie: Array.isArray(item.movie) ? item.movie[0] : item.movie
        })) as FilmographyItem[]);
      } catch (error) {
        console.error('Error fetching person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [id]);

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const calculateAge = (birthDate: string, deathDate?: string | null) => {
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const groupFilmographyByRole = () => {
    const groups: Record<string, FilmographyItem[]> = {};
    filmography.forEach(item => {
      const role = formatRole(item.role);
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(item);
    });
    return groups;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="flex gap-8">
                <div className="w-48 h-64 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-20 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!person) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Person not found</h1>
            <Link to="/people">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to People
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const roleGroups = groupFilmographyByRole();
  const actingCredits = filmography.filter(f => f.role === 'actor');
  const crewCredits = filmography.filter(f => f.role !== 'actor');

  return (
    <>
      <SEOHead
        title={`${person.full_name} - African Film Professional | MuvieStars`}
        description={person.bio || `Explore ${person.full_name}'s filmography and career in African cinema. View movies, roles, and biography.`}
        image={person.profile_image || undefined}
        url={`https://muviestars.com/person/${person.id}`}
      />

      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb 
            items={[
              { label: "People & Talent", href: "/people" },
              { label: person.full_name }
            ]} 
          />

          {/* Profile Header */}
          <div className="grid lg:grid-cols-4 gap-8 mb-8">
            {/* Profile Image */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden">
                <div className="aspect-[3/4] relative">
                  {person.profile_image ? (
                    <img
                      src={person.profile_image}
                      alt={person.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Avatar className="w-32 h-32">
                        <AvatarFallback className="text-4xl">
                          {person.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              </Card>

              {/* External Links */}
              <div className="mt-4 space-y-2">
                {person.imdb_id && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`https://www.imdb.com/name/${person.imdb_id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on IMDb
                    </a>
                  </Button>
                )}
                {person.website && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={person.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Official Website
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold text-foreground">{person.full_name}</h1>
                  {person.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                  {person.country && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {person.country}
                    </span>
                  )}
                  {person.date_of_birth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Born {new Date(person.date_of_birth).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {!person.date_of_death && ` (age ${calculateAge(person.date_of_birth)})`}
                    </span>
                  )}
                  {person.date_of_death && (
                    <span className="text-muted-foreground">
                      – Died {new Date(person.date_of_death).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {person.date_of_birth && ` (age ${calculateAge(person.date_of_birth, person.date_of_death)})`}
                    </span>
                  )}
                </div>

                {/* Known For Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.keys(roleGroups).map(role => (
                    <Badge key={role} variant="secondary">
                      {role} ({roleGroups[role].length})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Biography */}
              {person.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>Biography</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {person.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{filmography.length}</p>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{actingCredits.length}</p>
                    <p className="text-sm text-muted-foreground">Acting Roles</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{crewCredits.length}</p>
                    <p className="text-sm text-muted-foreground">Crew Credits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{Object.keys(roleGroups).length}</p>
                    <p className="text-sm text-muted-foreground">Roles</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Filmography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Filmography
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filmography.length > 0 ? (
                <Tabs defaultValue={Object.keys(roleGroups)[0] || 'all'} className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-2">
                    {Object.keys(roleGroups).map(role => (
                      <TabsTrigger key={role} value={role}>
                        {role} ({roleGroups[role].length})
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(roleGroups).map(([role, items]) => (
                    <TabsContent key={role} value={role} className="mt-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {items
                          .sort((a, b) => (b.movie?.release_year || 0) - (a.movie?.release_year || 0))
                          .map((item) => (
                            item.movie && (
                              <Link key={item.id} to={`/movie/${item.movie.id}`}>
                                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                                  <div className="aspect-[2/3] relative">
                                    {item.movie.poster_url ? (
                                      <img
                                        src={item.movie.poster_url}
                                        alt={item.movie.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <Film className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <CardContent className="p-3">
                                    <p className="font-medium text-sm line-clamp-2">{item.movie.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.movie.release_year}</p>
                                    {item.character_name && (
                                      <p className="text-xs text-primary mt-1">as {item.character_name}</p>
                                    )}
                                  </CardContent>
                                </Card>
                              </Link>
                            )
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-8">
                  <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No filmography available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PersonProfile;
