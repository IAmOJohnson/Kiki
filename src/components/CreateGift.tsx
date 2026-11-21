import { useState } from 'react'
import { isAddress, getAddress } from 'viem'
import { Gift as GiftIcon } from 'lucide-react'
import { useAccount } from 'wagmi'
import { NAME_MAX, NOTE_MAX, type Gift } from '@/lib/gift'

interface Props {
  onCreate: (gift: Gift) => void
}

export function CreateGift({ onCreate }: Props) {
  const { address } = useAccount()
  const [name, setName] = useState('Anita')
  const [to, setTo] = useState('')
  const [note, setNote] = useState('Wishing you a year full of joy. This one is on us.')

  const trimmed = to.trim()
  const validAddress = isAddress(trimmed)
  const showError = trimmed.length > 0 && !validAddress

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validAddress) return
    onCreate({ to: getAddress(trimmed), name: name.trim() || 'Anita', note: note.trim() })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <form onSubmit={submit} className="card p-6">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <GiftIcon size={22} />
        </div>
        <h1 className="display mt-4 text-balance text-3xl font-bold">Make a birthday gift page</h1>
        <p className="mt-2 text-pretty text-sm" style={{ color: 'var(--muted)' }}>
          Create a link with a personal note. Anyone who opens it can send USDC straight to the birthday person's wallet.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="name">Name</label>
        <input id="name" className="field mt-1" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />

        <label className="mt-4 block text-sm font-semibold" htmlFor="to">Their wallet address</label>
        <input
          id="to"
          className="field mono mt-1 text-sm"
          placeholder="0x..."
          value={to}
          onChange={(e) => setTo(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {showError && <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>That is not a valid address.</p>}
        {address && (
          <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setTo(address)}>
            Use my connected wallet
          </button>
        )}

        <label className="mt-4 block text-sm font-semibold" htmlFor="note">Message</label>
        <textarea
          id="note"
          className="field mt-1 min-h-24 resize-none"
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className="mt-4 text-xs" style={{ color: 'var(--subtle)' }}>
          Double-check the address. USDC sent to a wrong address cannot be recovered.
        </p>
        <button type="submit" className="btn-primary mt-4" disabled={!validAddress}>
          Create gift page
        </button>
      </form>
    </div>
  )
}
