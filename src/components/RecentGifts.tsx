import { parseAbiItem } from 'viem'
import { arcTestnet } from 'viem/chains'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import { ExternalLink } from 'lucide-react'
import { buildTxExplorerUrl, getUsdc } from '@/onchain-facts'
import { Amount, formatUsdc, usdcDecimalsFor } from '@/onchain-money'
import { shortAddress, type Gift } from '@/lib/gift'

const CHAIN_ID = arcTestnet.id
const LOOKBACK_BLOCKS = 5000n
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

export function RecentGifts({ gift, refreshKey }: { gift: Gift; refreshKey: number }) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  const usdc = getUsdc(CHAIN_ID)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gifts', gift.to, refreshKey],
    enabled: Boolean(client && usdc),
    refetchInterval: 15000,
    queryFn: async () => {
      const head = await client!.getBlockNumber()
      const logs = await client!.getLogs({
        address: usdc!.address as `0x${string}`,
        event: TRANSFER,
        args: { to: gift.to },
        fromBlock: head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n,
        toBlock: head,
      })
      return logs.reverse().slice(0, 8)
    },
  })

  return (
    <section className="card p-6">
      <h2 className="display text-xl font-semibold">Recent gifts</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
        USDC sent to this wallet in the last {LOOKBACK_BLOCKS.toString()} blocks.
      </p>
      <ul className="mt-4 space-y-2">
        {isLoading && <li className="text-sm" style={{ color: 'var(--muted)' }}>Loading gifts...</li>}
        {isError && <li className="text-sm" style={{ color: 'var(--danger)' }}>Couldn't load gifts right now.</li>}
        {data?.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--muted)' }}>No gifts yet. Be the first.</li>
        )}
        {data?.map((log) => (
          <li
            key={`${log.transactionHash}-${log.logIndex}`}
            className="flex min-h-11 items-center justify-between rounded-2xl px-4 py-2"
            style={{ background: 'var(--surface-muted)' }}
          >
            <span className="mono text-sm">{shortAddress(log.args.from ?? '')}</span>
            <span className="flex items-center gap-2">
              <span className="display font-semibold tabular-nums">
                +{formatUsdc(Amount.fromRaw(log.args.value ?? 0n, usdcDecimalsFor(CHAIN_ID)).raw)} USDC
              </span>
              <a
                href={buildTxExplorerUrl(CHAIN_ID, log.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View transaction"
                style={{ color: 'var(--muted)' }}
              >
                <ExternalLink size={14} />
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
