import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Eye, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { createSurprise, fetchSurprise, updateSurprise } from '@/lib/api'
import { DEFAULTS, THEMES, type Settings, type SurprisePage, type ThemeId } from '@/lib/surprise'
import { Surprise } from '@/components/surprise/Surprise'
import { MusicField } from './MusicField'
import { PhotoCardsField } from './PhotoCardsField'
import { SharePanel } from './SharePanel'

interface Props {
  id: string | null
  onBack: () => void
  onExpired: () => void
}

const THEME_LABELS: Record<ThemeId, string> = { pink: 'Pink', blue: 'Blue', purple: 'Purple', custom: 'Custom' }

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="display text-lg font-semibold">{title}</h2>
      {hint && (
        <p className="mt-1 text-xs text-pretty" style={{ color: 'var(--subtle)' }}>
          {hint}
        </p>
      )}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

export function SurpriseEditor({ id, onBack, onExpired }: Props) {
  const [savedId, setSavedId] = useState<string | null>(id)
  const [title, setTitle] = useState('For Anita')
  const [draft, setDraft] = useState<Settings>(DEFAULTS)
  const [snapshot, setSnapshot] = useState(() => JSON.stringify({ title: 'For Anita', draft: DEFAULTS }))
  const [loading, setLoading] = useState(id !== null)
  const [uploads, setUploads] = useState(0)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      if ((err as { status?: number }).status === 401) return onExpired()
      toast.error(err instanceof Error ? err.message : fallback)
    },
    [onExpired],
  )

  useEffect(() => {
    if (!id) return
    let live = true
    fetchSurprise(id)
      .then((record) => {
        if (!live) return
        setTitle(record.title)
        setDraft(record.settings)
        setSnapshot(JSON.stringify({ title: record.title, draft: record.settings }))
        setLoading(false)
      })
      .catch((err) => {
        fail(err, 'Could not load this surprise.')
        onBack()
      })
    return () => {
      live = false
    }
  }, [id, fail, onBack])

  const dirty = useMemo(() => JSON.stringify({ title, draft }) !== snapshot, [title, draft, snapshot])
  const patch = (p: Partial<Settings>) => setDraft((d) => ({ ...d, ...p }))
  const setPages = (update: (prev: SurprisePage[]) => SurprisePage[]) => setDraft((d) => ({ ...d, pages: update(d.pages) }))

  const track = useCallback(async <T,>(job: Promise<T>): Promise<T> => {
    setUploads((n) => n + 1)
    try {
      return await job
    } catch (err) {
      if ((err as { status?: number }).status === 401) onExpired()
      throw err
    } finally {
      setUploads((n) => n - 1)
    }
  }, [onExpired])

  const save = async () => {
    setSaving(true)
    try {
      const record = savedId ? await updateSurprise(savedId, title, draft) : await createSurprise(title, draft)
      setSavedId(record.id)
      setTitle(record.title)
      setDraft(record.settings)
      setSnapshot(JSON.stringify({ title: record.title, draft: record.settings }))
      toast.success('Saved. Your link is ready to send.')
    } catch (err) {
      fail(err, 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-8 text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-4 px-4 pb-32 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back to your surprises">
          <ArrowLeft size={20} />
        </button>
        <h1 className="display text-2xl font-bold">{savedId ? 'Edit surprise' : 'New surprise'}</h1>
      </header>

      <Block title="Name" hint="Only you see this. It helps you tell your surprises apart.">
        <input className="field" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} aria-label="Surprise name" />
      </Block>

      <Block title="Greeting" hint="Words appear one at a time. Separate them with a | character and keep each short.">
        <input className="field" value={draft.sequence} maxLength={120} onChange={(e) => patch({ sequence: e.target.value })} aria-label="Main greeting" placeholder="HAPPY|BIRTHDAY|TO|ANITA" />
      </Block>

      <Block title="Photos" hint="Add up to 15 photos for the heart collage, where tapping a photo enlarges it. Choose 5 of them for the photo book.">
        <PhotoCardsField pages={draft.pages} setPages={setPages} track={track} />
      </Block>

      <Block title="Music">
        <MusicField music={draft.music} onChange={(music) => patch({ music })} track={track} />
      </Block>

      <Block title="Look and timing">
        <div className="flex gap-2" role="group" aria-label="Countdown length">
          {([3, 5, 10] as const).map((n) => (
            <button key={n} type="button" className="chip flex-1" aria-pressed={draft.countdown === n} onClick={() => patch({ countdown: n })}>
              {n} sec
            </button>
          ))}
        </div>
        <label className="block text-sm font-semibold" htmlFor="rain">Raining letters</label>
        <input id="rain" className="field" value={draft.matrixText} maxLength={24} onChange={(e) => patch({ matrixText: e.target.value })} placeholder="HAPPYBIRTHDAY" />
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Colour theme">
          {(Object.keys(THEME_LABELS) as ThemeId[]).map((t) => {
            const swatch = t === 'custom' ? [draft.color1, draft.color2] : THEMES[t]
            return (
              <button key={t} type="button" className="chip flex flex-col items-center justify-center gap-1 !px-1 py-2 text-xs" aria-pressed={draft.theme === t} onClick={() => patch({ theme: t })}>
                <span className="h-4 w-8 rounded-full" style={{ background: `linear-gradient(90deg, ${swatch[0]}, ${swatch[1]})` }} />
                {THEME_LABELS[t]}
              </button>
            )
          })}
        </div>
        {draft.theme === 'custom' && (
          <div className="flex gap-3">
            <label className="flex flex-1 items-center gap-2 text-sm">
              <input type="color" value={draft.color1} onChange={(e) => patch({ color1: e.target.value })} className="h-11 w-14 rounded-lg" aria-label="First colour" />
              Colour 1
            </label>
            <label className="flex flex-1 items-center gap-2 text-sm">
              <input type="color" value={draft.color2} onChange={(e) => patch({ color2: e.target.value })} className="h-11 w-14 rounded-lg" aria-label="Second colour" />
              Colour 2
            </label>
          </div>
        )}
        <div className="flex gap-2" role="group" aria-label="Scenes">
          <button type="button" className="chip flex-1" aria-pressed={draft.book} onClick={() => patch({ book: !draft.book })}>
            Photo book
          </button>
          <button type="button" className="chip flex-1" aria-pressed={draft.hearts} onClick={() => patch({ hearts: !draft.hearts })}>
            Heart collage
          </button>
        </div>
      </Block>

      {savedId ? <SharePanel id={savedId} title={title} /> : (
        <p className="px-2 text-center text-sm" style={{ color: 'var(--muted)' }}>Save once to get a link and QR code you can send.</p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur" style={{ background: 'rgba(255,255,255,0.85)', borderColor: 'var(--border)' }}>
        <div className="mx-auto flex max-w-2xl gap-2">
          <button type="button" className="chip flex items-center justify-center gap-2" onClick={() => setPreview(true)}>
            <Eye size={16} /> Preview
          </button>
          <button type="button" className="btn-primary flex flex-1 items-center justify-center gap-2" disabled={saving || uploads > 0 || (!dirty && savedId !== null)} onClick={() => void save()}>
            <Save size={18} />
            {uploads > 0 ? 'Uploading...' : saving ? 'Saving...' : dirty || !savedId ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black">
          <Surprise settings={draft} />
          <button type="button" onClick={() => setPreview(false)} className="fixed left-4 top-4 z-[110] flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-black/60 px-4 text-sm font-semibold text-white backdrop-blur">
            <X size={16} /> Close preview
          </button>
        </div>
      )}
    </div>
  )
}
