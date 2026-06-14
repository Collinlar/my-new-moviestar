-- Insert sample profiles for testing
-- Note: These will be replaced with real user profiles once authentication is implemented

INSERT INTO public.profiles (id, user_id, display_name, avatar_url, created_at, updated_at) VALUES
  (
    'a1b2c3d4-e5f6-4321-8765-123456789abc',
    'a1b2c3d4-e5f6-4321-8765-123456789abc',
    'Aisha Okonkwo',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    now() - interval '30 days',
    now() - interval '10 days'
  ),
  (
    'b2c3d4e5-f6a1-5432-9876-234567890def',
    'b2c3d4e5-f6a1-5432-9876-234567890def',
    'Kwame Asante',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    now() - interval '25 days',
    now() - interval '5 days'
  ),
  (
    'c3d4e5f6-a1b2-6543-0987-345678901ghi',
    'c3d4e5f6-a1b2-6543-0987-345678901ghi',
    'Fatima Ba',
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
    now() - interval '20 days',
    now() - interval '3 days'
  ),
  (
    'd4e5f6a1-b2c3-7654-1098-456789012jkl',
    'd4e5f6a1-b2c3-7654-1098-456789012jkl',
    'Thabo Mthembu',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    now() - interval '15 days',
    now() - interval '1 day'
  ),
  (
    'e5f6a1b2-c3d4-8765-2109-567890123mno',
    'e5f6a1b2-c3d4-8765-2109-567890123mno',
    'Amina Hassan',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    now() - interval '12 days',
    now() - interval '2 hours'
  ),
  (
    'f6a1b2c3-d4e5-9876-3210-678901234pqr',
    'f6a1b2c3-d4e5-9876-3210-678901234pqr',
    'Kofi Mensah',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    now() - interval '8 days',
    now() - interval '6 hours'
  );