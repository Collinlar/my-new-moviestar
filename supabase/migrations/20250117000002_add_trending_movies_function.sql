-- Create function to calculate trending movies based on recent activity
CREATE OR REPLACE FUNCTION public.get_trending_movies(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  genre movie_genre,
  language movie_language,
  release_year INTEGER,
  poster_url TEXT,
  youtube_url TEXT,
  creator_id UUID,
  average_rating DECIMAL(2,1),
  review_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN,
  director TEXT,
  producer TEXT,
  writer TEXT,
  country TEXT,
  rating TEXT,
  synopsis TEXT,
  tagline TEXT,
  keywords TEXT,
  content_warning TEXT,
  creator JSONB,
  trending_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH trending_scores AS (
    SELECT 
      m.id,
      m.title,
      m.description,
      m.genre,
      m.language,
      m.release_year,
      m.poster_url,
      m.youtube_url,
      m.creator_id,
      m.average_rating,
      m.review_count,
      m.created_at,
      m.updated_at,
      m.featured,
      m.director,
      m.producer,
      m.writer,
      m.country,
      m.rating,
      m.synopsis,
      m.tagline,
      m.keywords,
      m.content_warning,
      jsonb_build_object(
        'name', c.name,
        'image_url', c.image_url
      ) as creator,
      -- Calculate trending score
      (
        -- Recent reviews weight (40%)
        COALESCE(
          (SELECT COUNT(*) FROM public.reviews r 
           WHERE r.movie_id = m.id 
           AND r.created_at >= NOW() - (days_back || ' days')::INTERVAL) * 0.4, 0
        ) +
        -- Recent watchlist additions weight (30%)
        COALESCE(
          (SELECT COUNT(*) FROM public.watchlists w 
           WHERE w.movie_id = m.id 
           AND w.added_at >= NOW() - (days_back || ' days')::INTERVAL) * 0.3, 0
        ) +
        -- Overall rating quality weight (30%)
        COALESCE((m.average_rating * m.review_count * 0.3), 0)
      ) as trending_score
    FROM public.movies m
    LEFT JOIN public.creators c ON m.creator_id = c.id
    WHERE m.review_count > 0 -- Only include movies with at least one review
  )
  SELECT 
    ts.id,
    ts.title,
    ts.description,
    ts.genre,
    ts.language,
    ts.release_year,
    ts.poster_url,
    ts.youtube_url,
    ts.creator_id,
    ts.average_rating,
    ts.review_count,
    ts.created_at,
    ts.updated_at,
    ts.featured,
    ts.director,
    ts.producer,
    ts.writer,
    ts.country,
    ts.rating,
    ts.synopsis,
    ts.tagline,
    ts.keywords,
    ts.content_warning,
    ts.creator,
    ts.trending_score
  FROM trending_scores ts
  ORDER BY ts.trending_score DESC, ts.average_rating DESC, ts.review_count DESC
  LIMIT limit_count;
END;
$$;
