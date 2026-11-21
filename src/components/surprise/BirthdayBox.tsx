import { useId } from 'react'
import { motion } from 'framer-motion'

interface Props {
  opened: boolean
  onOpen: () => void
  colors: [string, string]
}

const RIBBON = '#fff4d6'
const RIBBON_SHADE = '#f3d98f'
const PIECES = 18

/** A wrapped birthday present: polka-dot paper, ribbon and bow. The lid pops off and confetti flies out. */
export function BirthdayBox({ opened, onOpen, colors }: Props) {
  const [c1, c2] = colors
  const gid = useId().replace(/:/g, '')
  const confetti = Array.from({ length: PIECES }, (_, i) => {
    const angle = (i / PIECES) * Math.PI * 2 + (i % 3) * 0.2
    const dist = 90 + (i % 4) * 32
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 70,
      rotate: (i * 67) % 360,
      color: [c1, c2, '#ffffff', RIBBON_SHADE][i % 4],
      w: 6 + (i % 3) * 3,
      round: i % 2 === 0,
    }
  })

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={opened}
      aria-label={opened ? 'Birthday gift, opened' : 'Open the birthday gift'}
      className="relative mx-auto block h-64 w-64 cursor-pointer disabled:cursor-default sm:h-72 sm:w-72"
    >
      <motion.div
        className="absolute inset-0"
        animate={opened ? { y: 0, rotate: 0 } : { y: [0, -8, 0], rotate: [0, -2, 2, 0] }}
        transition={opened ? { duration: 0.2 } : { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={`${gid}-paper`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={c1} />
              <stop offset="1" stopColor={c2} />
            </linearGradient>
            <radialGradient id={`${gid}-glow`}>
              <stop offset="0" stopColor="#fff8e1" stopOpacity="0.95" />
              <stop offset="1" stopColor={c1} stopOpacity="0" />
            </radialGradient>
            <pattern id={`${gid}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="6" cy="6" r="3" fill="#fff" fillOpacity="0.32" />
              <circle cx="17" cy="17" r="3" fill="#fff" fillOpacity="0.32" />
            </pattern>
          </defs>

          <ellipse cx="100" cy="190" rx="70" ry="7" fill="#000" fillOpacity="0.35" />

          <motion.circle
            cx="100"
            cy="92"
            r="70"
            fill={`url(#${gid}-glow)`}
            initial={false}
            animate={opened ? { opacity: 1, scale: 1.25 } : { opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.9 }}
            style={{ transformOrigin: '100px 92px' }}
          />

          {/* Box */}
          <rect x="30" y="92" width="140" height="96" rx="10" fill={`url(#${gid}-paper)`} />
          <rect x="30" y="92" width="140" height="96" rx="10" fill={`url(#${gid}-dots)`} />
          <rect x="30" y="92" width="140" height="14" fill="#000" fillOpacity="0.18" />
          <rect x="89" y="92" width="22" height="96" fill={RIBBON} />
          <rect x="89" y="92" width="6" height="96" fill={RIBBON_SHADE} fillOpacity="0.55" />

          {/* Lid and bow */}
          <motion.g
            initial={false}
            animate={opened ? { y: -64, x: -34, rotate: -24 } : { y: 0, x: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 130, damping: 11 }}
            style={{ transformOrigin: '30px 92px', transformBox: 'view-box' }}
          >
            <rect x="22" y="66" width="156" height="32" rx="9" fill={`url(#${gid}-paper)`} />
            <rect x="22" y="66" width="156" height="32" rx="9" fill={`url(#${gid}-dots)`} />
            <rect x="22" y="66" width="156" height="9" rx="4" fill="#fff" fillOpacity="0.22" />
            <rect x="22" y="90" width="156" height="8" rx="4" fill="#000" fillOpacity="0.16" />
            <rect x="89" y="66" width="22" height="32" fill={RIBBON} />
            <rect x="89" y="66" width="6" height="32" fill={RIBBON_SHADE} fillOpacity="0.55" />
            {/* bow loops */}
            <path d="M100 66C78 30 42 36 54 56c8 12 32 11 46 10Z" fill={RIBBON} stroke={RIBBON_SHADE} strokeWidth="2" />
            <path d="M100 66c22-36 58-30 46-10-8 12-32 11-46 10Z" fill={RIBBON} stroke={RIBBON_SHADE} strokeWidth="2" />
            <path d="M80 52c6 6 14 9 20 14M120 52c-6 6-14 9-20 14" stroke={RIBBON_SHADE} strokeWidth="2" strokeLinecap="round" />
            {/* tails */}
            <path d="M96 68c-6 12-16 18-26 20l8 4c8-3 16-10 22-22Z" fill={RIBBON} stroke={RIBBON_SHADE} strokeWidth="2" />
            <path d="M104 68c6 12 16 18 26 20l-8 4c-8-3-16-10-22-22Z" fill={RIBBON} stroke={RIBBON_SHADE} strokeWidth="2" />
            <ellipse cx="100" cy="66" rx="9" ry="8" fill={RIBBON_SHADE} />
          </motion.g>
        </svg>
      </motion.div>

      {opened &&
        confetti.map((p, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute left-1/2 top-[40%]"
            style={{ width: p.w, height: p.round ? p.w : p.w * 2, background: p.color, borderRadius: p.round ? 999 : 2 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
            animate={{ x: p.x, y: [p.y, p.y + 140], opacity: [1, 1, 0], scale: 1, rotate: p.rotate + 360 }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: (i % 5) * 0.04 }}
          />
        ))}
    </button>
  )
}
