CREATE TABLE IF NOT EXISTS public.festivals (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  short_name  TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  country     TEXT NOT NULL,
  city        TEXT,
  description TEXT,
  founded     INTEGER,
  website     TEXT,
  frequency   TEXT DEFAULT 'Annual',
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view festivals" ON public.festivals;
DROP POLICY IF EXISTS "Admins can manage festivals" ON public.festivals;

CREATE POLICY "Anyone can view festivals"
  ON public.festivals FOR SELECT USING (true);

CREATE POLICY "Admins can manage festivals"
  ON public.festivals FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_festivals_slug ON public.festivals(slug);

-- Seed the major African film festivals
INSERT INTO public.festivals (name, short_name, slug, country, city, description, founded, website, frequency)
VALUES
  (
    'Africa Movie Academy Awards',
    'AMAA',
    'amaa',
    'Nigeria',
    'Port Harcourt',
    'The premier awards ceremony for African cinema, recognising excellence in film across the continent. The AMAA covers over 30 categories and draws entries from across Africa and the diaspora.',
    2005,
    'https://amaaonline.com',
    'Annual'
  ),
  (
    'Africa International Film Festival',
    'AFRIFF',
    'afriff',
    'Nigeria',
    'Lagos',
    'Lagos-based festival celebrating African and global cinema with screenings, masterclasses, and industry sessions. One of West Africa''s fastest-growing film markets.',
    2010,
    'https://afriff.com',
    'Annual'
  ),
  (
    'Festival Panafricain du Cinéma et de la Télévision de Ouagadougou',
    'FESPACO',
    'fespaco',
    'Burkina Faso',
    'Ouagadougou',
    'The oldest and largest African film festival, held every two years in Ouagadougou. The Étalon d''Or de Yennenga is the continent''s most prestigious film award.',
    1969,
    'https://fespaco.bf',
    'Biennial'
  ),
  (
    'Durban International Film Festival',
    'DIFF',
    'diff',
    'South Africa',
    'Durban',
    'South Africa''s longest-running film festival, showcasing African and international cinema with a strong focus on social justice themes and emerging filmmakers.',
    1979,
    'https://durbanfilmfest.co.za',
    'Annual'
  ),
  (
    'Zanzibar International Film Festival',
    'ZIFF',
    'ziff',
    'Tanzania',
    'Zanzibar',
    'Known as the Festival of the Dhow Countries, ZIFF celebrates cinema and culture from East Africa, the Indian Ocean islands, and the Middle East.',
    1997,
    'https://ziff.or.tz',
    'Annual'
  ),
  (
    'Cairo International Film Festival',
    'CIFF',
    'ciff',
    'Egypt',
    'Cairo',
    'One of the oldest film festivals in Africa and the Arab world, accredited by the International Federation of Film Producers Associations (FIAPF).',
    1976,
    'https://cairofilmfest.org',
    'Annual'
  ),
  (
    'Marrakech International Film Festival',
    'FIFM',
    'fifm',
    'Morocco',
    'Marrakech',
    'A prestigious festival held in the medina of Marrakech, attracting international stars and celebrating world cinema alongside North African and Arab film.',
    2001,
    'https://festivalmarrakech.info',
    'Annual'
  ),
  (
    'South African Film and Television Awards',
    'SAFTA',
    'safta',
    'South Africa',
    'Johannesburg',
    'The national awards for South African film and television, celebrating excellence across drama, comedy, documentary, and animation.',
    2006,
    'https://saftas.com',
    'Annual'
  )
ON CONFLICT (slug) DO NOTHING;
