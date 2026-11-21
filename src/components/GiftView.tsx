import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Link2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { buildShareLink } from '@/lib/share'
import { giftPath, shortAddress, type Gift } from '@/lib/gift'
import { GiftBox } from './GiftBox'
import { SendGift } from './SendGift'
import { RecentGifts } from './RecentGifts'

interface Props {
  gift: Gift
  onNew: () => void
}

export function GiftView({ gift, onNew }: Props) {
  const [opened, setOpened] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [shareLink, setShareLink] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    void buildShareLink(giftPath(gift)).then((url) => live && setShareLink(url))
    return () => {
      live = false
    }
  }, [gift])

  const copy = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-8">
      <header className="card px-6 pb-8 pt-6 text-center">
        <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.1em', color: 'var(--subtle)' }}>
          Made for {gift.name}
        </p>
        <div className="mt-4">
          <GiftBox opened={opened} onOpen={() => setOpened(true)} name={gift.name} />
        </div>
        {opened && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
            <h1 className="display mt-4 text-balance text-4xl font-bold">Happy birthday, {gift.name}</h1>
            {gift.note && (
              <p className="mx-auto mt-3 max-w-[40ch] text-pretty text-base" style={{ color: 'var(--ink-2)' }}>
                {gift.note}
              </p>
            )}
            <p className="mono mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
              Wallet {shortAddress(gift.to)}
            </p>
          </motion.div>
        )}
      </header>

      {opened && (
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.1 }}
        >
          <SendGift gift={gift} onSent={() => setRefreshKey((k) => k + 1)} />
          <RecentGifts gift={gift} refreshKey={refreshKey} />
          <div className="flex gap-2">
            <button type="button" className="chip flex flex-1 items-center justify-center gap-2" onClick={() => void copy()} disabled={!shareLink}>
              {copied ? <Check size={16} /> : <Link2 size={16} />}
              {copied ? 'Copied' : 'Copy gift link'}
            </button>
            <button type="button" className="chip flex flex-1 items-center justify-center gap-2" onClick={onNew}>
              <Plus size={16} /> New gift page
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
