'use client'

import { useState } from 'react'

const BTN: React.CSSProperties = {
  minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.18)', background: 'transparent',
  color: '#EDE4D2', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontFamily: 'inherit',
}

/** Two ways to pass the honour on: WhatsApp first, because that is where Ghana shares, and a plain copy of the link. */
export function ShareHonour({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied('yes')
    } catch {
      setCopied('no')
    }
  }

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" style={BTN}>Share on WhatsApp</a>
      <button type="button" onClick={copy} style={BTN}>Copy the link</button>
      {copied === 'yes' && <span role="status" style={{ fontSize: '14px', color: '#7FA88B' }}>Link copied.</span>}
      {copied === 'no' && <span role="status" style={{ fontSize: '14px', color: '#E58A7B' }}>Your browser blocked the copy. Select the address bar and copy it from there.</span>}
    </div>
  )
}
