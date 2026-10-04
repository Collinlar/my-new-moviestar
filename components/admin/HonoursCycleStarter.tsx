'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INPUT: React.CSSProperties = {
  height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(237,228,210,0.12)',
  background: '#15120E', color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}

const thisMonth = () => {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function HonoursCycleStarter({ programs }: { programs: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [programId, setProgramId] = useState(programs[0]?.id ?? '')
  const [month, setMonth] = useState(thisMonth())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function start() {
    setError(null)
    if (!programId) { setError('There is no active programme to run a cycle for.'); return }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) { setError('Set the month as year and month, like 2026-11.'); return }
    startTransition(async () => {
      const { data, error: err } = await supabase.rpc('award_create_cycle', { p_program: programId, p_month: `${month}-01` })
      if (err) {
        setError(err.code === '23505' ? 'That month already has a cycle for this programme.' : err.code === '42501' ? 'Only awards administrators can start a cycle.' : `The cycle did not start: ${err.message}`)
        return
      }
      router.push(`/admin/honours/${data}`)
    })
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '28px' }}>
      <div>
        <label htmlFor="h-month" style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6A6258', marginBottom: '6px', fontFamily: '"Geist Mono", monospace' }}>Month</label>
        <input id="h-month" style={{ ...INPUT, width: '140px' }} value={month} placeholder="2026-11" onChange={(e) => setMonth(e.target.value)} />
      </div>
      {programs.length > 1 && (
        <select aria-label="Programme" style={{ ...INPUT, cursor: 'pointer' }} value={programId} onChange={(e) => setProgramId(e.target.value)}>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button
        onClick={start}
        disabled={isPending}
        style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)', color: '#C8963E', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: '"Geist Mono", monospace', opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? 'Starting the cycle...' : '+ Start a cycle'}
      </button>
      {error && <p role="alert" style={{ margin: 0, width: '100%', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
    </div>
  )
}
