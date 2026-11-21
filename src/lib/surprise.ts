export type ThemeId = 'pink' | 'blue' | 'purple' | 'custom'

export interface SurprisePage {
  caption: string
  /** An uploaded photo (`/api/media/...`) or an https URL. Empty means a placeholder card. */
  src?: string
  /** Whether this photo is one of the (at most 5) pages in the photo book. */
  book?: boolean
}

export interface MusicSetting {
  kind: 'musicbox' | 'file' | 'none'
  /** Uploaded song (`/api/media/...`) when kind is `file`. */
  src?: string
}

export interface Settings {
  countdown: 3 | 5 | 10
  matrixText: string
  theme: ThemeId
  color1: string
  color2: string
  sequence: string
  pages: SurprisePage[]
  book: boolean
  hearts: boolean
  music: MusicSetting
}

export const MAX_PAGES = 15
/** The heart never shows more photos than this. */
export const MAX_HEART_PHOTOS = 15
/** The photo book holds at most this many photos. */
export const MAX_BOOK_PAGES = 5
export const THEMES: Record<Exclude<ThemeId, 'custom'>, [string, string]> = {
  pink: ['#ff69b4', '#ff1493'],
  blue: ['#4cc9f0', '#4361ee'],
  purple: ['#c77dff', '#7b2cbf'],
}

export const DEFAULTS: Settings = {
  countdown: 5,
  matrixText: 'HAPPYBIRTHDAY',
  theme: 'pink',
  color1: '#ff69b4',
  color2: '#ff1493',
  sequence: 'HAPPY|BIRTHDAY|TO|ANITA',
  pages: [
    { caption: 'Happy birthday, Anita', book: true },
    { caption: 'Every memory with you is my favourite', book: true },
    { caption: 'As long as you are smiling, I am happy', book: true },
  ],
  book: true,
  hearts: true,
  music: { kind: 'musicbox' },
}

const HEX = /^#[0-9a-fA-F]{6}$/
const IMAGE_SRC = /^(\/api\/media\/[0-9a-f-]{36}\.(jpg|png|webp)|https:\/\/\S+)$/
const AUDIO_SRC = /^(\/api\/media\/[0-9a-f-]{36}\.(mp3|wav|ogg|m4a)|https:\/\/\S+)$/

export function themeColors(s: Pick<Settings, 'theme' | 'color1' | 'color2'>): [string, string] {
  return s.theme === 'custom' ? [s.color1, s.color2] : THEMES[s.theme]
}

export function sequenceWords(sequence: string): string[] {
  return sequence
    .split('|')
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 12)
}

/** The photos shown in the book: the ones picked for it, or the first five when none are picked. */
export function bookPages(pages: SurprisePage[]): SurprisePage[] {
  const picked = pages.filter((p) => p.book).slice(0, MAX_BOOK_PAGES)
  return picked.length > 0 ? picked : pages.slice(0, MAX_BOOK_PAGES)
}

const str = (v: unknown, max: number, fallback: string) => (typeof v === 'string' ? v.slice(0, max) : fallback)

/** Clamp any value into valid Settings. Runs on the server before saving and in the browser after loading. */
export function sanitize(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULTS
  const r = raw as Record<string, unknown>
  const countdown = r.countdown === 3 || r.countdown === 10 ? r.countdown : 5
  const theme: ThemeId = r.theme === 'blue' || r.theme === 'purple' || r.theme === 'custom' ? r.theme : 'pink'
  let bookCount = 0
  const pages = Array.isArray(r.pages)
    ? r.pages.slice(0, MAX_PAGES).map((p): SurprisePage => {
        const o = (p ?? {}) as Record<string, unknown>
        const src = typeof o.src === 'string' && o.src.length <= 400 && IMAGE_SRC.test(o.src) ? o.src : undefined
        const book = o.book === true && bookCount < MAX_BOOK_PAGES
        if (book) bookCount += 1
        return { caption: str(o.caption, 140, ''), src, book: book || undefined }
      })
    : DEFAULTS.pages
  const m = (r.music ?? {}) as Record<string, unknown>
  const musicSrc = typeof m.src === 'string' && m.src.length <= 400 && AUDIO_SRC.test(m.src) ? m.src : undefined
  const music: MusicSetting =
    m.kind === 'none' ? { kind: 'none' } : m.kind === 'file' && musicSrc ? { kind: 'file', src: musicSrc } : { kind: 'musicbox' }
  return {
    countdown,
    matrixText: str(r.matrixText, 24, DEFAULTS.matrixText).trim() || DEFAULTS.matrixText,
    theme,
    color1: typeof r.color1 === 'string' && HEX.test(r.color1) ? r.color1 : DEFAULTS.color1,
    color2: typeof r.color2 === 'string' && HEX.test(r.color2) ? r.color2 : DEFAULTS.color2,
    sequence: str(r.sequence, 120, DEFAULTS.sequence),
    pages: pages.length > 0 ? pages : DEFAULTS.pages,
    book: r.book !== false,
    hearts: r.hearts !== false,
    music,
  }
}

/** A soft placeholder photo card so the book and heart look right before photos are added. */
export function placeholderPhoto(index: number, [c1, c2]: [string, string]): string {
  const angle = (index * 37) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">
<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="400" height="480" fill="url(#g)"/>
<path d="M200 330c-90-62-120-112-120-152 0-38 30-62 62-62 26 0 46 14 58 36 12-22 32-36 58-36 32 0 62 24 62 62 0 40-30 90-120 152z" fill="#fff" fill-opacity=".88"/>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
