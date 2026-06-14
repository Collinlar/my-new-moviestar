-- Add foreign key constraint to link watchlists to movies
ALTER TABLE public.watchlists 
ADD CONSTRAINT watchlists_movie_id_fkey 
FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;

-- Add foreign key constraint to link watchlists to profiles  
ALTER TABLE public.watchlists 
ADD CONSTRAINT watchlists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;