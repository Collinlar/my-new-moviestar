import { ImageResponse } from 'next/og'
import { LaurelArt } from '@/components/LaurelArt'
import { createClient } from '@/lib/supabase/server'
import { getLaurelModel } from '@/lib/awards-results'
import { PALETTE, PRODUCTION_FORMATS, laurelSvg, parseFormat, parseVariant, type LaurelModel, type LaurelVariant } from '@/lib/laurel'

export const dynamic = 'force-dynamic'

const MUTED = '#A39B8F'

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '...'
}

/** The 1200 by 630 card that other sites and WhatsApp show when someone shares the honour. */
function SocialCard({ model, variant }: { model: LaurelModel; variant: LaurelVariant }) {
  const p = PALETTE[variant]
  return (
    <div style={{ display: 'flex', width: '1200px', height: '630px', background: p.paper ?? '#0B0A09', padding: '56px 72px', alignItems: 'center', gap: '56px' }}>
      <LaurelArt model={model} variant={variant} size={470} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        <div style={{ fontSize: '20px', letterSpacing: '0.16em', color: p.leaf, display: 'flex' }}>MUVIESTARS OFFICIAL HONOUR</div>
        <div style={{ fontSize: '70px', lineHeight: 1.02, color: p.ink, display: 'flex' }}>{truncate(model.subject, 30)}</div>
        {model.filmTitle && <div style={{ fontSize: '26px', color: p.muted, display: 'flex' }}>{`in ${truncate(model.filmTitle, 36)}`}</div>}
        <div style={{ fontSize: '38px', color: p.leaf, display: 'flex' }}>{model.honour}</div>
        <div style={{ fontSize: '24px', color: p.muted, display: 'flex' }}>{model.period}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '22px' }}>
          <div style={{ fontSize: '17px', letterSpacing: '0.1em', color: p.muted, display: 'flex' }}>VERIFY THIS HONOUR</div>
          <div style={{ fontSize: '21px', color: p.ink, display: 'flex' }}>{`muviestars.com/recognition/${model.code}`}</div>
        </div>
      </div>
    </div>
  )
}

function fileName(model: LaurelModel, variant: LaurelVariant, ext: string) {
  return `muviestars-${model.code.toLowerCase()}-${variant}.${ext}`
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const code = raw.toUpperCase()
  const { searchParams } = new URL(request.url)
  const variant = parseVariant(searchParams.get('variant'))
  const format = parseFormat(searchParams.get('format')) ?? 'preview'
  const download = searchParams.get('download') === '1'

  const model = await getLaurelModel(code)
  if (!model) return new Response('That honour does not exist.', { status: 404 })

  // Production files are for award administrators and the film's rights holder. The database decides, and logs it.
  if (PRODUCTION_FORMATS.includes(format)) {
    const supabase = (await createClient()) as any
    const { error } = await supabase.rpc('award_authorise_laurel_download', { p_code: code, p_variant: variant, p_format: format })
    if (error) {
      return new Response('Production laurels are for award administrators and the account that got this film listed on MuvieStars. Sign in with that account to download.', {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
  } else if (model.status === 'revoked' || model.status === 'corrected') {
    // A withdrawn or replaced honour must not keep circulating as an image.
    return new Response('This honour no longer stands. See its page for the explanation.', { status: 404 })
  }

  const privateHeaders = { 'Cache-Control': 'private, no-store' }
  const publicHeaders = { 'Cache-Control': 'public, max-age=300, s-maxage=600' }

  if (format === 'svg') {
    return new Response(laurelSvg(model, variant), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName(model, variant, 'svg')}"`,
      },
    })
  }

  if (format === 'png') {
    return new ImageResponse(<LaurelArt model={model} variant={variant} size={2000} />, {
      width: 2000,
      height: 2000,
      headers: { ...privateHeaders, 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName(model, variant, 'png')}"` },
    })
  }

  if (format === 'card') {
    return new ImageResponse(<SocialCard model={model} variant={variant} />, {
      width: 1200,
      height: 630,
      headers: download ? { ...publicHeaders, 'Content-Disposition': `attachment; filename="${fileName(model, variant, 'png').replace('.png', '-card.png')}"` } : publicHeaders,
    })
  }

  // preview: small, on a solid background, so it can be looked at but is no use as a production file.
  const p = PALETTE[variant]
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '640px', height: '640px', background: p.paper ?? '#0B0A09', alignItems: 'center', justifyContent: 'center', color: MUTED }}>
        <LaurelArt model={model} variant={variant} size={600} />
      </div>
    ),
    { width: 640, height: 640, headers: publicHeaders },
  )
}
