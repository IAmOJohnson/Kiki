import { ArrowDown, ArrowUp, BookOpen, ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadMedia } from '@/lib/api'
import { prepareImage } from '@/lib/image'
import { MAX_BOOK_PAGES, MAX_PAGES, type SurprisePage } from '@/lib/surprise'

interface Props {
  pages: SurprisePage[]
  setPages: (update: (prev: SurprisePage[]) => SurprisePage[]) => void
  track: <T>(job: Promise<T>) => Promise<T>
}

async function uploadPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`)
  return uploadMedia(await prepareImage(file), 'jpg')
}

export function PhotoCardsField({ pages, setPages, track }: Props) {
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PAGES - pages.length
    const picked = Array.from(files).slice(0, room)
    if (files.length > room) toast.message(`Only ${MAX_PAGES} photo cards fit. The rest were skipped.`)
    const results = await Promise.allSettled(picked.map((f) => track(uploadPhoto(f))))
    const added: SurprisePage[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') added.push({ caption: '', src: r.value })
      else toast.error(r.reason instanceof Error ? r.reason.message : 'A photo could not be uploaded.')
    })
    if (added.length) {
      setPages((prev) => {
        const free = MAX_BOOK_PAGES - prev.filter((p) => p.book).length
        const withBook = added.map((p, i) => (i < free ? { ...p, book: true } : p))
        return [...prev, ...withBook].slice(0, MAX_PAGES)
      })
    }
  }

  const replace = async (index: number, file?: File) => {
    if (!file) return
    try {
      const src = await track(uploadPhoto(file))
      setPages((prev) => prev.map((p, i) => (i === index ? { ...p, src } : p)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That photo could not be uploaded.')
    }
  }

  const patch = (index: number, p: Partial<SurprisePage>) => setPages((prev) => prev.map((page, i) => (i === index ? { ...page, ...p } : page)))
  const move = (index: number, dir: -1 | 1) =>
    setPages((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const bookCount = pages.filter((p) => p.book).length

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold tabular-nums">
        Photo book: {bookCount} of {MAX_BOOK_PAGES} picked
      </p>
      {pages.map((page, i) => (
        <div key={`${i}-${page.src ?? 'empty'}`} className="flex items-center gap-3 rounded-2xl p-2" style={{ background: 'var(--surface-muted)' }}>
          <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-white" aria-label={`Choose photo for card ${i + 1}`}>
            {page.src ? <img src={page.src} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} style={{ color: 'var(--muted)' }} />}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void replace(i, e.target.files?.[0])} />
          </label>
          <input className="field !min-h-11 !py-2 text-sm" value={page.caption} maxLength={140} onChange={(e) => patch(i, { caption: e.target.value })} aria-label={`Caption for card ${i + 1}`} placeholder="Caption" />
          <div className="flex shrink-0 flex-col">
            <button type="button" className="flex h-7 w-9 items-center justify-center disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move card ${i + 1} up`}>
              <ArrowUp size={14} />
            </button>
            <button type="button" className="flex h-7 w-9 items-center justify-center disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === pages.length - 1} aria-label={`Move card ${i + 1} down`}>
              <ArrowDown size={14} />
            </button>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-30"
            style={page.book ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : { borderColor: 'var(--border)' }}
            aria-pressed={Boolean(page.book)}
            aria-label={page.book ? `Remove card ${i + 1} from the photo book` : `Put card ${i + 1} in the photo book`}
            disabled={!page.book && bookCount >= MAX_BOOK_PAGES}
            onClick={() => patch(i, { book: !page.book })}
          >
            <BookOpen size={16} />
          </button>
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30" disabled={pages.length <= 1} onClick={() => setPages((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Remove card ${i + 1}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {pages.length < MAX_PAGES && (
        <label className="chip flex w-full cursor-pointer items-center justify-center gap-2">
          <ImagePlus size={16} /> Add photos
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        </label>
      )}
      <p className="text-xs" style={{ color: 'var(--subtle)' }}>
        {pages.length} of {MAX_PAGES} photos. All of them go in the heart collage. Pick up to {MAX_BOOK_PAGES} for the photo book with the book button. A soft heart card shows until you add a picture.
      </p>
    </div>
  )
}
