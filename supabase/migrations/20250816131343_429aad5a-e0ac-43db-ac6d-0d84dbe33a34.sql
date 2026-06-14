-- Insert sample profiles for testing with properly formatted UUIDs
-- Note: These will be replaced with real user profiles once authentication is implemented

INSERT INTO public.profiles (id, user_id, display_name, avatar_url, created_at, updated_at) VALUES
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Aisha Okonkwo',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    now() - interval '30 days',
    now() - interval '10 days'
  ),
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Kwame Asante',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    now() - interval '25 days',
    now() - interval '5 days'
  ),
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Fatima Ba',
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
    now() - interval '20 days',
    now() - interval '3 days'
  ),
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Thabo Mthembu',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    now() - interval '15 days',
    now() - interval '1 day'
  ),
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Amina Hassan',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    now() - interval '12 days',
    now() - interval '2 hours'
  ),
  (
    gen_random_uuid(),
    gen_random_uuid(),
    'Kofi Mensah',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    now() - interval '8 days',
    now() - interval '6 hours'
  );