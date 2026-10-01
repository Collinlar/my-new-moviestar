import { ImageResponse } from 'next/og'
import { createStaticClient } from '@/lib/supabase/static'
import { parseShareOptions, visibleTake } from '@/lib/share'

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
    .from('share_cards')
    .select('reaction_id, movie_id, user_id, payload')
    .eq('share_token', token)
    .eq('object_type', 'take')
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

  const options = parseShareOptions(card.payload)

  // The name is only looked up when the person chose to show it.
  let displayName: string | null = null
  if (options.show_name && card.user_id) {
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('display_name')
      .eq('user_id', card.user_id)
      .maybeSingle()
    displayName = profile?.display_name ?? null
  }

  const shown = visibleTake(options, {
    reaction: rxn?.reaction ?? null,
    rating: rxn?.rating ?? null,
    words: rxn?.one_liner ?? null,
    tags: (tags ?? []).map((t: any) => t.reaction_tags?.label).filter(Boolean) as string[],
    name: displayName,
  })

  const title = movie?.title ?? 'Untitled'
  const year = movie?.release_year?.toString() ?? ''
  const country = movie?.country ?? ''
  const wordsFirst = options.template === 'quote'
  const posterUrl = wordsFirst ? null : movie?.poster_url ?? null
  const rating = shown.rating
  const oneLiner = shown.words
  const tagLabels = shown.tags
  const reactionLabel = shown.reaction ? REACTION_LABELS[shown.reaction] ?? shown.reaction : null

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
            width: posterUrl ? '640px' : '1080px',
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
              <div style={{ fontSize: wordsFirst ? '34px' : '52px', fontWeight: 700, color: '#F6EFE2', lineHeight: '1.05', letterSpacing: '-0.02em' }}>
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
                alignSelf: 'flex-start',
                padding: '8px 20px',
                borderRadius: '999px',
                background: 'rgba(200,150,62,0.15)',
                border: '1px solid rgba(200,150,62,0.5)',
                fontSize: '18px', color: '#C8963E', fontWeight: 500,
              }}>
                {reactionLabel}
              </div>
            )}

            {/* Star rating, drawn as shapes so it never depends on a font */}
            {rating && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <svg key={n} width="38" height="38" viewBox="0 0 24 24">
                    <polygon
                      points="12,2 15.1,8.6 22,9.3 16.8,14 18.2,21 12,17.5 5.8,21 7.2,14 2,9.3 8.9,8.6"
                      fill={n <= rating ? '#C8963E' : '#2A2520'}
                    />
                  </svg>
                ))}
              </div>
            )}

            {/* One-liner */}
            {oneLiner && (
              <div style={{
                fontSize: wordsFirst ? '62px' : '26px', color: wordsFirst ? '#F6EFE2' : '#C7BFB2', lineHeight: '1.35',
                borderLeft: '3px solid rgba(200,150,62,0.5)',
                paddingLeft: '20px',
              }}>
                {`"${truncate(oneLiner, wordsFirst ? 110 : 100)}"`}
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

          {/* Bottom: who said it, and the share URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {shown.name && (
              <div style={{ fontSize: '20px', color: '#C7BFB2' }}>
                {`A take by ${truncate(shown.name, 30)}`}
              </div>
            )}
            <div style={{ fontSize: '16px', color: '#4B4440', letterSpacing: '0.03em' }}>
              {`muviestars.com/take/${token}`}
            </div>
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
