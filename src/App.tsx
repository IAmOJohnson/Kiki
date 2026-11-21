import { useEffect, useState } from 'react'
import { GiftView } from '@/components/GiftView'
import { Surprise } from '@/components/surprise/Surprise'
import { AdminApp } from '@/components/admin/AdminApp'
import { fetchPublicSettings } from '@/lib/api'
import { readGift, type Gift } from '@/lib/gift'
import { DEFAULTS, type Settings } from '@/lib/surprise'

function SharedSurprise({ id }: { id: string }) {
  const [settings, setSettings] = useState<Settings>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    fetchPublicSettings(id)
      .then((s) => live && setSettings(s))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [id])

  if (settings) return <Surprise settings={settings} />
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center text-white" style={{ background: '#05060a' }}>
      <p className="display text-xl">{failed ? 'This surprise could not be found. Check the link and try again.' : 'Loading your surprise...'}</p>
    </div>
  )
}

export default function App() {
  // Older USDC gift links (?to=0x...) keep working.
  const [gift, setGift] = useState<Gift | null>(() => readGift(window.location.search))
  const path = window.location.pathname

  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />

  const shared = /^\/s\/([a-z0-9]{10})\/?$/.exec(path)
  if (shared) return <SharedSurprise id={shared[1]} />

  if (gift) {
    const reset = () => {
      window.history.pushState(null, '', '/')
      setGift(null)
    }
    return <GiftView gift={gift} onNew={reset} />
  }

  return <Surprise settings={DEFAULTS} adminLink />
}
