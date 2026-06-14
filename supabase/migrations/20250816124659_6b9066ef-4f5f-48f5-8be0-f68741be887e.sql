-- Insert sample creators first
INSERT INTO public.creators (id, name, bio, image_url) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Ramsey Nouah', 'Acclaimed Nigerian actor and director known for his versatile performances in Nollywood films.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440001', 'Kemi Adetiba', 'Award-winning Nigerian filmmaker and director, known for King of Boys and The Wedding Party.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440002', 'Blitz Bazawule', 'Ghanaian-American filmmaker and visual artist, director of The Burial of Kojo.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face'),
('550e8400-e29b-41d4-a716-446655440003', 'Kunle Afolayan', 'Nigerian actor, producer and director known for his innovative filmmaking approach.', 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=300&h=300&fit=crop&crop=face');

-- Insert sample movies
INSERT INTO public.movies (id, title, description, genre, language, release_year, poster_url, youtube_url, creator_id) VALUES
('1', 'Living in Bondage: Breaking Free', 'A sequel to the 1992 classic, this film follows the story of Nnamdi, son of Andy Okeke, as he navigates the dangerous world of ritual money-making that destroyed his family.', 'drama', 'english', 2019, 'https://images.unsplash.com/photo-1489599510071-4c1b22a6027c?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440000'),

('2', 'The Wedding Party', 'A lavish Nigerian wedding becomes a whirlwind of chaos, comedy, and unexpected revelations when families from different backgrounds come together for what should be the perfect celebration.', 'comedy', 'english', 2016, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440001'),

('3', 'King of Boys', 'A powerful businesswoman''s political ambitions are threatened when her past in the underworld comes back to haunt her in this gripping crime drama.', 'thriller', 'english', 2018, 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440001'),

('4', 'The Burial of Kojo', 'A mystical tale of two brothers whose relationship is tested when one disappears into an abandoned gold mine, blending magical realism with powerful storytelling.', 'drama', 'english', 2018, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440002'),

('5', 'Gangs of Lagos', 'A group of friends become entangled in the criminal underworld of Lagos, testing their loyalty and friendship in this action-packed thriller.', 'action', 'english', 2023, 'https://images.unsplash.com/photo-1518635017480-bb7b7a4fba14?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440003'),

('6', 'Anikulapo', 'A mystical tale set in the Oyo Empire, following a traveling cloth weaver who discovers the power to raise the dead, exploring themes of power, love, and consequences.', 'drama', 'yoruba', 2022, 'https://images.unsplash.com/photo-1551634997-5d59b5f97892?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440003'),

('7', 'Beast of Two Worlds', 'A young man discovers he has supernatural abilities and must navigate between the modern world and ancient African traditions to save his community.', 'adventure', 'english', 2021, 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440000'),

('8', 'Citation', 'A female postgraduate student takes on the system when she reports sexual harassment by a popular professor, highlighting issues of power and justice in academic institutions.', 'drama', 'english', 2020, 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=400&h=600&fit=crop', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '550e8400-e29b-41d4-a716-446655440003');