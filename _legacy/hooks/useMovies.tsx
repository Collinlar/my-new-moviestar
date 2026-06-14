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
  editor_note?: string;
  creator: {
    name: string;
    image_url?: string;
  };
}

interface UseMoviesOptions {
  genre?: string;
  language?: string;
  yearFrom?: number;
  yearTo?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'release_year' | 'average_rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export const useFeaturedMovies = (limit: number = 4) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('movies')
          .select(`
            *,
            creator:creators(name, image_url)
          `)
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) throw fetchError;

        setMovies(data || []);
      } catch (err) {
        console.error('Error fetching featured movies:', err);
        setError('Failed to load featured movies');
        toast({
          title: "Error",
          description: "Failed to load featured movies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedMovies();
  }, [limit]);

  return {
    movies,
    loading,
    error
  };
};

export const useTrendingMovies = (limit: number = 4) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate trending score using a hybrid approach:
        // - Recent reviews (last 7 days): 40% weight
        // - Recent watchlist additions (last 7 days): 30% weight  
        // - Overall rating quality (average_rating * review_count): 30% weight
        const { data, error: fetchError } = await supabase.rpc('get_trending_movies');

        if (fetchError) {
          // If the RPC function doesn't exist, fall back to a simpler query
          console.warn('Trending RPC function not found, using fallback query');
          
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('movies')
            .select(`
              *,
              creator:creators(name, image_url)
            `)
            .order('review_count', { ascending: false })
            .order('average_rating', { ascending: false })
            .limit(limit);

          if (fallbackError) throw fallbackError;
          setMovies(fallbackData || []);
        } else {
          // Map the RPC result to match Movie interface and apply limit
          const mappedData = (data || [])
            .slice(0, limit)
            .map((movie: any) => ({
              ...movie,
              creator: movie.creators ? { name: movie.creators.name, image_url: movie.creators.image_url } : null
            }));
          setMovies(mappedData);
        }
      } catch (err) {
        console.error('Error fetching trending movies:', err);
        setError('Failed to load trending movies');
        toast({
          title: "Error",
          description: "Failed to load trending movies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingMovies();
  }, [limit]);

  return {
    movies,
    loading,
    error
  };
};

export const useMovies = (options: UseMoviesOptions = {}) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const {
    genre,
    language,
    yearFrom,
    yearTo,
    search,
    limit = 12,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('movies')
          .select(`
            *,
            creator:creators(name, image_url)
          `, { count: 'exact' });

        // Apply filters
        if (genre) {
          query = query.eq('genre', genre as any);
        }

        if (language) {
          query = query.eq('language', language as any);
        }

        if (yearFrom) {
          query = query.gte('release_year', yearFrom);
        }

        if (yearTo) {
          query = query.lte('release_year', yearTo);
        }

        if (search) {
          // Enhanced search across multiple fields
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,director.ilike.%${search}%,producer.ilike.%${search}%,writer.ilike.%${search}%,synopsis.ilike.%${search}%,tagline.ilike.%${search}%,keywords.ilike.%${search}%`);
        }

        // Apply sorting
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;

        setMovies(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error fetching movies:', err);
        console.error('Search query:', search);
        console.error('Filters:', { genre, language, yearFrom, yearTo });
        setError('Failed to load movies');
        toast({
          title: "Error",
          description: "Failed to load movies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [genre, language, yearFrom, yearTo, search, limit, offset, sortBy, sortOrder]);

  return {
    movies,
    loading,
    error,
    totalCount,
    refetch: () => {
      const fetchMovies = async () => {
        // Same logic as above but extracted for refetch
        try {
          setLoading(true);
          setError(null);

          let query = supabase
            .from('movies')
            .select(`
              *,
              creator:creators(name, image_url)
            `, { count: 'exact' });

          if (genre) query = query.eq('genre', genre as any);
          if (language) query = query.eq('language', language as any);
          if (yearFrom) query = query.gte('release_year', yearFrom);
          if (yearTo) query = query.lte('release_year', yearTo);
          if (search) {
            query = query.or(
              `title.ilike.%${search}%,description.ilike.%${search}%`
            );
          }

          query = query.order(sortBy, { ascending: sortOrder === 'asc' });
          query = query.range(offset, offset + limit - 1);

          const { data, error: fetchError, count } = await query;

          if (fetchError) throw fetchError;

          setMovies(data || []);
          setTotalCount(count || 0);
        } catch (err) {
          console.error('Error fetching movies:', err);
          setError('Failed to load movies');
        } finally {
          setLoading(false);
        }
      };
      fetchMovies();
    }
  };
};