import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Gift, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { isMusicPlaying, startMusic, stopMusic } from '@/lib/music'
import {
  bookPages,
  placeholderPhoto,
  sequenceWords,
  themeColors,
  type Settings,
} from '@/lib/surprise'
import { BirthdayBox } from './BirthdayBox'
import { MatrixRain } from './MatrixRain'
import { PhotoBook } from './PhotoBook'
import { HeartCollage } from './HeartCollage'
import { FloatingHearts } from './FloatingHearts'

type Phase = 'gate' | 'countdown' | 'greeting' | 'gift' | 'book' | 'heart' | 'end'

const ICON_BTN =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur'

export function Surprise({ settings, adminLink = false }: { settings: Settings; adminLink?: boolean }) {
  const [phase, setPhase] = useState<Phase>('gate')
  const [count, setCount] = useState<number>(settings.countdown)
  const [wordIndex, setWordIndex] = useState(0)
  const [giftOpen, setGiftOpen] = useState(false)
  const [music, setMusic] = useState(false)

  const colors = useMemo(() => themeColors(settings), [settings])
  const accent = colors[0]
  const words = useMemo(() => sequenceWords(settings.sequence), [settings.sequence])
  const pages = useMemo(
    () => settings.pages.map((p, i) => ({ caption: p.caption, src: p.src ?? placeholderPhoto(i, colors), book: p.book })),
    [settings.pages, colors],
  )
  const bookCards = useMemo(() => {
    const shown = new Set(bookPages(settings.pages))
    return pages.filter((_, i) => shown.has(settings.pages[i]))
  }, [pages, settings.pages])

  useEffect(() => () => stopMusic(), [])

  const afterGift = useCallback((): Phase => (settings.book ? 'book' : settings.hearts ? 'heart' : 'end'), [settings.book, settings.hearts])
  const afterBook = useCallback((): Phase => (settings.hearts ? 'heart' : 'end'), [settings.hearts])

  // Phase timers
  useEffect(() => {
    if (phase === 'countdown') {
      const t = setTimeout(() => {
        if (count <= 1) {
          setWordIndex(0)
          setPhase('greeting')
        } else {
          setCount(count - 1)
        }
      }, 1000)
      return () => clearTimeout(t)
    }
    if (phase === 'greeting') {
      const more = wordIndex < words.length - 1
      const t = setTimeout(
        () => {
          if (more) {
            setWordIndex((i) => i + 1)
          } else {
            setGiftOpen(false)
            setPhase('gift')
          }
        },
        words.length === 0 ? 0 : more ? 1100 : 1900,
      )
      return () => clearTimeout(t)
    }
    if (phase === 'gift') {
      const open = setTimeout(() => setGiftOpen(true), 800)
      const go = setTimeout(() => setPhase(afterGift()), 3000)
      return () => {
        clearTimeout(open)
        clearTimeout(go)
      }
    }
  }, [phase, count, wordIndex, words, afterGift])

  const hasMusic = settings.music.kind !== 'none'
  const playMusic = () => startMusic(settings.music.kind === 'file' ? settings.music.src : undefined).then(() => setMusic(isMusicPlaying()))

  const begin = () => {
    setCount(settings.countdown)
    setWordIndex(0)
    setPhase('countdown')
    if (hasMusic && !isMusicPlaying()) void playMusic()
  }

  const toggleMusic = () => {
    if (isMusicPlaying()) {
      stopMusic()
      setMusic(false)
    } else {
      void playMusic()
    }
  }

  const rainIntensity = phase === 'gate' ? 0.4 : phase === 'book' || phase === 'heart' || phase === 'end' ? 0.22 : 1

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden text-white" style={{ background: '#05060a' }}>
      <MatrixRain text={settings.matrixText} colors={colors} intensity={rainIntensity} />

      {adminLink && phase === 'gate' && (
        <a href="/admin" className="fixed left-4 top-4 z-50 flex min-h-11 items-center rounded-full border border-white/20 bg-black/40 px-4 text-sm font-semibold text-white backdrop-blur">
          Admin
        </a>
      )}

      {hasMusic && (
        <div className="fixed right-4 top-4 z-50">
          <button type="button" className={ICON_BTN} onClick={toggleMusic} aria-label={music ? 'Mute music' : 'Play music'}>
            {music ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'gate' && (
          <motion.div
            key="gate"
            className="relative z-10 flex flex-col items-center px-6 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: accent }}>
              <Gift size={28} color="#fff" />
            </div>
            <h1 className="display mt-6 max-w-[16ch] text-balance text-4xl font-bold sm:text-5xl">A gift is waiting for you</h1>
            <p className="mt-3 max-w-[34ch] text-pretty text-white/70">Turn your sound on, then tap to open it.</p>
            <button
              type="button"
              onClick={begin}
              className="mt-8 min-h-[52px] rounded-full px-10 text-base font-semibold text-white"
              style={{ background: accent, boxShadow: `0 10px 40px ${accent}66` }}
            >
              Open the gift
            </button>
          </motion.div>
        )}

        {phase === 'countdown' && (
          <motion.div key={`count-${count}`} className="relative z-10" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.45 }}>
            <span className="script-title block px-6 py-4 text-[9rem] leading-none sm:text-[13rem]" style={{ color: '#fff', textShadow: `0 0 18px ${accent}, 0 0 50px ${accent}, 0 0 100px ${accent}` }} aria-live="polite">
              {Math.max(count, 0)}
            </span>
          </motion.div>
        )}

        {phase === 'greeting' && words.length > 0 && (
          <motion.h2
            key={`word-${wordIndex}`}
            className="script-greeting relative z-10 max-w-[90vw] px-4 text-center text-6xl leading-tight text-balance sm:text-8xl"
            style={{ color: '#fff', textShadow: `0 0 30px ${accent}, 0 0 70px ${accent}` }}
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(12px)' }}
            transition={{ duration: 0.5 }}
          >
            {words[wordIndex]}
          </motion.h2>
        )}

        {phase === 'gift' && (
          <motion.div key="gift" className="relative z-10" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <BirthdayBox opened={giftOpen} onOpen={() => setGiftOpen(true)} colors={colors} />
          </motion.div>
        )}

        {phase === 'book' && (
          <motion.div key="book" className="relative z-10 flex w-full justify-center px-4" exit={{ opacity: 0 }}>
            <PhotoBook pages={bookCards} accent={accent} onFinish={() => setPhase(afterBook())} />
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'heart' && (
        <>
          <HeartCollage photos={pages} accent={accent} />
          <FloatingHearts colors={colors} />
        </>
      )}

      {(phase === 'heart' || phase === 'end') && (
        <motion.div className="fixed inset-x-0 bottom-6 z-30 flex justify-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 }}>
          <button type="button" onClick={begin} className="flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-black/50 px-5 text-sm font-semibold text-white backdrop-blur">
            <RotateCcw size={16} /> Watch again
          </button>
        </motion.div>
      )}

    </div>
  )
}
