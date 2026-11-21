import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'

export interface BookPage {
  src: string
  caption: string
}

interface Props {
  pages: BookPage[]
  accent: string
  onFinish: () => void
}

/** A stack of photo cards. Each card turns like a page, revealing the next. */
export function PhotoBook({ pages, accent, onFinish }: Props) {
  const [turned, setTurned] = useState(0)
  const last = pages.length - 1
  const atEnd = turned >= last

  const next = () => (atEnd ? onFinish() : setTurned((t) => t + 1))
  const prev = () => setTurned((t) => Math.max(0, t - 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setTurned((t) => (t >= last ? t : t + 1))
      if (e.key === 'ArrowLeft') setTurned((t) => Math.max(0, t - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const onSwipe = (offsetX: number, velocityX: number) => {
    if (offsetX < -50 || velocityX < -400) next()
    else if (offsetX > 50 || velocityX > 400) prev()
  }

  return (
    <motion.div
      className="flex w-full flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.9, y: 40 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <motion.div
        className="relative h-[min(62dvh,480px)] w-[min(78vw,360px)] cursor-grab select-none active:cursor-grabbing"
        style={{ perspective: 1600, touchAction: 'pan-y' }}
        onPanEnd={(_, info) => onSwipe(info.offset.x, info.velocity.x)}
      >
        {pages.map((page, i) => {
          const isTurned = i < turned
          return (
            <motion.figure
              key={i}
              className="absolute inset-0 m-0 flex flex-col rounded-2xl bg-white p-3 pb-4 shadow-2xl"
              style={{
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                zIndex: isTurned ? i : pages.length - i,
                boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
              }}
              initial={false}
              animate={{ rotateY: isTurned ? -165 : 0, rotateZ: isTurned ? 0 : (i % 2 === 0 ? -1.2 : 1.2) }}
              transition={{ type: 'spring', stiffness: 90, damping: 16 }}
            >
              <img src={page.src} alt={page.caption || `Photo ${i + 1}`} className="min-h-0 flex-1 rounded-xl object-cover" draggable={false} />
              <figcaption className="display mt-3 flex min-h-12 items-center justify-center gap-2 px-2 text-center text-base font-medium text-balance" style={{ color: '#122d45' }}>
                {page.caption || <Heart size={18} style={{ color: accent }} fill={accent} aria-label="Heart" />}
              </figcaption>
            </motion.figure>
          )
        })}
      </motion.div>
      <p className="-mt-2 text-xs text-white/50">Swipe or use the arrows to turn the page</p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={prev}
          disabled={turned === 0}
          aria-label="Previous photo"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2" aria-hidden="true">
          {pages.map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: i === turned ? accent : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          aria-label={atEnd ? 'Finish the book' : 'Next photo'}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <button type="button" onClick={onFinish} className="min-h-11 px-4 text-sm font-semibold text-white/60 underline">
        Skip to the heart
      </button>
    </motion.div>
  )
}
