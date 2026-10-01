export interface DeckOption { id: string; title: string; slug: string; listed: number }
export interface CycleOption { id: string; label: string }

/** Published hand-picked decks an admin can build a challenge on, with their listed film counts. */
export async function loadChallengeOptions(supabase: any): Promise<{ decks: DeckOption[]; cycles: CycleOption[] }> {
  const [{ data: decks }, { data: cycles }] = await Promise.all([
    supabase
      .from('decks')
      .select('id, title, slug, deck_items(movie:movies(listing_status))')
      .eq('status', 'published')
      .eq('kind', 'curated')
      .order('title', { ascending: true }),
    supabase
      .from('club_cycles')
      .select('id, cycle_number, title_override, movie:movies(title)')
      .order('cycle_number', { ascending: false })
      .limit(30),
  ])
  return {
    decks: ((decks ?? []) as any[]).map((d) => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      listed: (d.deck_items ?? []).filter((i: any) => i.movie?.listing_status === 'approved').length,
    })),
    cycles: ((cycles ?? []) as any[]).map((c) => ({
      id: c.id,
      label: `Cycle ${c.cycle_number}: ${c.title_override || c.movie?.title || 'Untitled'}`,
    })),
  }
}
