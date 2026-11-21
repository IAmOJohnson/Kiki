import { motion } from 'framer-motion'

interface Props {
  opened: boolean
  onOpen: () => void
  name: string
}

export function GiftBox({ opened, onOpen, name }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={opened}
      aria-label={opened ? `Gift for ${name}, opened` : `Open the gift for ${name}`}
      className="relative mx-auto block h-44 w-44 cursor-pointer disabled:cursor-default"
    >
      <svg viewBox="0 0 160 160" className="h-full w-full" fill="none">
        <rect x="24" y="74" width="112" height="76" rx="12" fill="#122d45" />
        <rect x="72" y="74" width="16" height="76" fill="#85b1ed" />
        <motion.g
          initial={false}
          animate={opened ? { y: -34, rotate: -14, x: -8 } : { y: 0, rotate: 0, x: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 14 }}
          style={{ transformOrigin: '30px 74px', transformBox: 'view-box' }}
        >
          <rect x="16" y="52" width="128" height="26" rx="10" fill="#1061a6" />
          <rect x="72" y="52" width="16" height="26" fill="#85b1ed" />
          <path d="M80 52c-14-22-36-18-30-6 5 10 22 8 30 6Z" fill="#85b1ed" />
          <path d="M80 52c14-22 36-18 30-6-5 10-22 8-30 6Z" fill="#85b1ed" />
        </motion.g>
      </svg>
      {!opened && (
        <motion.span
          className="absolute inset-x-0 -bottom-2 text-center text-sm font-semibold"
          style={{ color: 'var(--muted)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
        >
          Tap to open
        </motion.span>
      )}
    </button>
  )
}
