import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function FloatingHearts({ colors }: { colors: [string, string] }) {
  const [c1, c2] = colors
  const hearts = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: rand(i, 1) * 100,
        size: 14 + rand(i, 2) * 22,
        delay: rand(i, 3) * 6,
        duration: 7 + rand(i, 3) * 6,
        drift: (rand(i, 5) - 0.5) * 80,
        color: i % 2 === 0 ? c1 : c2,
      })),
    [c1, c2],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden" aria-hidden="true">
      {hearts.map((h, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0"
          style={{ left: `${h.left}%` }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: -window.innerHeight - 60, x: h.drift, opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: 'easeOut' }}
        >
          <Heart size={h.size} fill={h.color} color={h.color} />
        </motion.span>
      ))}
    </div>
  )
}
