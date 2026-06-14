-- Add Sample Reviews Migration
-- This migration adds sample reviews for testing the TopReviews component

-- Insert sample profiles for reviews
INSERT INTO public.profiles (user_id, username, avatar_url, role) VALUES
('550e8400-e29b-41d4-a716-446655440100', 'MovieLover', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face', 'user'),
('550e8400-e29b-41d4-a716-446655440101', 'CinemaCritic', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 'user'),
('550e8400-e29b-41d4-a716-446655440102', 'FilmBuff', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', 'user'),
('550e8400-e29b-41d4-a716-446655440103', 'NollywoodFan', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face', 'user'),
('550e8400-e29b-41d4-a716-446655440104', 'AfricanCinema', 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=100&h=100&fit=crop&crop=face', 'user'),
('550e8400-e29b-41d4-a716-446655440105', 'MovieReviewer', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face', 'user')
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample reviews using the correct field names
INSERT INTO public.reviews (id, user_id, movie_id, review_text, rating, status) VALUES
('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440010', 'Absolutely phenomenal! This sequel lives up to the original and then some. The storytelling is masterful, the acting is top-notch, and the cinematography captures the essence of Nigerian cinema perfectly. A must-watch for any Nollywood fan.', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440011', 'Hilarious from start to finish! The Wedding Party perfectly captures the chaos and joy of Nigerian weddings. The ensemble cast delivers brilliant performances, and the comedy timing is impeccable. Pure entertainment!', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440012', 'A masterpiece of Nigerian cinema! King of Boys is gripping, intense, and beautifully shot. The plot twists keep you on the edge of your seat, and the character development is exceptional. This is what African cinema should be.', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440013', 'Magical realism at its finest! The Burial of Kojo is a beautiful blend of fantasy and reality. The cinematography is stunning, and the story is both heartwarming and thought-provoking. A true gem of African storytelling.', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440014', 'Action-packed and thrilling! Gangs of Lagos delivers on all fronts with intense action sequences, compelling characters, and a story that keeps you engaged throughout. The production quality is outstanding.', 4, 'approved'),
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440015', 'A beautiful exploration of Yoruba culture and mythology. Anikulapo is visually stunning with rich storytelling that honors African traditions. The performances are authentic and the cinematography is breathtaking.', 5, 'approved'),
('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440016', 'An exciting adventure that blends modern storytelling with African folklore. The special effects are impressive, and the story is engaging for audiences of all ages. Great family entertainment!', 4, 'approved'),
('550e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440017', 'Powerful and important storytelling. Citation addresses serious issues with sensitivity and strength. The lead performance is outstanding, and the film serves as an important conversation starter about justice and equality.', 5, 'approved');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON public.reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);

-- Note: helpful_count and comment_count will be added by the review_engagement migration
