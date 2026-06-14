import { requireAdmin } from '@/lib/admin'
import Link from 'next/link'
import { Film, Star, MessageSquare, Users, Plus, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin()

  const [
    { count: totalMovies },
    { count: featuredMovies },
    { count: pendingReviews },
    { count: totalPeople },
    { count: totalReviews },
  ] = await Promise.all([
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('movies').select('*', { count: 'exact', head: true }).eq('featured', true),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('people').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  const { count: moviesThisMonth } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thisMonth.toISOString())

  const stats = [
    { label: 'Total movies',     value: totalMovies    ?? 0, icon: Film,         href: '/admin/movies'     },
    { label: 'Featured',         value: featuredMovies ?? 0, icon: Star,         href: '/admin/movies?featured=true' },
    { label: 'Added this month', value: moviesThisMonth ?? 0, icon: Film,        href: '/admin/movies'     },
    { label: 'Pending reviews',  value: pendingReviews ?? 0, icon: MessageSquare, href: '/admin/moderation' },
    { label: 'Total reviews',    value: totalReviews   ?? 0, icon: MessageSquare, href: '/admin/moderation' },
    { label: 'People',           value: totalPeople    ?? 0, icon: Users,        href: '/admin/people'     },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Overview</p>
        <h1 className="text-2xl font-bold text-film-cream">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="cinema-card p-5 group"
          >
            <div className="flex items-start justify-between mb-3">
              <Icon className="w-4 h-4 text-film-muted group-hover:text-film-gold transition-colors" aria-hidden="true" />
            </div>
            <div className="text-3xl font-bold text-film-cream mb-1">{value.toLocaleString()}</div>
            <div className="text-xs text-film-muted">{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-4">
        <p className="section-label mb-4">Quick actions</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/movies/add" className="cinema-card p-6 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-lg bg-film-gold/10 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5 text-film-gold" aria-hidden="true" />
          </div>
          <div>
            <div className="font-medium text-film-cream text-sm">Add a movie</div>
            <div className="text-xs text-film-muted mt-0.5">Single entry with full details</div>
          </div>
        </Link>

        <Link href="/admin/movies" className="cinema-card p-6 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-lg bg-cinema-surface flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 text-film-muted group-hover:text-film-cream transition-colors" aria-hidden="true" />
          </div>
          <div>
            <div className="font-medium text-film-cream text-sm">Manage movies</div>
            <div className="text-xs text-film-muted mt-0.5">Edit, feature, or remove titles</div>
          </div>
        </Link>

        <Link href="/admin/moderation" className="cinema-card p-6 flex items-center gap-4 group">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${(pendingReviews ?? 0) > 0 ? 'bg-film-gold/10' : 'bg-cinema-surface'}`}>
            <MessageSquare className={`w-5 h-5 ${(pendingReviews ?? 0) > 0 ? 'text-film-gold' : 'text-film-muted group-hover:text-film-cream transition-colors'}`} aria-hidden="true" />
          </div>
          <div>
            <div className="font-medium text-film-cream text-sm">
              Moderation
              {(pendingReviews ?? 0) > 0 && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-film-gold/20 text-film-gold font-semibold">
                  {pendingReviews}
                </span>
              )}
            </div>
            <div className="text-xs text-film-muted mt-0.5">Review the approval queue</div>
          </div>
        </Link>

        <Link href="/admin/people" className="cinema-card p-6 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-lg bg-cinema-surface flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-film-muted group-hover:text-film-cream transition-colors" aria-hidden="true" />
          </div>
          <div>
            <div className="font-medium text-film-cream text-sm">People</div>
            <div className="text-xs text-film-muted mt-0.5">Actors, directors, crew</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
