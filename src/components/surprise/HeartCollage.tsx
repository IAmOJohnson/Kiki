import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { MAX_HEART_PHOTOS } from '@/lib/surprise'

export interface CollagePhoto {
  src: string
  caption: string
}

interface Props {
  photos: CollagePhoto[]
  accent: string
}

/** With only a few photos the heart would look empty, so short lists repeat up to this many slots. */
const MIN_SLOTS = 8

/** Up to 15 photos fly out from the centre and settle along a heart. Tap one to enlarge it. */
export function HeartCollage({ photos, accent }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const slots = Math.min(MAX_HEART_PHOTOS, Math.max(photos.length, MIN_SLOTS))

  const layout = useMemo(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    const unit = Math.min(w / 38, h / 40)
    const size = Math.max(52, Math.min(112, unit * 6))
    return Array.from({ length: slots }, (_, i) => {
      const t = (i / slots) * 2 * Math.PI
      const x = 16 * Math.sin(t) ** 3
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      return { x: x * unit, y: y * unit - unit * 1.5, size, tilt: ((i * 53) % 17) - 8 }
    })
  }, [slots])

  useEffect(() => {
    if (selected === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  if (photos.length === 0) return null
  const open = selected === null ? null : photos[selected % photos.length]

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-10" role="group" aria-label="Photo collage in the shape of a heart">
        {layout.map((p, i) => {
          const photo = photos[i % photos.length]
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={photo.caption ? `Enlarge photo: ${photo.caption}` : `Enlarge photo ${(i % photos.length) + 1}`}
              className="pointer-events-auto absolute cursor-zoom-in overflow-hidden rounded-lg border-2 border-white bg-white p-0 shadow-xl"
              style={{ left: '50%', top: '50%', width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
              animate={{ x: p.x, y: p.y, scale: 1, opacity: 1, rotate: p.tilt }}
              whileHover={{ scale: 1.12, rotate: 0, zIndex: 5 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 70, damping: 14, delay: 0.25 + i * 0.09 }}
            >
              <img src={photo.src} alt="" draggable={false} className="h-full w-full object-cover" />
            </motion.button>
          )
        })}
        <motion.div
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.25 + slots * 0.09, duration: 1.2 }}
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Photo"
          >
            <motion.figure
              className="relative m-0 flex max-h-[90dvh] w-full max-w-md flex-col rounded-2xl bg-white p-3 pb-4"
              style={{ boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${accent}55` }}
              initial={{ scale: 0.6, y: 40, rotate: -4 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={open.src} alt={open.caption || 'Photo'} className="min-h-0 flex-1 rounded-xl object-contain" style={{ maxHeight: '70dvh' }} />
              {open.caption && (
                <figcaption className="display mt-3 px-2 text-center text-lg font-medium text-balance" style={{ color: '#122d45' }}>
                  {open.caption}
                </figcaption>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close photo"
                className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
                style={{ background: accent }}
              >
                <X size={20} />
              </button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
