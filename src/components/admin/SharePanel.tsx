import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Download, ExternalLink, Link2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { buildShareLink } from '@/lib/share'

/** Link and QR code for a saved surprise. The recipient opens it and sees the finished experience. */
interface Props {
  id: string
  title: string
  /** Makes a new link for the same surprise. Rejects if it fails. */
  onRegenerate: () => Promise<void>
  /** False while there are unsaved edits. */
  canRegenerate: boolean
}

export function SharePanel({ id, title, onRegenerate, canRegenerate }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [link, setLink] = useState<string>()
  const [qr, setQr] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    void buildShareLink(`/s/${id}`).then(async (url) => {
      if (!live) return
      setLink(url)
      const data = await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      if (live) setQr(data)
    })
    return () => {
      live = false
    }
  }, [id])

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  const regenerate = async () => {
    setRegenerating(true)
    try {
      await onRegenerate()
      setConfirming(false)
      setLink(undefined)
      setQr(undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not make a new link.')
    } finally {
      setRegenerating(false)
    }
  }

  const fileName = `${title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'surprise'}-qr.png`

  return (
    <section className="card p-6" aria-label="Send it out">
      <h2 className="display text-xl font-semibold">Send it out</h2>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Whoever opens this link or scans the code sees the finished surprise. Saving changes updates it for everyone.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl bg-white p-2" style={{ border: '1px solid var(--border)' }}>
          {qr ? <img src={qr} alt="QR code that opens the surprise" className="h-full w-full" /> : <span className="text-xs" style={{ color: 'var(--muted)' }}>Making QR code...</span>}
        </div>
        <div className="w-full min-w-0 flex-1">
          <input className="field mono text-xs" readOnly value={link ?? 'Preparing link...'} aria-label="Surprise link" onFocus={(e) => e.currentTarget.select()} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="chip flex items-center justify-center gap-2" onClick={() => void copy()} disabled={!link}>
              {copied ? <Check size={16} /> : <Link2 size={16} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {qr ? (
              <a className="chip flex items-center justify-center gap-2" href={qr} download={fileName}>
                <Download size={16} /> Save QR
              </a>
            ) : (
              <button type="button" className="chip flex items-center justify-center gap-2" disabled>
                <Download size={16} /> Save QR
              </button>
            )}
          </div>
          {confirming ? (
            <div className="mt-3 rounded-2xl p-3" style={{ background: 'var(--surface-muted)' }} role="alert">
              <p className="text-sm text-pretty">
                Make a new link? The current link and QR code stop working. Your photos, music and text stay exactly as they are.
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="chip flex-1 !px-3 text-sm" onClick={() => void regenerate()} disabled={regenerating}>
                  {regenerating ? 'Making...' : 'Make new link'}
                </button>
                <button type="button" className="chip flex-1 !px-3 text-sm" onClick={() => setConfirming(false)} disabled={regenerating}>
                  Keep current
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="chip mt-3 flex w-full items-center justify-center gap-2" onClick={() => setConfirming(true)} disabled={!canRegenerate || !link}>
              <RefreshCw size={16} /> Regenerate link
            </button>
          )}
          {!canRegenerate && <p className="mt-1 text-xs" style={{ color: 'var(--subtle)' }}>Save your changes first to make a new link.</p>}
          {link && (
            <a className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline" href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Open as the recipient
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
