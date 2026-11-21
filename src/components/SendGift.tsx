import { useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { arcTestnet } from 'viem/chains'
import { ConnectKitButton } from 'connectkit'
import { ExternalLink } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { toast } from 'sonner'
import { buildTxExplorerUrl, getUsdc } from '@/onchain-facts'
import { Amount, formatUsdc, parseAmount, usdcDecimalsFor } from '@/onchain-money'
import { parseOnchainError, type Gift } from '@/lib/gift'

const CHAIN_ID = arcTestnet.id
const QUICK = ['1', '5', '10', '25']

interface Props {
  gift: Gift
  onSent: () => void
}

export function SendGift({ gift, onSent }: Props) {
  const usdc = getUsdc(CHAIN_ID)
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending: switching } = useSwitchChain()
  const [value, setValue] = useState('5')
  const { writeContract, data: hash, isPending, reset } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash, chainId: CHAIN_ID })

  const { data: balance, refetch } = useReadContract({
    address: usdc?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address && usdc) },
  })

  useEffect(() => {
    if (isSuccess) {
      toast.success(`Gift sent to ${gift.name}`)
      void refetch()
      onSent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  if (!usdc) return <p className="text-sm">USDC is not available on this network.</p>

  let parsed: Amount | null = null
  try {
    parsed = value ? parseAmount(CHAIN_ID, value) : null
  } catch {
    parsed = null
  }
  const valid = parsed !== null && parsed.raw > 0n
  const insufficient = valid && balance !== undefined && parsed!.raw > balance
  const isSelf = address?.toLowerCase() === gift.to.toLowerCase()
  const wrongChain = isConnected && chainId !== CHAIN_ID
  const busy = isPending || confirming

  const send = () => {
    if (!parsed) return
    writeContract(
      { address: usdc.address as `0x${string}`, abi: erc20Abi, functionName: 'transfer', args: [gift.to, parsed.raw], chainId: CHAIN_ID },
      {
        onError: (e) => {
          const msg = parseOnchainError(e)
          if (msg) toast.error(msg)
        },
      },
    )
  }

  let label = 'Send gift'
  if (isPending) label = 'Confirm in wallet...'
  else if (confirming) label = 'Confirming onchain...'

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-semibold">Send a USDC gift</h2>
        <TokenUSDC variant="branded" size={28} />
      </div>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        Goes straight to {gift.name}'s wallet on Arc Testnet.
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        <input
          inputMode="decimal"
          aria-label="Gift amount in USDC"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^0-9.]/g, ''))
            if (hash) reset()
          }}
          className="display w-full bg-transparent text-5xl font-bold tabular-nums outline-none"
          placeholder="0"
        />
        <span className="display text-xl font-semibold" style={{ color: 'var(--muted)' }}>USDC</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip" aria-pressed={value === q} onClick={() => setValue(q)}>
            {q}
          </button>
        ))}
      </div>

      {isConnected && balance !== undefined && (
        <p className="mt-3 text-sm tabular-nums" style={{ color: 'var(--muted)' }}>
          Your balance: {formatUsdc(Amount.fromRaw(balance, usdcDecimalsFor(CHAIN_ID)).raw)} USDC
        </p>
      )}

      <div className="mt-5">
        {!isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button type="button" className="btn-primary" onClick={show}>
                Connect wallet to send
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : wrongChain ? (
          <button type="button" className="btn-primary" disabled={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
            Switch to Arc Testnet
          </button>
        ) : (
          <button type="button" className="btn-primary" disabled={!valid || busy || isSelf || insufficient} onClick={send}>
            {label}
          </button>
        )}
      </div>

      {isSelf && <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>This is the recipient's wallet. Connect a different one to send.</p>}
      {insufficient && (
        <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>
          Not enough USDC. Use "Get test USDC" in the Arc Studio sidebar to top up.
        </p>
      )}
      {isSuccess && hash && (
        <a
          href={buildTxExplorerUrl(CHAIN_ID, hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: 'var(--success)' }}
        >
          Gift delivered. View receipt <ExternalLink size={14} />
        </a>
      )}
    </section>
  )
}
