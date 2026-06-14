import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Creator {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  movie_count?: number;
}

export const useCreators = () => {
  return useQuery({
    queryKey: ['creators'],
    queryFn: async (): Promise<Creator[]> => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      // Fetch movie counts for each creator
      if (data) {
        const creatorsWithCounts = await Promise.all(
          data.map(async (creator) => {
            const { count } = await supabase
              .from('movies')
              .select('*', { count: 'exact', head: true })
              .eq('creator_id', creator.id);
            
            return {
              ...creator,
              movie_count: count || 0
            };
          })
        );
        
        return creatorsWithCounts;
      }
      
      return data || [];
    },
  });
};

// New hook for top creators based on engagement
export const useTopCreators = (limit: number = 4) => {
  return useQuery({
    queryKey: ['top-creators', limit],
    queryFn: async (): Promise<Creator[]> => {
      // Get all creators first
      const { data: creators, error } = await supabase
        .from('creators')
        .select('*');
      
      if (error) throw error;
      if (!creators) return [];

      // Get engagement metrics for each creator
      const creatorsWithMetrics = await Promise.all(
        creators.map(async (creator) => {
          // Get movies by this creator
          const { data: movies } = await supabase
            .from('movies')
            .select('id')
            .eq('creator_id', creator.id);

          if (!movies || movies.length === 0) {
            return { ...creator, engagement_score: 0, movie_count: 0 };
          }

          const movieIds = movies.map(m => m.id);

          // Get total reviews for all movies by this creator
          const { count: reviewCount } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .in('movie_id', movieIds);

          // Get total watchlist additions for all movies by this creator
          const { count: watchlistCount } = await supabase
            .from('watchlists')
            .select('*', { count: 'exact', head: true })
            .in('movie_id', movieIds);

          // Calculate engagement score (reviews + watchlists + favorites)
          const engagement_score = (reviewCount || 0) + (watchlistCount || 0);
          
          return {
            ...creator,
            engagement_score,
            movie_count: movies.length
          };
        })
      );

      // Sort by engagement score and return top creators
      return creatorsWithMetrics
        .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
        .slice(0, limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
