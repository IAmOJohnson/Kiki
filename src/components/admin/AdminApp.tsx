import { useCallback, useEffect, useState } from 'react'
import { Gift, LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  adminLogin,
  adminSetup,
  adminStatus,
  deleteSurprise,
  getToken,
  listSurprises,
  setToken,
  type SurpriseSummary,
} from '@/lib/api'
import { SurpriseEditor } from './SurpriseEditor'

type Stage = 'loading' | 'offline' | 'setup' | 'login' | 'ready'

function AuthCard({ mode, onDone }: { mode: 'setup' | 'login'; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mismatch = mode === 'setup' && confirm.length > 0 && confirm !== password
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mismatch) return
    setBusy(true)
    setError('')
    try {
      const { token } = await (mode === 'setup' ? adminSetup(password) : adminLogin(password))
      setToken(token)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <form onSubmit={(e) => void submit(e)} className="card p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--accent)', color: '#fff' }}>
          <Gift size={22} />
        </div>
        <h1 className="display mt-4 text-3xl font-bold text-balance">{mode === 'setup' ? 'Create your admin password' : 'Admin sign in'}</h1>
        <p className="mt-2 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          {mode === 'setup'
            ? 'This password protects the controls that edit surprises. Set it now, before sharing this site with anyone.'
            : 'Sign in to edit your surprises and send them out.'}
        </p>
        <label htmlFor="pw" className="mt-6 block text-sm font-semibold">Password</label>
        <input id="pw" type="password" className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} minLength={mode === 'setup' ? 8 : undefined} required />
        {mode === 'setup' && (
          <>
            <label htmlFor="pw2" className="mt-4 block text-sm font-semibold">Confirm password</label>
            <input id="pw2" type="password" className="field mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            <p className="mt-1 text-xs" style={{ color: mismatch ? 'var(--danger)' : 'var(--subtle)' }}>
              {mismatch ? 'The passwords do not match.' : 'Use at least 8 characters.'}
            </p>
          </>
        )}
        {error && <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
        <button type="submit" className="btn-primary mt-5" disabled={busy || mismatch || password.length < (mode === 'setup' ? 8 : 1)}>
          {busy ? 'Please wait...' : mode === 'setup' ? 'Create password' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

function Dashboard({ onEdit, onExpired }: { onEdit: (id: string) => void; onExpired: () => void }) {
  const [items, setItems] = useState<SurpriseSummary[]>()
  const [confirming, setConfirming] = useState<string>()

  const load = useCallback(() => {
    listSurprises()
      .then(setItems)
      .catch((err: { status?: number }) => (err.status === 401 ? onExpired() : toast.error('Could not load your surprises.')))
  }, [onExpired])

  useEffect(load, [load])

  const remove = async (id: string) => {
    try {
      await deleteSurprise(id)
      setConfirming(undefined)
      load()
    } catch {
      toast.error('Could not delete that surprise.')
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="display text-3xl font-bold">Your surprises</h1>
        <button type="button" className="chip flex items-center gap-2" onClick={onExpired}>
          <LogOut size={16} /> Sign out
        </button>
      </header>
      <button type="button" className="btn-primary mt-6 flex items-center justify-center gap-2" onClick={() => onEdit('new')}>
        <Plus size={18} /> New surprise
      </button>

      <ul className="mt-6 space-y-3">
        {items === undefined && <li className="text-sm" style={{ color: 'var(--muted)' }}>Loading...</li>}
        {items?.length === 0 && (
          <li className="card p-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nothing here yet. Create your first surprise, then send it out as a link or QR code.
          </li>
        )}
        {items?.map((s) => (
          <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="display truncate text-lg font-semibold">{s.title}</p>
              <p className="text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
                Updated {new Date(s.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {confirming === s.id ? (
                <>
                  <button type="button" className="chip !px-4 text-sm" style={{ color: 'var(--danger)' }} onClick={() => void remove(s.id)}>
                    Delete
                  </button>
                  <button type="button" className="chip !px-4 text-sm" onClick={() => setConfirming(undefined)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="chip flex items-center gap-2 !px-4 text-sm" onClick={() => onEdit(s.id)}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full" onClick={() => setConfirming(s.id)} aria-label={`Delete ${s.title}`}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminApp() {
  const [stage, setStage] = useState<Stage>('loading')
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    adminStatus()
      .then(({ configured }) => live && setStage(!configured ? 'setup' : getToken() ? 'ready' : 'login'))
      .catch(() => live && setStage('offline'))
    return () => {
      live = false
    }
  }, [])

  const expired = useCallback(() => {
    setToken(null)
    setEditing(null)
    setStage('login')
  }, [])

  const back = useCallback(() => setEditing(null), [])

  if (stage === 'loading') return <p className="p-8 text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>
  if (stage === 'offline') {
    return <p className="mx-auto max-w-md p-8 text-center text-sm" style={{ color: 'var(--danger)' }}>The admin server is not reachable. Make sure the app server is running, then refresh.</p>
  }
  if (stage === 'setup' || stage === 'login') return <AuthCard mode={stage} onDone={() => setStage('ready')} />
  if (editing) return <SurpriseEditor id={editing === 'new' ? null : editing} onBack={back} onExpired={expired} />
  return <Dashboard onEdit={setEditing} onExpired={expired} />
}
