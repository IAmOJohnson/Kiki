import { useEffect, useRef } from 'react'

interface Props {
  text: string
  colors: [string, string]
  /** 0 to 1. Lower values fade the rain behind other content. */
  intensity?: number
}

const FONT_SIZE = 20

export function MatrixRain({ text, colors, intensity = 1 }: Props) {
  const [c1, c2] = colors
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const glyphs = (text.toUpperCase().replace(/\s+/g, '') || 'LOVE').split('')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const drops: number[] = []
    const loop = { raf: 0, last: 0 }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const cols = Math.ceil(canvas.width / FONT_SIZE)
      drops.length = 0
      for (let i = 0; i < cols; i++) drops.push(Math.random() * -50)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (now: number) => {
      loop.raf = requestAnimationFrame(draw)
      if (now - loop.last < 55) return
      loop.last = now
      ctx.fillStyle = 'rgba(5, 6, 10, 0.14)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${FONT_SIZE}px "JetBrains Mono", Menlo, monospace`
      drops.forEach((y, i) => {
        ctx.fillStyle = i % 2 === 0 ? c1 : c2
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * FONT_SIZE, y * FONT_SIZE)
        drops[i] = y * FONT_SIZE > canvas.height && Math.random() > 0.975 ? 0 : y + 1
      })
    }
    if (reduce) {
      ctx.fillStyle = '#05060a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      loop.raf = requestAnimationFrame(draw)
    }
    return () => {
      cancelAnimationFrame(loop.raf)
      window.removeEventListener('resize', resize)
    }
  }, [text, c1, c2])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 h-full w-full transition-opacity duration-700"
      style={{ opacity: intensity }}
    />
  )
}
