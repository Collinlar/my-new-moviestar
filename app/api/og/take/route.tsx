import { ImageResponse } from 'next/og'
import { createStaticClient } from '@/lib/supabase/static'

export const runtime = 'edge'

const REACTION_LABELS: Record<string, string> = {
  loved:      'Loved it',
  liked:      'Liked it',
  okay:       'It was okay',
  not_for_me: 'Not for me',
}

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '...'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400 })
  }

  const supabase = createStaticClient() as any

  // Fetch share card + reaction + movie
  const { data: card } = await supabase
    .from('review_share_cards')
    .select('reaction_id, movie_id, user_id')
    .eq('share_token', token)
    .maybeSingle()

  if (!card) {
    return new Response('Not found', { status: 404 })
  }

  const [{ data: rxn }, { data: movie }, { data: tags }] = await Promise.all([
    supabase
      .from('movie_reactions')
      .select('reaction, rating, one_liner')
      .eq('id', card.reaction_id)
      .maybeSingle(),
    supabase
      .from('movies')
      .select('title, release_year, country, poster_url')
      .eq('id', card.movie_id)
      .maybeSingle(),
    supabase
      .from('movie_reaction_tags')
      .select('reaction_tags(label)')
      .eq('reaction_id', card.reaction_id),
  ])

  const title = movie?.title ?? 'Untitled'
  const year = movie?.release_year?.toString() ?? ''
  const country = movie?.country ?? ''
  const posterUrl = movie?.poster_url ?? null
  const reaction = rxn?.reaction ?? null
  const rating = rxn?.rating ?? null
  const oneLiner = rxn?.one_liner ?? null
  const tagLabels = (tags ?? []).map((t: any) => t.reaction_tags?.label).filter(Boolean) as string[]
  const reactionLabel = reaction ? REACTION_LABELS[reaction] ?? reaction : null

  const W = 1080
  const H = 1080

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: `${W}px`,
          height: `${H}px`,
          background: '#0B0A09',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Poster — right half */}
        {posterUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '480px',
              height: `${H}px`,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt=""
              width={480}
              height={H}
              style={{ objectFit: 'cover', opacity: 0.85 }}
            />
          </div>
        )}

        {/* Gradient fade — poster to content */}
        {posterUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: '280px',
              width: '340px',
              height: `${H}px`,
              display: 'flex',
              background: 'linear-gradient(to right, #0B0A09 30%, rgba(11,10,9,0) 100%)',
            }}
          />
        )}

        {/* Content column */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '640px',
            height: `${H}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '80px 72px',
          }}
        >
          {/* Top: MuvieStars brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#C8963E', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: 700, color: '#0B0A09',
            }}>
              M
            </div>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#EDE4D2', letterSpacing: '-0.01em' }}>
              MuvieStars
            </span>
          </div>

          {/* Middle: the take */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Movie title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '52px', fontWeight: 700, color: '#F6EFE2', lineHeight: '1.05', letterSpacing: '-0.02em' }}>
                {truncate(title, 28)}
              </div>
              <div style={{ fontSize: '20px', color: '#8C857A', letterSpacing: '0.02em' }}>
                {[year, country].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* Reaction badge */}
            {reactionLabel && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                width: 'fit-content',
                padding: '8px 20px',
                borderRadius: '999px',
                background: 'rgba(200,150,62,0.15)',
                border: '1px solid rgba(200,150,62,0.5)',
                fontSize: '18px', color: '#C8963E', fontWeight: 500,
              }}>
                {reactionLabel}
              </div>
            )}

            {/* Star rating */}
            {rating && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} style={{ fontSize: '36px', color: n <= rating ? '#C8963E' : '#2A2520' }}>
                    ★
                  </span>
                ))}
              </div>
            )}

            {/* One-liner */}
            {oneLiner && (
              <div style={{
                fontSize: '26px', color: '#C7BFB2', lineHeight: '1.45',
                borderLeft: '3px solid rgba(200,150,62,0.5)',
                paddingLeft: '20px',
              }}>
                "{truncate(oneLiner, 100)}"
              </div>
            )}

            {/* Tags */}
            {tagLabels.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tagLabels.slice(0, 3).map(label => (
                  <div
                    key={label}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '999px',
                      background: 'rgba(237,228,210,0.07)',
                      border: '1px solid rgba(237,228,210,0.15)',
                      fontSize: '16px', color: '#A39B8F',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: share URL */}
          <div style={{ fontSize: '16px', color: '#4B4440', letterSpacing: '0.03em' }}>
            muviestars.com/take/{token}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
    }
  )
}
