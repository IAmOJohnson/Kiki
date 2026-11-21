import { getAddress, isAddress } from 'viem'

export interface Gift {
  to: `0x${string}`
  name: string
  note: string
}

export const NOTE_MAX = 280
export const NAME_MAX = 40

export function readGift(search: string): Gift | null {
  const params = new URLSearchParams(search)
  const to = params.get('to')
  if (!to || !isAddress(to)) return null
  return {
    to: getAddress(to),
    name: (params.get('name') ?? '').slice(0, NAME_MAX).trim() || 'Anita',
    note: (params.get('note') ?? '').slice(0, NOTE_MAX).trim(),
  }
}

/** Path plus query for a gift page; pass the result to buildShareLink. */
export function giftPath(gift: Gift): string {
  const params = new URLSearchParams({ to: gift.to, name: gift.name })
  if (gift.note) params.set('note', gift.note)
  return `/?${params.toString()}`
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function parseOnchainError(error: unknown): string | null {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (message.includes('user rejected') || message.includes('denied')) return null
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient balance for this gift plus gas.'
  }
  if (message.includes('reverted')) return 'The transfer was rejected onchain. Please try again.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
