import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  language: string;
  release_year: number;
  poster_url: string;
  youtube_url: string;
  average_rating: number;
  review_count: number;
  creator: {
    name: string;
    image_url?: string;
  };
}

interface UseAdvancedMovieSearchOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export const useAdvancedMovieSearch = (options: UseAdvancedMovieSearchOptions = {}) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { search, limit = 12, offset = 0 } = options;

  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setMovies([]);
      setTotalCount(0);
      return;
    }

    const searchMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Search in movie fields (title, description, director, etc.)
        const { data: movieResults, count: movieCount } = await supabase
          .from('movies')
          .select(`
            *,
            creator:creators(name, image_url)
          `, { count: 'exact' })
          .or(`title.ilike.%${search}%,description.ilike.%${search}%,director.ilike.%${search}%,producer.ilike.%${search}%,writer.ilike.%${search}%,synopsis.ilike.%${search}%,tagline.ilike.%${search}%,keywords.ilike.%${search}%`)
          .range(offset, offset + limit - 1);

        // Search in cast table for actor names
        const { data: castMatches } = await supabase
          .from('movie_cast')
          .select('movie_id')
          .ilike('name', `%${search}%`);

        let castResults: any[] = [];
        if (castMatches && castMatches.length > 0) {
          const movieIds = castMatches.map(c => c.movie_id);
          const { data } = await supabase
            .from('movies')
            .select(`
              *,
              creator:creators(name, image_url)
            `)
            .in('id', movieIds);
          castResults = data || [];
        }

        // Search in crew table for crew names  
        const { data: crewMatches } = await supabase
          .from('movie_crew')
          .select('movie_id')
          .ilike('name', `%${search}%`);

        let crewResults: any[] = [];
        if (crewMatches && crewMatches.length > 0) {
          const movieIds = crewMatches.map(c => c.movie_id);
          const { data } = await supabase
            .from('movies')
            .select(`
              *,
              creator:creators(name, image_url)
            `)
            .in('id', movieIds);
          crewResults = data || [];
        }

        // Search in creators table - get creators first, then their movies
        const { data: matchingCreators } = await supabase
          .from('creators')
          .select('id')
          .ilike('name', `%${search}%`);

        let creatorResults: any[] = [];
        if (matchingCreators && matchingCreators.length > 0) {
          const creatorIds = matchingCreators.map(c => c.id);
          const { data } = await supabase
            .from('movies')
            .select(`
              *,
              creator:creators(name, image_url)
            `)
            .in('creator_id', creatorIds);
          creatorResults = data || [];
        }

        // Combine all results and deduplicate by movie ID
        const allResults = new Map<string, Movie>();

        // Add movie field results
        movieResults?.forEach(movie => {
          allResults.set(movie.id, movie);
        });

        // Add cast results
        castResults?.forEach(movie => {
          allResults.set(movie.id, movie);
        });

        // Add crew results
        crewResults?.forEach(movie => {
          allResults.set(movie.id, movie);
        });

        // Add creator results
        creatorResults?.forEach(movie => {
          allResults.set(movie.id, movie);
        });

        // Convert map to array and sort by relevance (title matches first)
        const finalResults = Array.from(allResults.values()).sort((a, b) => {
          const aInTitle = a.title.toLowerCase().includes(search.toLowerCase());
          const bInTitle = b.title.toLowerCase().includes(search.toLowerCase());
          
          if (aInTitle && !bInTitle) return -1;
          if (!aInTitle && bInTitle) return 1;
          
          return a.title.localeCompare(b.title);
        });

        setMovies(finalResults.slice(offset, offset + limit));
        setTotalCount(finalResults.length);

      } catch (err) {
        console.error('Error searching movies:', err);
        console.error('Search term:', search);
        setError('Failed to search movies');
        toast({
          title: "Search Error",
          description: "Failed to search movies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    searchMovies();
  }, [search, limit, offset]);

  return {
    movies,
    loading,
    error,
    totalCount,
  };
};
