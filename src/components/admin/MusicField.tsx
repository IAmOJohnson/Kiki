import { Music, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploadMedia } from '@/lib/api'
import { audioExtension } from '@/lib/image'
import type { MusicSetting } from '@/lib/surprise'

interface Props {
  music: MusicSetting
  onChange: (music: MusicSetting) => void
  track: <T>(job: Promise<T>) => Promise<T>
}

const MAX_AUDIO_BYTES = 5 * 1024 * 1024

export function MusicField({ music, onChange, track }: Props) {
  const upload = async (file?: File) => {
    if (!file) return
    const ext = audioExtension(file)
    if (!ext) return void toast.error('Use an MP3, WAV, OGG or M4A file.')
    if (file.size > MAX_AUDIO_BYTES) return void toast.error('That song is over 5 MB. Try a shorter or smaller file.')
    try {
      const src = await track(uploadMedia(file, ext))
      onChange({ kind: 'file', src })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That song could not be uploaded.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" className="chip !px-2 text-sm" aria-pressed={music.kind === 'musicbox'} onClick={() => onChange({ kind: 'musicbox' })}>
          Music box
        </button>
        <button type="button" className="chip !px-2 text-sm" aria-pressed={music.kind === 'file'} onClick={() => onChange({ kind: 'file', src: music.src })}>
          My song
        </button>
        <button type="button" className="chip !px-2 text-sm" aria-pressed={music.kind === 'none'} onClick={() => onChange({ kind: 'none' })}>
          No music
        </button>
      </div>
      {music.kind === 'musicbox' && (
        <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          <Music size={16} /> A gentle music-box Happy Birthday plays on a loop.
        </p>
      )}
      {music.kind === 'file' && (
        <div className="space-y-2">
          <label className="chip flex w-full cursor-pointer items-center justify-center gap-2">
            <Upload size={16} /> {music.src ? 'Replace song' : 'Upload a song'}
            <input type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" className="sr-only" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {music.src ? <audio controls src={music.src} className="w-full" /> : <p className="text-sm" style={{ color: 'var(--danger)' }}>No song yet. Upload one, or the music box plays instead.</p>}
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>MP3, WAV, OGG or M4A, up to 5 MB. Only use music you have the right to share.</p>
        </div>
      )}
    </div>
  )
}
